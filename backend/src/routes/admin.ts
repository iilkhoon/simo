import { z } from 'zod';
import { signPrivateUrl } from '../lib/security.js';
import { disconnectUser } from '../realtime/hub.js';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAdmin } from '../lib/auth.js';
import { creditCoins } from '../services/wallet.js';
import { registerAgencyAdmin } from './adminAgency.js';
import { endLive } from '../services/live.js';
import { emitToUser } from '../realtime/hub.js';
import { assertHostAgeEligible, assertKycAdult } from '../services/safety.js';

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
    // Şəxsi sənəd/selfi: yalnız 15 dəqiqəlik imzalı link
    return { items: items.map((u) => ({ ...u, verificationUrl: signPrivateUrl(u.verificationUrl) })) };
  });

  app.post('/admin/users/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z
      .object({ banned: z.boolean().optional(), verified: z.boolean().optional(), hostStatus: z.enum(['NONE', 'PENDING', 'APPROVED', 'REJECTED']).optional(), grantCoins: z.number().int().optional() })
      .parse(req.body);
    const { grantCoins, ...data } = b;
    // Host təsdiqi: şəxsiyyət sənədinə görə 18+ (AgeCheck yazılır)
    if (data.hostStatus === 'APPROVED') await assertHostAgeEligible(id, req.user?.id);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { ...data, ...(data.hostStatus === 'APPROVED' ? { verified: true } : {}) } });
      if (grantCoins && grantCoins > 0) await creditCoins(tx, id, grantCoins, 'ADMIN', undefined, 'admin grant');
    });
    if (b.banned) {
      emitToUser(id, 'force-logout', { reason: 'BANNED' });
      // Bloklanan istifadəçinin bütün sessiyaları dərhal bağlanır
      await prisma.refreshToken.updateMany({ where: { userId: id, revoked: false }, data: { revoked: true } });
      disconnectUser(id);
    }
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
      await prisma.refreshToken.updateMany({ where: { userId: r.targetUserId, revoked: false }, data: { revoked: true } });
      emitToUser(r.targetUserId, 'force-logout', { reason: 'BANNED' });
      disconnectUser(r.targetUserId);
    }
    if (r.targetType === 'VIDEO' && r.targetId && b.status === 'RESOLVED') await prisma.video.updateMany({ where: { id: r.targetId }, data: { status: 'REMOVED' } });
    if (r.targetType === 'LIVE' && r.targetId && b.status === 'RESOLVED') await endLive(r.targetId, 'MODERATION');
    return { ok: true };
  });

  // Pul çıxarışları, agentliklər, həftəlik hesabatlar, CSV ixracı — ayrıca modulda
  registerAgencyAdmin(app);

  /* ───────── Şəxsiyyət təsdiqi (KYC) ───────── */
  app.get('/admin/kyc', async (req) => {
    const q = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING') }).parse(req.query);
    const items = await prisma.verification.findMany({ where: { status: q.status }, orderBy: { createdAt: 'asc' }, take: 100, include: { user: { select: { id: true, shortId: true, name: true, avatarUrl: true, birthDate: true, gender: true } } } });
    return { items: items.map((v) => ({ ...v, docFrontUrl: signPrivateUrl(v.docFrontUrl), docBackUrl: signPrivateUrl(v.docBackUrl), selfieUrl: signPrivateUrl(v.selfieUrl) })) };
  });

  app.post('/admin/kyc/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ status: z.enum(['APPROVED', 'REJECTED']), note: z.string().max(300).default('') }).parse(req.body);
    if (b.status === 'APPROVED') await assertKycAdult(id, req.user?.id);
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
