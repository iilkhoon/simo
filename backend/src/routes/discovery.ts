import { spendCoins } from '../services/wallet.js';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { dailyPicks, discoverFeed, nearby } from '../services/discovery.js';
import { ECONOMY, activeVip, todayKey } from '../economy.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { notify } from '../services/notify.js';
import { emitToUser } from '../realtime/hub.js';
import { getOrCreateConversation } from './chat.js';

export default async function discoveryRoutes(app: FastifyInstance) {
  app.get('/discover', { preHandler: requireAuth }, async (req) => {
    const q = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20), seed: z.string().default('') }).parse(req.query);
    return { items: await discoverFeed(uid(req), q.limit, q.seed) };
  });

  app.get('/discover/daily', { preHandler: requireAuth }, async (req) => ({ items: await dailyPicks(uid(req)) }));

  app.get('/nearby', { preHandler: requireAuth }, async (req) => {
    const q = z.object({ radius: z.coerce.number().min(1).max(500).default(50), online: z.enum(['true', 'false', '1', '0']).default('false').transform((v) => v === 'true' || v === '1') }).parse(req.query);
    return { items: await nearby(uid(req), q.radius, q.online) };
  });

  app.post('/swipes', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ toId: z.string(), action: z.enum(['LIKE', 'PASS', 'SUPERLIKE']) }).parse(req.body);
    if (b.toId === me) throw err.badRequest();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    const vip = activeVip(user);
    const today = todayKey();
    if (b.action === 'LIKE' && !vip) {
      const used = user.dailyLikesDate === today ? user.dailyLikesUsed : 0;
      if (used >= ECONOMY.freeDailyLikes) throw err.badRequest('LIKE_LIMIT');
      await prisma.user.update({ where: { id: me }, data: { dailyLikesDate: today, dailyLikesUsed: used + 1 } });
    }
    if (b.action === 'SUPERLIKE') {
      const limit = vip ? vip.superLikesPerDay : ECONOMY.freeDailySuperLikes;
      const used = user.dailySuperDate === today ? user.dailySuperUsed : 0;
      if (used >= limit) {
        // Limit bitdikdən sonra super like pulludur
        await prisma.$transaction((tx) => spendCoins(tx, me, ECONOMY.superLikePrice, 'SUPERLIKE', b.toId));
      } else {
        await prisma.user.update({ where: { id: me }, data: { dailySuperDate: today, dailySuperUsed: used + 1 } });
      }
    }
    await prisma.swipe.upsert({
      where: { fromId_toId: { fromId: me, toId: b.toId } },
      create: { fromId: me, toId: b.toId, action: b.action },
      update: { action: b.action, createdAt: new Date() },
    });
    if (b.action === 'PASS') return { matched: false };

    const reverse = await prisma.swipe.findUnique({ where: { fromId_toId: { fromId: b.toId, toId: me } } });
    if (reverse && reverse.action !== 'PASS') {
      const [a, c] = [me, b.toId].sort();
      await prisma.match.upsert({ where: { userAId_userBId: { userAId: a, userBId: c } }, create: { userAId: a, userBId: c }, update: {} });
      const conv = await getOrCreateConversation(me, b.toId);
      const [mine, theirs] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: me }, select: { ...publicUserSelect, photos: true } }),
        prisma.user.findUniqueOrThrow({ where: { id: b.toId }, select: { ...publicUserSelect, photos: true } }),
      ]);
      emitToUser(b.toId, 'match', { user: presentUser(mine), conversationId: conv.id });
      void notify(b.toId, 'match', { actorId: me, data: { conversationId: conv.id } }).catch(() => {});
      return { matched: true, conversationId: conv.id, user: presentUser(theirs) };
    }
    void notify(b.toId, 'like', { actorId: me, data: { super: b.action === 'SUPERLIKE' } }).catch(() => {});
    return { matched: false };
  });

  app.get('/matches', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const rows = await prisma.match.findMany({ where: { OR: [{ userAId: me }, { userBId: me }] }, orderBy: { createdAt: 'desc' }, take: 100 });
    const ids = rows.map((r) => (r.userAId === me ? r.userBId : r.userAId));
    const users = await prisma.user.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { ...publicUserSelect, photos: true } });
    return { items: users.map((u) => presentUser(u)) };
  });
}
