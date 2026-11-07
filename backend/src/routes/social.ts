/**
 * Story-lər (24 saat), private content abunəsi, çəkilişlər (pulsuz iştirak) və profil nişanları.
 */
import { z } from 'zod';
import { mediaUrl } from '../lib/security.js';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, requireAdmin, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { ECONOMY } from '../economy.js';
import { creditCoins, rewardReceiver, spend } from '../services/wallet.js';
import { notify } from '../services/notify.js';
import { emitToUser } from '../realtime/hub.js';
import { listLiveHostIds } from '../services/live.js';

/** Profil nişanları: staj, region birinciliyi (həftəlik cazibə), zadəgan, VIP */
export async function userBadges(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true, city: true, verified: true } });
  const badges: { key: string; label?: string; value?: number }[] = [];
  const years = Math.floor((Date.now() - u.createdAt.getTime()) / (365 * 86400_000));
  if (years >= 1) badges.push({ key: 'tenure', value: years });
  if (u.verified) badges.push({ key: 'verified' });
  // Region birinciliyi: son 7 gündə ən çox qazanan (cazibə) — şəhər və Azərbaycan üzrə
  const since = new Date(Date.now() - 7 * 86400_000);
  const top = await prisma.walletTransaction.groupBy({
    by: ['userId'], where: { currency: 'DIAMOND', amount: { gt: 0 }, createdAt: { gte: since }, type: { in: ['GIFT_RECEIVED', 'MESSAGE_EARNED', 'CALL_EARNED', 'SUBSCRIPTION_EARNED'] } },
    _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } }, take: 50,
  });
  if (top[0]?.userId === userId) badges.push({ key: 'countryTop', label: 'Azərbaycan', value: 1 });
  if (u.city) {
    const ids = top.map((t) => t.userId);
    const cityUsers = await prisma.user.findMany({ where: { id: { in: ids }, city: u.city }, select: { id: true } });
    const set = new Set(cityUsers.map((c) => c.id));
    const firstInCity = top.find((t) => set.has(t.userId));
    if (firstInCity?.userId === userId) badges.push({ key: 'cityTop', label: u.city, value: 1 });
  }
  return badges;
}

