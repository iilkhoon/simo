/**
 * Xidmət satışı: istifadəçi öz xidmətlərini (fərdi zəng, video təbrik, dil dərsi, məsləhət...) Nar ilə satır.
 * Sifarişdə Nar alıcıdan tutulur (escrow). Satıcı qəbul edir → yerinə yetirir → "tamamlandı":
 * ödənişli hissədən satıcıya Almaz yazılır (70/30 qaydası). İmtina/ləğvdə Nar alıcıya qaytarılır.
 * Satıcı qəbul etməzdən əvvəl alıcı ləğv edə bilər. 72 saat cavabsız qalan sifariş avtomatik qaytarılır.
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { creditCoins, rewardReceiver, spend } from '../services/wallet.js';
import { notify } from '../services/notify.js';
import { sanitizeText } from './chat.js';

const serviceBody = z.object({
  kind: z.enum(['VIDEO_CALL', 'VOICE_CALL', 'CHAT', 'CUSTOM']).default('CUSTOM'),
  title: z.string().trim().min(3).max(60),
  description: z.string().trim().max(400).default(''),
  price: z.number().int().min(50).max(50000),
  durationMin: z.number().int().min(0).max(240).default(0),
  active: z.boolean().default(true),
});

async function refund(orderId: string, status: 'CANCELLED' | 'DECLINED', from: ('PENDING' | 'ACCEPTED')[] = ['PENDING', 'ACCEPTED']) {
  await prisma.$transaction(async (tx) => {
    const o = await tx.serviceOrder.findUniqueOrThrow({ where: { id: orderId } });
    const upd = await tx.serviceOrder.updateMany({ where: { id: orderId, status: { in: from } }, data: { status } });
    if (!upd.count) throw err.badRequest('ORDER_CLOSED');
    // Ödənişli hissə ödənişli, promo hissə promo kimi qaytarılır
    if (o.paid > 0) await creditCoins(tx, o.buyerId, o.paid, 'SERVICE_REFUND', o.id);
    if (o.price - o.paid > 0) await creditCoins(tx, o.buyerId, o.price - o.paid, 'SERVICE_REFUND', o.id, '', true);
  });
}

export async function expireOrders() {
  const old = await prisma.serviceOrder.findMany({ where: { status: 'PENDING', createdAt: { lt: new Date(Date.now() - 72 * 3600_000) } }, select: { id: true } });
  for (const o of old) await refund(o.id, 'DECLINED', ['PENDING']).catch(() => {});
}

export default async function serviceRoutes(app: FastifyInstance) {
  app.get('/services/user/:userId', { preHandler: requireAuth }, async (req) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const me = uid(req);
    const items = await prisma.service.findMany({ where: { userId, ...(userId === me ? {} : { active: true }) }, orderBy: { createdAt: 'desc' } });
    return { items };
  });

  app.post('/services', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = serviceBody.parse(req.body);
    const count = await prisma.service.count({ where: { userId: me } });
    if (count >= 10) throw err.badRequest('SERVICE_LIMIT');
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { kycStatus: true } });
    if (u.kycStatus !== 'APPROVED') throw err.badRequest('KYC_REQUIRED');
    const item = await prisma.service.create({ data: { ...b, title: sanitizeText(b.title), description: sanitizeText(b.description), userId: me } });
    return { item };
  });

  app.patch('/services/:id', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = serviceBody.partial().parse(req.body);
    const res = await prisma.service.updateMany({ where: { id, userId: me }, data: b });
    if (!res.count) throw err.notFound();
    return { ok: true };
  });

  app.delete('/services/:id', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.service.updateMany({ where: { id, userId: me }, data: { active: false } });
    return { ok: true };
  });

  /** Sifariş: Nar tutulur (escrow) */
  app.post('/services/:id/order', { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 hour' } } }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ note: z.string().max(300).default('') }).parse(req.body ?? {});
    const svc = await prisma.service.findFirst({ where: { id, active: true } });
    if (!svc) throw err.notFound();
    if (svc.userId === me) throw err.badRequest();
    const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: me, blockedId: svc.userId }, { blockerId: svc.userId, blockedId: me }] } });
    if (blocked) throw err.forbidden('BLOCKED');
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.serviceOrder.create({ data: { serviceId: svc.id, buyerId: me, sellerId: svc.userId, price: svc.price, note: sanitizeText(b.note) } });
      const { paid } = await spend(tx, me, svc.price, 'SERVICE_ORDER', o.id);
      return tx.serviceOrder.update({ where: { id: o.id }, data: { paid } });
    });
    void notify(svc.userId, 'order', { actorId: me, data: { orderId: order.id, title: svc.title } }).catch(() => {});
    return { order };
  });

  /** Mənim sifarişlərim: ?as=buyer|seller */
  app.get('/orders', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const q = z.object({ as: z.enum(['buyer', 'seller']).default('buyer') }).parse(req.query);
    const rows = await prisma.serviceOrder.findMany({
      where: q.as === 'buyer' ? { buyerId: me } : { sellerId: me },
      include: { service: true }, orderBy: { createdAt: 'desc' }, take: 100,
    });
    const ids = [...new Set(rows.map((r) => (q.as === 'buyer' ? r.sellerId : r.buyerId)))];
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
    return { items: rows.map((r) => ({ ...r, other: byId.get(q.as === 'buyer' ? r.sellerId : r.buyerId) ?? null })) };
  });

  app.post('/orders/:id/:action', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id, action } = z.object({ id: z.string(), action: z.enum(['accept', 'decline', 'cancel', 'complete']) }).parse(req.params);
    const o = await prisma.serviceOrder.findUnique({ where: { id }, include: { service: true } });
    if (!o) throw err.notFound();
    if (action === 'cancel') {
      if (o.buyerId !== me || o.status !== 'PENDING') throw err.forbidden();
      // Satıcı bu arada qəbul edibsə — alıcı artıq ləğv edə bilməz (yalnız PENDING-dən)
      await refund(id, 'CANCELLED', ['PENDING']);
    } else {
      if (o.sellerId !== me) throw err.forbidden();
      if (action === 'decline') await refund(id, 'DECLINED');
      if (action === 'accept') {
        const r = await prisma.serviceOrder.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'ACCEPTED' } });
        if (!r.count) throw err.badRequest('ORDER_CLOSED');
      }
      if (action === 'complete') {
        await prisma.$transaction(async (tx) => {
          const r = await tx.serviceOrder.updateMany({ where: { id, status: 'ACCEPTED' }, data: { status: 'DONE' } });
          if (!r.count) throw err.badRequest('ORDER_CLOSED');
          await rewardReceiver(tx, o.sellerId, o.paid, 'SERVICE_EARNED', o.id);
        });
      }
    }
    const other = me === o.buyerId ? o.sellerId : o.buyerId;
    void notify(other, 'order_update', { actorId: me, data: { orderId: id, action, title: o.service.title } }).catch(() => {});
    return { ok: true };
  });
}
