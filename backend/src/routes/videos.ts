import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { loadViewer } from '../services/discovery.js';
import { sanitizeText } from './chat.js';
import { ECONOMY } from '../economy.js';

/**
 * Akış (TikTok tipli) alqoritmi — "Sənin üçün":
 *  əsas  = (bəyənmə·3 + şərh·5 + yadda saxlama·6 + paylaşma·6 + hədiyyə/10 + baxış·0.2 + 1) / (saat + 2)^1.4
 *  keyfiyyət = 1 + (bəyənmə + şərh·2 + yadda saxlama·3) / (baxış + 5)   — engagement nisbəti
 *  yeni video (<6 saat, <50 baxış) ×3 — "soyuq start" sınağı: hər yeni video tamaşaçı alır
 *  şəxsiləşdirmə: izlədiyin ×2, maraqlarına uyğun heşteq ×1.3, üstünlük verilən cins ×1.5, yaxınlıq (<30 km) ×1.3
 *  baxılmış ×0.05; bir səhifədə eyni müəllifdən ən çox 2 video; ±15% təsadüfilik.
 *  Private postlar ümumi lentə düşmür — yalnız profildə, abunəçilərə açıq.
 */
type VideoRow = Awaited<ReturnType<typeof prisma.video.findFirstOrThrow>>;

export async function presentVideos(me: string, rows: (VideoRow & { user: Parameters<typeof presentUser>[0] })[], viewer?: { lat: number | null; lng: number | null }) {
  const ids = rows.map((v) => v.id);
  const authorIds = [...new Set(rows.map((v) => v.userId))];
  const [likes, saves, follows, subs] = await Promise.all([
    prisma.videoLike.findMany({ where: { userId: me, videoId: { in: ids } } }),
    prisma.videoSave.findMany({ where: { userId: me, videoId: { in: ids } } }),
    prisma.follow.findMany({ where: { followerId: me, followingId: { in: authorIds } } }),
    prisma.subscription.findMany({ where: { subscriberId: me, creatorId: { in: authorIds }, expiresAt: { gt: new Date() } } }),
  ]);
  const liked = new Set(likes.map((l) => l.videoId));
  const saved = new Set(saves.map((l) => l.videoId));
  const following = new Set(follows.map((f) => f.followingId));
  const subscribed = new Set(subs.map((x) => x.creatorId));
  return rows.map((v) => {
    const locked = v.isPrivate && v.userId !== me && !subscribed.has(v.userId);
    return {
      id: v.id, mediaType: v.mediaType, isPrivate: v.isPrivate, locked,
      url: locked ? null : v.url, thumbnailUrl: v.thumbnailUrl, durationSec: v.durationSec,
      caption: v.caption, hashtags: v.hashtags, views: v.views, likesCount: v.likesCount, commentsCount: v.commentsCount,
      savesCount: v.savesCount, sharesCount: v.sharesCount, giftsCoins: v.giftsCoins, createdAt: v.createdAt,
      user: presentUser(v.user, viewer), liked: liked.has(v.id), saved: saved.has(v.id), following: following.has(v.userId),
    };
  });
}

