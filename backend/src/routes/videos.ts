import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { loadViewer } from '../services/discovery.js';
import { sanitizeText } from './chat.js';

/**
 * "Sənin üçün" lent alqoritmi:
 *  bal = (bəyənmə·3 + şərh·5 + hədiyyə/10 + baxış·0.2 + 1) / (saat + 2)^1.3
 *        × üstünlük verilən cins ×1.5 × izlədiyin müəllif ×2 × yaxınlıq ×1.3 + təsadüfilik
 *  Baxılmış videolar sona düşür.
 */
export default async function videoRoutes(app: FastifyInstance) {
  app.get('/videos/feed', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const q = z.object({ tab: z.enum(['foryou', 'following']).default('foryou'), limit: z.coerce.number().int().min(1).max(30).default(10) }).parse(req.query);
    const viewer = await loadViewer(me);
    const [follows, blocks, seen] = await Promise.all([
      prisma.follow.findMany({ where: { followerId: me }, select: { followingId: true } }),
      prisma.block.findMany({ where: { OR: [{ blockerId: me }, { blockedId: me }] } }),
      prisma.videoView.findMany({ where: { userId: me, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } }, select: { videoId: true } }),
    ]);
    const followSet = new Set(follows.map((f) => f.followingId));
    const blocked = blocks.map((b) => (b.blockerId === me ? b.blockedId : b.blockerId));
    const seenSet = new Set(seen.map((s) => s.videoId));
    const videos = await prisma.video.findMany({
      where: {
        status: 'ACTIVE',
        userId: q.tab === 'following' ? { in: [...followSet] } : { notIn: [me, ...blocked] },
        user: { banned: false, deletedAt: null },
        createdAt: { gte: new Date(Date.now() - 60 * 86400_000) },
      },
      include: { user: { select: { ...publicUserSelect, photos: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    const scored = videos.map((v) => {
      const hours = (Date.now() - v.createdAt.getTime()) / 3600_000;
      let s = (v.likesCount * 3 + v.commentsCount * 5 + v.giftsCoins / 10 + v.views * 0.2 + 1) / Math.pow(hours + 2, 1.3);
      if (viewer.interestedIn && v.user.gender === viewer.interestedIn) s *= 1.5;
      if (followSet.has(v.userId)) s *= 2;
      const u = presentUser(v.user, viewer);
      if (u.distanceKm != null && u.distanceKm < 30) s *= 1.3;
      if (seenSet.has(v.id)) s *= 0.05;
      s *= 0.85 + Math.random() * 0.3;
      return { v, u, s };
    });
    scored.sort((a, b) => b.s - a.s);
    const pick = scored.slice(0, q.limit);
    const likes = await prisma.videoLike.findMany({ where: { userId: me, videoId: { in: pick.map((p) => p.v.id) } } });
    const liked = new Set(likes.map((l) => l.videoId));
    return {
      items: pick.map(({ v, u }) => ({
        id: v.id, url: v.url, thumbnailUrl: v.thumbnailUrl, caption: v.caption, hashtags: v.hashtags, views: v.views,
        likesCount: v.likesCount, commentsCount: v.commentsCount, giftsCoins: v.giftsCoins, createdAt: v.createdAt,
        user: u, liked: liked.has(v.id), following: followSet.has(v.userId),
      })),
    };
  });

  app.post('/videos', { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 hour' } } }, async (req) => {
    const me = uid(req);
    const b = z.object({ url: z.string().url(), thumbnailUrl: z.string().url().optional(), caption: z.string().max(300).default('') }).parse(req.body);
    const caption = sanitizeText(b.caption);
    const hashtags = [...new Set((caption.match(/#[\p{L}\d_]+/gu) ?? []).map((h) => h.slice(1).toLowerCase()))].slice(0, 10);
    const video = await prisma.video.create({ data: { userId: me, url: b.url, thumbnailUrl: b.thumbnailUrl, caption, hashtags } });
    return { video };
  });

  app.get('/videos/user/:userId', { preHandler: requireAuth }, async (req) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const items = await prisma.video.findMany({ where: { userId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, take: 60 });
    return { items };
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
