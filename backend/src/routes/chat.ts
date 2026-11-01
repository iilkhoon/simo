import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { ECONOMY, activeVip, todayKey } from '../economy.js';
import { rewardReceiver, spendCoins } from '../services/wallet.js';
import { emitToUser } from '../realtime/hub.js';
import { notify } from '../services/notify.js';

export async function getOrCreateConversation(u1: string, u2: string) {
  const [a, b] = [u1, u2].sort();
  return prisma.conversation.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    create: { userAId: a, userBId: b },
    update: {},
  });
}

/** Təhlükəsizlik: telefon nömrələri və xarici linklər maskalanır (fırıldaqçılığa qarşı) */
export function sanitizeText(text: string): string {
  return text
    .replace(/(\+?\d[\d\s\-()]{7,}\d)/g, '•••')
    .replace(/https?:\/\/\S+/gi, '•••')
    .trim();
}

async function isBlocked(a: string, b: string) {
  const row = await prisma.block.findFirst({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] } });
  return !!row;
}

/** Mesajın qiymətini hesablayır (göndərmədən) */
export async function messagePricing(senderId: string, receiverId: string, conversationId?: string) {
  const [sender, receiver] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: senderId } }),
    prisma.user.findUniqueOrThrow({ where: { id: receiverId }, select: { hostStatus: true } }),
  ]);
  const paid = receiver.hostStatus === 'APPROVED' && sender.hostStatus !== 'APPROVED';
  if (!paid) return { price: 0, reason: 'FREE' as const, sender };
  if (ECONOMY.firstMessageFree) {
    const sent = conversationId ? await prisma.message.count({ where: { conversationId, senderId } }) : 0;
    if (sent === 0) return { price: 0, reason: 'FIRST_FREE' as const, sender };
  }
  const vip = activeVip(sender);
  const today = todayKey();
  const used = sender.freeMsgDate === today ? sender.freeMsgUsed : 0;
  if (vip && used < vip.freeMessagesPerDay) return { price: 0, reason: 'VIP_FREE' as const, sender, vipUsed: used };
  return { price: ECONOMY.messagePrice, reason: 'PAID' as const, sender };
}

