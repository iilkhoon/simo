import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { rewardReceiver, spend, spendDiamonds } from '../services/wallet.js';
import { emitToRoom, emitToUser } from '../realtime/hub.js';
import { getOrCreateConversation } from './chat.js';
import { notify } from '../services/notify.js';
import { levelFromXp } from '../economy.js';
import { addPkScore } from '../services/pk.js';

export default async function giftRoutes(app: FastifyInstance) {
  app.get('/gifts', async () => {
    const items = await prisma.gift.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { price: 'asc' }] });
    return { items };
  });

  app.post('/gifts/send', { preHandler: requireAuth, config: { rateLimit: { max: 120, timeWindow: '1 minute' } } }, async (req) => {
    const me = uid(req);
    const b = z
      .object({
        giftId: z.string(),
        receiverId: z.string(),
        count: z.number().int().refine((n) => [1, 5, 10, 33, 99, 520, 1314].includes(n)).default(1),
        context: z.enum(['CHAT', 'LIVE', 'VIDEO', 'CALL', 'PROFILE']),
        contextId: z.string().optional(),
      })
      .parse(req.body);
    if (b.receiverId === me) throw err.badRequest('SELF_GIFT');
    const gift = await prisma.gift.findUnique({ where: { id: b.giftId } });
    if (!gift || !gift.active) throw err.notFound('GIFT_NOT_FOUND');
    const receiver = await prisma.user.findFirst({ where: { id: b.receiverId, deletedAt: null, banned: false } });
    if (!receiver) throw err.notFound('USER_NOT_FOUND');
    const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: me, blockedId: b.receiverId }, { blockerId: b.receiverId, blockedId: me }] } });
    if (blocked) throw err.forbidden('BLOCKED');

    const coins = gift.price * b.count;
    const almaz = gift.currency === 'DIAMOND';
    let conversationId: string | undefined;
    const result = await prisma.$transaction(async (tx) => {
      // Almaz hədiyyəsi: göndərənin Almazından (alınmış birinci); hamısı real pul olduğu üçün tam dəyər "ödənişli" sayılır
      const { balance, paid } = almaz
        ? (await spendDiamonds(tx, me, coins, 'GIFT_SENT', gift.id), { balance: null as number | null, paid: coins })
        : await spend(tx, me, coins, 'GIFT_SENT', gift.id, `${gift.id}x${b.count}`);
      const gt = await tx.giftTransaction.create({
        data: { giftId: gift.id, senderId: me, receiverId: b.receiverId, count: b.count, coins, diamonds: 0, context: b.context, contextId: b.contextId },
      });
      const diamonds = await rewardReceiver(tx, b.receiverId, paid, 'GIFT_RECEIVED', gt.id);
      await tx.giftTransaction.update({ where: { id: gt.id }, data: { diamonds } });
      if (b.context === 'LIVE' && b.contextId) {
        await tx.liveRoom.updateMany({ where: { id: b.contextId, status: 'LIVE' }, data: { giftsCoins: { increment: coins } } });
      }
      if (b.context === 'VIDEO' && b.contextId) {
        await tx.video.updateMany({ where: { id: b.contextId }, data: { giftsCoins: { increment: coins } } });
      }
      return { balance, diamonds, gtId: gt.id };
    });

    const sender = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { id: true, name: true, avatarUrl: true, totalSpent: true, vipTier: true } });
    const event = {
      id: result.gtId,
      gift: { id: gift.id, tier: gift.tier, price: gift.price, currency: gift.currency, nameAz: gift.nameAz, nameRu: gift.nameRu, nameEn: gift.nameEn },
      count: b.count,
      coins,
      sender: { id: sender.id, name: sender.name, avatarUrl: sender.avatarUrl, wealthLevel: levelFromXp(sender.totalSpent), vipTier: sender.vipTier },
      receiverId: b.receiverId,
      at: new Date(),
    };

    if (b.context === 'CHAT' || b.context === 'PROFILE') {
      const conv = await getOrCreateConversation(me, b.receiverId);
      conversationId = conv.id;
      const msg = await prisma.message.create({
        data: { conversationId: conv.id, senderId: me, type: 'GIFT', giftId: gift.id, text: String(b.count), coinsCost: coins },
      });
      await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date(), lastMessageText: `🎁 ${gift.nameAz} x${b.count}` } });
      emitToUser(b.receiverId, 'message:new', msg);
      emitToUser(me, 'message:new', msg);
    }
    if (b.context === 'LIVE' && b.contextId) {
      emitToRoom(`live:${b.contextId}`, 'live:gift', event);
      void addPkScore(b.contextId, b.receiverId, coins).catch(() => {});
    }
    if (b.context === 'CALL' && b.contextId) emitToUser(b.receiverId, 'call:gift', event);

    emitToUser(b.receiverId, 'gift:received', event);
    emitToUser(me, 'wallet:update', { coins: result.balance });
    void notify(b.receiverId, 'gift', { actorId: me, body: `${sender.name}: ${gift.nameAz} x${b.count}`, data: { giftId: gift.id, count: b.count, conversationId } }).catch(() => {});
    return { ok: true, coins: result.balance, event, conversationId };
  });
}