export default async function videoRoutes(app: FastifyInstance) {
  app.get('/videos/feed', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const q = z.object({ tab: z.enum(['foryou', 'following']).default('foryou'), limit: z.coerce.number().int().min(1).max(30).default(10) }).parse(req.query);
    const viewer = await loadViewer(me);
    const meRow = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { interests: true } });
    const [follows, blocks, seen] = await Promise.all([
      prisma.follow.findMany({ where: { followerId: me }, select: { followingId: true } }),
      prisma.block.findMany({ where: { OR: [{ blockerId: me }, { blockedId: me }] } }),
      prisma.videoView.findMany({ where: { userId: me, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } }, select: { videoId: true } }),
    ]);
    const followSet = new Set(follows.map((f) => f.followingId));
    const blocked = blocks.map((b) => (b.blockerId === me ? b.blockedId : b.blockerId));
    const seenSet = new Set(seen.map((s) => s.videoId));
    const interests = new Set(meRow.interests.map((i) => i.toLowerCase()));
    const videos = await prisma.video.findMany({
      where: {
        status: 'ACTIVE',
        isPrivate: false,
        userId: q.tab === 'following' ? { in: [...followSet] } : { notIn: [me, ...blocked] },
        user: { banned: false, deletedAt: null },
        createdAt: { gte: new Date(Date.now() - 60 * 86400_000) },
      },
      include: { user: { select: { ...publicUserSelect, photos: true } } },
      orderBy: { createdAt: 'desc' },
      take: 400,
    });
    const scored = videos.map((v) => {
      const hours = (Date.now() - v.createdAt.getTime()) / 3600_000;
      let s = (v.likesCount * 3 + v.commentsCount * 5 + v.savesCount * 6 + v.sharesCount * 6 + v.giftsCoins / 10 + v.views * 0.2 + 1) / Math.pow(hours + 2, 1.4);
      s *= 1 + (v.likesCount + v.commentsCount * 2 + v.savesCount * 3) / (v.views + 5);
      if (hours < 6 && v.views < 50) s *= 3;
      if (viewer.interestedIn && v.user.gender === viewer.interestedIn) s *= 1.5;
      if (followSet.has(v.userId)) s *= 2;
      if (v.hashtags.some((h) => interests.has(h))) s *= 1.3;
      const u = presentUser(v.user, viewer);
      if (u.distanceKm != null && u.distanceKm < 30) s *= 1.3;
      if (seenSet.has(v.id)) s *= 0.05;
      s *= 0.85 + Math.random() * 0.3;
      return { v, s };
    });
    scored.sort((a, b) => b.s - a.s);
    // Müxtəliflik: eyni müəllifdən ən çox 2
    const perAuthor = new Map<string, number>();
    const pick: typeof videos = [];
    for (const { v } of scored) {
      const n = perAuthor.get(v.userId) ?? 0;
      if (n >= 2) continue;
      perAuthor.set(v.userId, n + 1);
      pick.push(v);
      if (pick.length >= q.limit) break;
    }
    return { items: await presentVideos(me, pick, viewer) };
  });

  app.post('/videos', { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 hour' } } }, async (req) => {
    const me = uid(req);
    const b = z.object({
      url: z.string().url(),
      thumbnailUrl: z.string().url().optional(),
      caption: z.string().max(300).default(''),
      mediaType: z.enum(['VIDEO', 'PHOTO']).default('VIDEO'),
      durationSec: z.number().int().min(0).default(0),
      isPrivate: z.boolean().default(false),
    }).parse(req.body);
    if (b.mediaType === 'VIDEO' && b.durationSec > ECONOMY.maxVideoSec) throw err.badRequest('VIDEO_TOO_LONG', { max: ECONOMY.maxVideoSec });
    if (b.isPrivate) {
      const u = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { privatePrice: true } });
      if (!u.privatePrice) throw err.badRequest('PRIVATE_DISABLED');
    }
    const caption = sanitizeText(b.caption);
    const hashtags = [...new Set((caption.match(/#[\p{L}\d_]+/gu) ?? []).map((h) => h.slice(1).toLowerCase()))].slice(0, 10);
    const video = await prisma.video.create({ data: { userId: me, url: b.url, thumbnailUrl: b.thumbnailUrl, caption, hashtags, mediaType: b.mediaType, durationSec: b.durationSec, isPrivate: b.isPrivate } });
    return { video };
  });

  /** Profil şəbəkəsi (Instagram kimi): ?kind=all|private */
  app.get('/videos/user/:userId', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const q = z.object({ kind: z.enum(['all', 'public', 'private']).default('all') }).parse(req.query);
    const rows = await prisma.video.findMany({
      where: { userId, status: 'ACTIVE', ...(q.kind === 'public' ? { isPrivate: false } : q.kind === 'private' ? { isPrivate: true } : {}) },
      include: { user: { select: { ...publicUserSelect, photos: true } } },
      orderBy: { createdAt: 'desc' },
      take: 90,
    });
    return { items: await presentVideos(me, rows) };
  });

  app.get('/videos/saved', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const saves = await prisma.videoSave.findMany({ where: { userId: me }, orderBy: { createdAt: 'desc' }, take: 90 });
    const rows = await prisma.video.findMany({ where: { id: { in: saves.map((s) => s.videoId) }, status: 'ACTIVE' }, include: { user: { select: { ...publicUserSelect, photos: true } } } });
    const order = new Map(saves.map((s, i) => [s.videoId, i]));
    rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { items: await presentVideos(me, rows) };
  });

  app.get('/videos/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const v = await prisma.video.findFirst({ where: { id, status: 'ACTIVE' }, include: { user: { select: { ...publicUserSelect, photos: true } } } });
    if (!v) throw err.notFound();
    return { video: (await presentVideos(uid(req), [v]))[0] };
  });

  app.post('/videos/:id/save', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const exists = await prisma.videoSave.findUnique({ where: { videoId_userId: { videoId: id, userId: me } } });
    if (!exists) await prisma.$transaction([prisma.videoSave.create({ data: { videoId: id, userId: me } }), prisma.video.update({ where: { id }, data: { savesCount: { increment: 1 } } })]);
    return { ok: true };
  });

  app.delete('/videos/:id/save', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const del = await prisma.videoSave.deleteMany({ where: { videoId: id, userId: me } });
    if (del.count) await prisma.video.update({ where: { id }, data: { savesCount: { decrement: 1 } } });
    return { ok: true };
  });

  app.post('/videos/:id/share', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.video.updateMany({ where: { id }, data: { sharesCount: { increment: 1 } } });
    return { ok: true };
  });

  /** Postu bəyənənlər (müəllif hamısını görür) */
  app.get('/videos/:id/likers', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const rows = await prisma.videoLike.findMany({ where: { videoId: id }, orderBy: { createdAt: 'desc' }, take: 200 });
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
    return { items: rows.flatMap((r) => (byId.get(r.userId) ? [{ user: byId.get(r.userId)!, at: r.createdAt }] : [])) };
  });

  app.post('/videos/:id/view', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const existing = await prisma.videoView.findUnique({ where: { videoId_userId: { videoId: id, userId: me } } });
    if (!existing) {
      await prisma.$transaction([
        prisma.videoView.create({ data: { videoId: id, userId: me } }),
        prisma.video.update({ where: { id }, data: { views: { increment: 1 } } }),
      ]);
    } else {
      await prisma.videoView.update({ where: { videoId_userId: { videoId: id, userId: me } }, data: { createdAt: new Date() } });
    }
    return { ok: true };
  });

  app.post('/videos/:id/like', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const exists = await prisma.videoLike.findUnique({ where: { videoId_userId: { videoId: id, userId: me } } });
    if (!exists) {
      await prisma.$transaction([
        prisma.videoLike.create({ data: { videoId: id, userId: me } }),
        prisma.video.update({ where: { id }, data: { likesCount: { increment: 1 } } }),
      ]);
    }
    return { ok: true };
  });

  app.delete('/videos/:id/like', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const del = await prisma.videoLike.deleteMany({ where: { videoId: id, userId: me } });
    if (del.count) await prisma.video.update({ where: { id }, data: { likesCount: { decrement: 1 } } });
    return { ok: true };
  });

  app.get('/videos/:id/comments', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const rows = await prisma.videoComment.findMany({ where: { videoId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
    return { items: rows.map((r) => ({ ...r, user: byId.get(r.userId) ?? null })) };
  });

  app.post('/videos/:id/comments', { preHandler: requireAuth, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ text: z.string().trim().min(1).max(300) }).parse(req.body);
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.status !== 'ACTIVE') throw err.notFound();
    const [comment] = await prisma.$transaction([
      prisma.videoComment.create({ data: { videoId: id, userId: me, text: sanitizeText(b.text) } }),
      prisma.video.update({ where: { id }, data: { commentsCount: { increment: 1 } } }),
    ]);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { ...publicUserSelect, photos: true } });
    return { comment: { ...comment, user: presentUser(u) } };
  });

  app.delete('/videos/:id', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const res = await prisma.video.updateMany({ where: { id, userId: me }, data: { status: 'REMOVED' } });
    if (!res.count) throw err.notFound();
    return { ok: true };
  });
}