export default async function chatRoutes(app: FastifyInstance) {
  app.get('/conversations', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ userAId: me }, { userBId: me }] },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });
    const otherIds = convs.map((c) => (c.userAId === me ? c.userBId : c.userAId));
    const users = await prisma.user.findMany({ where: { id: { in: otherIds } }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
    const unread = await Promise.all(
      convs.map((c) =>
        prisma.message.count({
          where: { conversationId: c.id, senderId: { not: me }, createdAt: { gt: c.userAId === me ? c.aLastReadAt : c.bLastReadAt } },
        }),
      ),
    );
    return {
      items: convs.flatMap((c, i) => {
        const other = byId.get(otherIds[i]);
        if (!other) return [];
        return [{ id: c.id, user: other, lastMessageText: c.lastMessageText, lastMessageAt: c.lastMessageAt, unread: unread[i] }];
      }),
    };
  });

  app.post('/conversations/with/:userId', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    if (userId === me) throw err.badRequest();
    if (await isBlocked(me, userId)) throw err.forbidden('BLOCKED');
    const conv = await getOrCreateConversation(me, userId);
    return { id: conv.id };
  });

  app.get('/conversations/:id', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const conv = await prisma.conversation.findUnique({ where: { id } });
    if (!conv || (conv.userAId !== me && conv.userBId !== me)) throw err.notFound();
    const otherId = conv.userAId === me ? conv.userBId : conv.userAId;
    const other = await prisma.user.findUniqueOrThrow({ where: { id: otherId }, select: { ...publicUserSelect, photos: true } });
    const pricing = await messagePricing(me, otherId, conv.id);
    const vip = activeVip(pricing.sender);
    return {
      id: conv.id,
      user: presentUser(other),
      otherLastReadAt: conv.userAId === me ? conv.bLastReadAt : conv.aLastReadAt,
      pricing: { price: pricing.price, reason: pricing.reason, freeLeft: vip ? vip.freeMessagesPerDay - (pricing.vipUsed ?? 0) : 0 },
      blocked: await isBlocked(me, otherId),
    };
  });

  app.get('/conversations/:id/messages', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const q = z.object({ before: z.coerce.date().optional(), limit: z.coerce.number().int().min(1).max(100).default(40) }).parse(req.query);
    const conv = await prisma.conversation.findUnique({ where: { id } });
    if (!conv || (conv.userAId !== me && conv.userBId !== me)) throw err.notFound();
    const items = await prisma.message.findMany({
      where: { conversationId: id, ...(q.before ? { createdAt: { lt: q.before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: q.limit,
    });
    return { items: items.reverse() };
  });

  app.post('/conversations/:id/read', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const conv = await prisma.conversation.findUnique({ where: { id } });
    if (!conv || (conv.userAId !== me && conv.userBId !== me)) throw err.notFound();
    const now = new Date();
    await prisma.conversation.update({ where: { id }, data: conv.userAId === me ? { aLastReadAt: now } : { bLastReadAt: now } });
    emitToUser(conv.userAId === me ? conv.userBId : conv.userAId, 'chat:read', { conversationId: id, at: now });
    return { ok: true };
  });

  app.post('/conversations/:id/messages', { preHandler: requireAuth, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z
      .object({ type: z.enum(['TEXT', 'IMAGE']).default('TEXT'), text: z.string().max(1000).default(''), mediaUrl: z.string().url().optional() })
      .parse(req.body);
    if (b.type === 'TEXT' && !b.text.trim()) throw err.badRequest('EMPTY_MESSAGE');
    if (b.type === 'IMAGE' && !b.mediaUrl) throw err.badRequest('MEDIA_REQUIRED');
    const conv = await prisma.conversation.findUnique({ where: { id } });
    if (!conv || (conv.userAId !== me && conv.userBId !== me)) throw err.notFound();
    const otherId = conv.userAId === me ? conv.userBId : conv.userAId;
    if (await isBlocked(me, otherId)) throw err.forbidden('BLOCKED');

    const pricing = await messagePricing(me, otherId, conv.id);
    const text = sanitizeText(b.text);
    const msg = await prisma.$transaction(async (tx) => {
      const m = await tx.message.create({
        data: { conversationId: id, senderId: me, type: b.type, text, mediaUrl: b.mediaUrl, coinsCost: pricing.price },
      });
      if (pricing.reason === 'VIP_FREE') {
        await tx.user.update({ where: { id: me }, data: { freeMsgDate: todayKey(), freeMsgUsed: (pricing.vipUsed ?? 0) + 1 } });
      }
      if (pricing.price > 0) {
        await spendCoins(tx, me, pricing.price, 'MESSAGE_SENT', m.id);
        await rewardReceiver(tx, otherId, pricing.price, 'MESSAGE_EARNED', m.id);
      }
      const now = new Date();
      await tx.conversation.update({
        where: { id },
        data: { lastMessageAt: now, lastMessageText: b.type === 'IMAGE' ? '📷' : text.slice(0, 120), ...(conv.userAId === me ? { aLastReadAt: now } : { bLastReadAt: now }) },
      });
      return m;
    });
    emitToUser(otherId, 'message:new', msg);
    emitToUser(me, 'message:new', msg);
    const sender = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { name: true, coins: true } });
    if (pricing.price > 0) emitToUser(me, 'wallet:update', { coins: sender.coins });
    void notify(otherId, 'message', { actorId: me, store: false, body: `${sender.name}: ${b.type === 'IMAGE' ? '📷' : text.slice(0, 80)}`, data: { conversationId: id } }).catch(() => {});
    return { message: msg, coins: sender.coins };
  });
}
