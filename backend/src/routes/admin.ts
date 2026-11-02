import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAdmin } from '../lib/auth.js';
import { agencyMonthly, creditCoins } from '../services/wallet.js';
import { agencyTier } from '../economy.js';
import { endLive } from '../services/live.js';
import { emitToUser } from '../realtime/hub.js';

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAdmin);

  app.get('/admin/stats', async () => {
    const day = new Date(Date.now() - 86400_000);
    const month = new Date(Date.now() - 30 * 86400_000);
    const [users, newUsers, online, hosts, lives, revenueDay, revenueMonth, pendingHosts, openReports, pendingWithdrawals, pendingAgencies, pendingKyc] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: day } } }),
      prisma.user.count({ where: { online: true } }),
      prisma.user.count({ where: { hostStatus: 'APPROVED' } }),
      prisma.liveRoom.count({ where: { status: 'LIVE' } }),
      prisma.payment.aggregate({ where: { status: 'PAID', paidAt: { gte: day }, provider: { not: 'DEV' } }, _sum: { amountQepik: true } }),
      prisma.payment.aggregate({ where: { status: 'PAID', paidAt: { gte: month }, provider: { not: 'DEV' } }, _sum: { amountQepik: true } }),
      prisma.user.count({ where: { hostStatus: 'PENDING' } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      prisma.agency.count({ where: { status: 'PENDING' } }),
      prisma.verification.count({ where: { status: 'PENDING' } }),
    ]);
    return {
      users, newUsers, online, hosts, lives,
      revenueDayAzn: (revenueDay._sum.amountQepik ?? 0) / 100,
      revenueMonthAzn: (revenueMonth._sum.amountQepik ?? 0) / 100,
      pendingHosts, openReports, pendingWithdrawals, pendingAgencies, pendingKyc,
    };
  });

  app.get('/admin/users', async (req) => {
    const q = z.object({ q: z.string().default(''), hostStatus: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']).optional() }).parse(req.query);
    const n = Number(q.q);
    const items = await prisma.user.findMany({
      where: {
        ...(q.hostStatus ? { hostStatus: q.hostStatus } : {}),
        ...(q.q
          ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { phone: { contains: q.q } }, { email: { contains: q.q, mode: 'insensitive' } }, ...(Number.isInteger(n) ? [{ shortId: n }] : [])] }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, shortId: true, name: true, phone: true, email: true, gender: true, avatarUrl: true, verificationUrl: true, hostStatus: true, verified: true, coins: true, diamonds: true, banned: true, createdAt: true, role: true },
    });
    return { items };
  });

  app.post('/admin/users/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z
      .object({ banned: z.boolean().optional(), verified: z.boolean().optional(), hostStatus: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']).optional(), grantCoins: z.number().int().optional() })
      .parse(req.body);
    const { grantCoins, ...data } = b;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { ...data, ...(data.hostStatus === 'APPROVED' ? { verified: true } : {}) } });
      if (grantCoins && grantCoins > 0) await creditCoins(tx, id, grantCoins, 'ADMIN', undefined, 'admin grant');
    });
    if (b.banned) emitToUser(id, 'force-logout', { reason: 'BANNED' });
    return { ok: true };
  });

  app.get('/admin/reports', async () => {
    const items = await prisma.report.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' }, take: 200 });
    return { items };
  });

  app.post('/admin/reports/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ status: z.enum(['RESOLVED', 'DISMISSED']), banUser: z.boolean().default(false) }).parse(req.body);
    const r = await prisma.report.update({ where: { id }, data: { status: b.status } });
    if (b.banUser) {
      await prisma.user.update({ where: { id: r.targetUserId }, data: { banned: true } });
      emitToUser(r.targetUserId, 'force-logout', { reason: 'BANNED' });
    }
    if (r.targetType === 'VIDEO' && r.targetId && b.status === 'RESOLVED') await prisma.video.updateMany({ where: { id: r.targetId }, data: { status: 'REMOVED' } });
    if (r.targetType === 'LIVE' && r.targetId && b.status === 'RESOLVED') await endLive(r.targetId, 'MODERATION');
    return { ok: true };
  });

  app.get('/admin/withdrawals', async () => {
    const items = await prisma.withdrawal.findMany({ where: { status: { in: ['PENDING', 'APPROVED'] } }, include: { user: { select: { shortId: true, name: true, phone: true } } }, orderBy: { createdAt: 'asc' } });
    return { items };
  });

  app.post('/admin/withdrawals/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ status: z.enum(['APPROVED', 'PAID', 'REJECTED']), note: z.string().default('') }).parse(req.body);
    await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.findUniqueOrThrow({ where: { id } });
      if (w.status === 'PAID' || w.status === 'REJECTED') throw err.badRequest('WITHDRAW_PROCESSED');
      await tx.withdrawal.update({ where: { id }, data: { status: b.status, note: b.note, processedAt: new Date() } });
      if (b.status === 'REJECTED') {
        // Almazlar geri qaytarılır
        const u = await tx.user.update({ where: { id: w.userId }, data: { diamonds: { increment: w.diamonds } }, select: { diamonds: true } });
        await tx.walletTransaction.create({ data: { userId: w.userId, currency: 'DIAMOND', amount: w.diamonds, balanceAfter: u.diamonds, type: 'WITHDRAW_REFUND', refId: w.id } });
      }
    });
    return { ok: true };
  });

  app.get('/admin/agencies', async () => {
    const list = await prisma.agency.findMany({ include: { owner: { select: { shortId: true, name: true, kycStatus: true } }, _count: { select: { members: true } } }, orderBy: { createdAt: 'desc' } });
    const items = await Promise.all(list.map(async (a) => {
      const monthly = a.status === 'ACTIVE' ? await agencyMonthly(prisma, a.id) : 0;
      const t = agencyTier(monthly);
      return { ...a, monthlyDiamonds: monthly, tier: t.tier, tierName: t.name, share: t.share };
    }));
    return { items };
  });

  app.post('/admin/agencies/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(), rejectReason: z.string().max(300).optional() }).parse(req.body);
    const a = await prisma.agency.update({ where: { id }, data: { ...b, reviewedAt: new Date() } });
    if (b.status === 'ACTIVE') {
      // Agentlik sahibi də qazanc əldə edə bilsin deyə agentliyin üzvü və host olur
      await prisma.user.update({ where: { id: a.ownerId }, data: { agencyId: a.id, agencyJoinedAt: new Date(), hostStatus: 'APPROVED' } });
    }
    emitToUser(a.ownerId, 'agency:status', { status: a.status, reason: a.rejectReason });
    return { ok: true };
  });

  /* ───────── Şəxsiyyət təsdiqi (KYC) ───────── */
  app.get('/admin/kyc', async (req) => {
    const q = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING') }).parse(req.query);
    const items = await prisma.verification.findMany({ where: { status: q.status }, orderBy: { createdAt: 'asc' }, take: 100, include: { user: { select: { id: true, shortId: true, name: true, avatarUrl: true, birthDate: true, gender: true } } } });
    return { items };
  });

  app.post('/admin/kyc/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().max(300).default('') }).parse(req.body);
    const v = await prisma.verification.update({ where: { id }, data: { status: b.status, note: b.note, reviewedAt: new Date() } });
    await prisma.user.update({ where: { id: v.userId }, data: { kycStatus: b.status, ...(b.status === 'APPROVED' ? { verified: true } : {}) } });
    emitToUser(v.userId, 'kyc:status', { status: b.status, note: b.note });
    return { ok: true };
  });

  app.get('/admin/payments', async () => {
    const items = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { shortId: true, name: true } } } });
    return { items };
  });

  app.get('/admin/lives', async () => {
    const items = await prisma.liveRoom.findMany({ where: { status: 'LIVE' }, include: { host: { select: { shortId: true, name: true } } } });
    return { items };
  });

  app.post('/admin/lives/:id/end', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await endLive(id, 'MODERATION');
    return { ok: true };
  });
}