export default async function socialRoutes(app: FastifyInstance) {
  /* ───────── Story-lər ───────── */
  app.post('/stories', { preHandler: requireAuth, config: { rateLimit: { max: 30, timeWindow: '1 hour' } } }, async (req) => {
    const me = uid(req);
    const b = z.object({ mediaUrl: mediaUrl(), mediaType: z.enum(['PHOTO', 'VIDEO']).default('PHOTO') }).parse(req.body);
    const story = await prisma.story.create({ data: { userId: me, ...b, expiresAt: new Date(Date.now() + ECONOMY.storyHours * 3600_000) } });
    return { story };
  });

  /** Story sırası: əvvəl canlıda olanlar, sonra izlədiklərin, sonra yeni story-lər; baxılmamışlar öndə */
  app.get('/stories/feed', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const now = new Date();
    const [stories, follows, views, liveIds] = await Promise.all([
      prisma.story.findMany({ where: { expiresAt: { gt: now }, user: { banned: false, deletedAt: null } }, orderBy: { createdAt: 'desc' }, take: 300 }),
      prisma.follow.findMany({ where: { followerId: me }, select: { followingId: true } }),
      prisma.storyView.findMany({ where: { userId: me, createdAt: { gte: new Date(Date.now() - 86400_000) } }, select: { storyId: true } }),
      listLiveHostIds(),
    ]);
    const followSet = new Set(follows.map((f) => f.followingId));
    const viewed = new Set(views.map((v) => v.storyId));
    const byUser = new Map<string, typeof stories>();
    for (const s of stories) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]);
    const userIds = [...new Set([...byUser.keys(), ...liveIds.map((l) => l.hostId)])];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { ...publicUserSelect, photos: true } });
    const uMap = new Map(users.map((u) => [u.id, presentUser(u)]));
    const liveMap = new Map(liveIds.map((l) => [l.hostId, l.roomId]));
    const items = userIds.flatMap((id) => {
      const user = uMap.get(id);
      if (!user) return [];
      const list = (byUser.get(id) ?? []).slice().reverse();
      const unseen = list.some((s) => !viewed.has(s.id));
      const liveRoomId = liveMap.get(id) ?? null;
      const rank = (liveRoomId ? 1000 : 0) + (id === me ? 500 : 0) + (followSet.has(id) ? 100 : 0) + (unseen ? 50 : 0);
      return [{ user, liveRoomId, unseen, rank, stories: list.map((s) => ({ id: s.id, mediaUrl: s.mediaUrl, mediaType: s.mediaType, createdAt: s.createdAt, seen: viewed.has(s.id) })) }];
    });
    items.sort((a, b) => b.rank - a.rank);
    return { items: items.slice(0, 60) };
  });

  app.post('/stories/:id/view', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.storyView.upsert({ where: { storyId_userId: { storyId: id, userId: uid(req) } }, create: { storyId: id, userId: uid(req) }, update: {} });
    return { ok: true };
  });

  app.delete('/stories/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.story.deleteMany({ where: { id, userId: uid(req) } });
    return { ok: true };
  });

  /* ───────── Private content abunəsi ───────── */
  app.post('/subscriptions/:creatorId', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { creatorId } = z.object({ creatorId: z.string() }).parse(req.params);
    if (creatorId === me) throw err.badRequest();
    const creator = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator || !creator.privatePrice || creator.banned || creator.deletedAt) throw err.notFound('PRIVATE_DISABLED');
    const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: me, blockedId: creatorId }, { blockerId: creatorId, blockedId: me }] } });
    if (blocked) throw err.forbidden('BLOCKED');
    const price = creator.privatePrice;
    const sub = await prisma.$transaction(async (tx) => {
      const r = await spend(tx, me, price, 'SUBSCRIPTION', creatorId);
      await rewardReceiver(tx, creatorId, r.paid, 'SUBSCRIPTION_EARNED', me);
      const cur = await tx.subscription.findUnique({ where: { subscriberId_creatorId: { subscriberId: me, creatorId } } });
      const base = cur && cur.expiresAt.getTime() > Date.now() ? cur.expiresAt.getTime() : Date.now();
      const expiresAt = new Date(base + 30 * 86400_000);
      return tx.subscription.upsert({
        where: { subscriberId_creatorId: { subscriberId: me, creatorId } },
        create: { subscriberId: me, creatorId, priceCoins: price, expiresAt },
        update: { priceCoins: price, expiresAt },
      });
    });
    const meU = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { coins: true } });
    emitToUser(me, 'wallet:update', { coins: meU.coins });
    void notify(creatorId, 'subscription', { actorId: me }).catch(() => {});
    return { subscription: sub, coins: meU.coins };
  });

  app.get('/subscriptions', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const [mine, subscribers] = await Promise.all([
      prisma.subscription.findMany({ where: { subscriberId: me, expiresAt: { gt: new Date() } } }),
      prisma.subscription.count({ where: { creatorId: me, expiresAt: { gt: new Date() } } }),
    ]);
    const users = await prisma.user.findMany({ where: { id: { in: mine.map((m) => m.creatorId) } }, select: { ...publicUserSelect, photos: true } });
    const uMap = new Map(users.map((u) => [u.id, presentUser(u)]));
    return { items: mine.flatMap((m) => (uMap.get(m.creatorId) ? [{ ...m, creator: uMap.get(m.creatorId)! }] : [])), subscribers };
  });

  /* ───────── Profil nişanları ───────── */
  app.get('/users/:id/badges', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return { items: await userBadges(id) };
  });

  /* ───────── Çəkilişlər (yalnız pulsuz iştirak) ───────── */
  app.get('/raffles', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const list = await prisma.raffle.findMany({ where: { OR: [{ endsAt: { gt: new Date() } }, { drawnAt: { gte: new Date(Date.now() - 7 * 86400_000) } }] }, orderBy: { endsAt: 'asc' }, include: { _count: { select: { entries: true } } } });
    const mine = await prisma.raffleEntry.findMany({ where: { userId: me, raffleId: { in: list.map((r) => r.id) } } });
    const entered = new Set(mine.map((m) => m.raffleId));
    return { items: list.map((r) => ({ id: r.id, title: r.title, description: r.description, prizeCoins: r.prizeCoins, winners: r.winners, endsAt: r.endsAt, drawnAt: r.drawnAt, entries: r._count.entries, entered: entered.has(r.id), won: r.winnerIds.includes(me) })) };
  });

  /** İştirak: tətbiqdə, dostunu dəvət etməklə və ya paylaşmaqla (pulsuz) */
  app.post('/raffles/:id/enter', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ source: z.enum(['APP', 'SHARE', 'STORY', 'INVITE']).default('APP') }).parse(req.body ?? {});
    const r = await prisma.raffle.findUnique({ where: { id } });
    if (!r || r.endsAt.getTime() < Date.now()) throw err.badRequest('RAFFLE_CLOSED');
    await prisma.raffleEntry.upsert({ where: { raffleId_userId: { raffleId: id, userId: me } }, create: { raffleId: id, userId: me, source: b.source }, update: {} });
    return { ok: true };
  });

  app.get('/admin/raffles', { preHandler: requireAdmin }, async () => {
    const items = await prisma.raffle.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { _count: { select: { entries: true } } } });
    return { items };
  });

  app.post('/admin/raffles', { preHandler: requireAdmin }, async (req) => {
    const b = z.object({ title: z.string().min(3).max(80), description: z.string().max(500).default(''), prizeCoins: z.number().int().min(1).max(1_000_000), winners: z.number().int().min(1).max(100).default(1), endsAt: z.coerce.date() }).parse(req.body);
    return { raffle: await prisma.raffle.create({ data: b }) };
  });

  /** Qaliblər təsadüfi seçilir, mükafat promo Nar kimi yazılır */
  app.post('/admin/raffles/:id/draw', { preHandler: requireAdmin }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const r = await prisma.raffle.findUniqueOrThrow({ where: { id }, include: { entries: true } });
    if (r.drawnAt) throw err.badRequest('ALREADY_DRAWN');
    const pool = r.entries.map((e) => e.userId);
    const winners: string[] = [];
    while (winners.length < r.winners && pool.length) winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    await prisma.$transaction(async (tx) => {
      // İki admin eyni anda "çək" bassa — mükafat yalnız bir dəfə yazılır
      const claimed = await tx.raffle.updateMany({ where: { id, drawnAt: null }, data: { drawnAt: new Date(), winnerIds: winners } });
      if (!claimed.count) throw err.badRequest('ALREADY_DRAWN');
      for (const w of winners) await creditCoins(tx, w, r.prizeCoins, 'RAFFLE_PRIZE', r.id, '', true);
    });
    for (const w of winners) void notify(w, 'raffle', { body: `+${r.prizeCoins}` }).catch(() => {});
    return { winners };
  });
}
