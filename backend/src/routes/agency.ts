import crypto from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { hostRequirements } from './host.js';
import { AGENCY_TIERS, ECONOMY, agencyTier } from '../economy.js';
import { agencyMonthly } from '../services/wallet.js';

function agencyCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
}

const EARN_TYPES = ['GIFT_RECEIVED', 'MESSAGE_EARNED', 'CALL_EARNED'];

export default async function agencyRoutes(app: FastifyInstance) {
  app.post('/agencies', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    // Agentlik yaratmaq pulsuzdur, amma müraciət formu + şəxsiyyət təsdiqi + admin yoxlaması tələb olunur
    const b = z.object({
      name: z.string().trim().min(3).max(40),
      description: z.string().max(500).default(''),
      logoUrl: z.string().url().optional(),
      city: z.string().trim().min(2).max(40),
      contactName: z.string().trim().min(3).max(80),
      contactPhone: z.string().trim().min(7).max(20),
      experience: z.string().max(500).default(''),
      expectedHosts: z.number().int().min(1).max(10000),
    }).parse(req.body);
    const owned = await prisma.agency.findUnique({ where: { ownerId: me } });
    if (owned) throw err.badRequest('AGENCY_EXISTS');
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    if (u.kycStatus !== 'PENDING' && u.kycStatus !== 'APPROVED') throw err.badRequest('KYC_REQUIRED');
    if (u.agencyId) throw err.badRequest('ALREADY_IN_AGENCY');
    let code = agencyCode();
    while (await prisma.agency.findUnique({ where: { code } })) code = agencyCode();
    const agency = await prisma.agency.create({ data: { ...b, code, ownerId: me } });
    return { agency };
  });

  app.get('/agencies/public/:code', async (req) => {
    const { code } = z.object({ code: z.string() }).parse(req.params);
    const a = await prisma.agency.findUnique({ where: { code: code.toUpperCase() }, include: { _count: { select: { members: true } } } });
    if (!a || a.status !== 'ACTIVE') throw err.notFound('AGENCY_NOT_FOUND');
    return { id: a.id, name: a.name, code: a.code, logoUrl: a.logoUrl, description: a.description, members: a._count.members };
  });

  app.post('/agencies/join', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ code: z.string().trim() }).parse(req.body);
    const a = await prisma.agency.findUnique({ where: { code: b.code.toUpperCase() } });
    if (!a || a.status !== 'ACTIVE') throw err.notFound('AGENCY_NOT_FOUND');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    if (user.agencyId) throw err.badRequest('ALREADY_IN_AGENCY');
    if (a.ownerId === me) throw err.badRequest('OWN_AGENCY');
    const reqs = await hostRequirements(me);
    if (!reqs.eligible) throw err.badRequest('HOST_REQUIREMENTS', { items: reqs.items });
    const pending = await prisma.agencyJoinRequest.findFirst({ where: { userId: me, status: 'PENDING' } });
    if (pending) throw err.badRequest('REQUEST_PENDING');
    const request = await prisma.agencyJoinRequest.create({ data: { agencyId: a.id, userId: me } });
    return { request };
  });

  app.post('/agencies/leave', { preHandler: requireAuth }, async (req) => {
    await prisma.user.update({ where: { id: uid(req) }, data: { agencyId: null, agencyJoinedAt: null } });
    return { ok: true };
  });

  app.get('/agencies/me', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const agency = await prisma.agency.findUnique({ where: { ownerId: me } });
    if (!agency) return { agency: null };
    const members = await prisma.user.findMany({ where: { agencyId: agency.id }, select: { ...publicUserSelect, photos: true, agencyJoinedAt: true, diamonds: true } });
    const since7 = new Date(Date.now() - 7 * 86400_000);
    const since30 = new Date(Date.now() - 30 * 86400_000);
    const ids = members.map((m) => m.id);
    const [week, month, requests, commission] = await Promise.all([
      prisma.walletTransaction.groupBy({ by: ['userId'], where: { userId: { in: ids }, type: { in: EARN_TYPES }, createdAt: { gte: since7 } }, _sum: { amount: true } }),
      prisma.walletTransaction.groupBy({ by: ['userId'], where: { userId: { in: ids }, type: { in: EARN_TYPES }, createdAt: { gte: since30 } }, _sum: { amount: true } }),
      prisma.agencyJoinRequest.findMany({ where: { agencyId: agency.id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
      prisma.walletTransaction.aggregate({ where: { userId: me, type: 'AGENCY_COMMISSION', createdAt: { gte: since30 } }, _sum: { amount: true } }),
    ]);
    const w = new Map(week.map((r) => [r.userId, r._sum.amount ?? 0]));
    const m = new Map(month.map((r) => [r.userId, r._sum.amount ?? 0]));
    const reqUsers = await prisma.user.findMany({ where: { id: { in: requests.map((r) => r.userId) } }, select: { ...publicUserSelect, photos: true } });
    const ru = new Map(reqUsers.map((u) => [u.id, presentUser(u)]));
    const monthly = await agencyMonthly(prisma, agency.id);
    const tier = agencyTier(monthly);
    const next = AGENCY_TIERS.find((t) => t.minMonthly > monthly) ?? null;
    return {
      agency,
      tier: { ...tier, hostShare: Math.round((ECONOMY.receiversShare - tier.share) * 100) / 100, monthly, next },
      stats: {
        members: members.length,
        weekDiamonds: [...w.values()].reduce((a, b) => a + b, 0),
        monthDiamonds: [...m.values()].reduce((a, b) => a + b, 0),
        monthCommission: commission._sum.amount ?? 0,
      },
      members: members
        .map((u) => ({ user: presentUser(u), joinedAt: u.agencyJoinedAt, weekDiamonds: w.get(u.id) ?? 0, monthDiamonds: m.get(u.id) ?? 0 }))
        .sort((a, b) => b.monthDiamonds - a.monthDiamonds),
      requests: requests.flatMap((r) => (ru.get(r.userId) ? [{ id: r.id, createdAt: r.createdAt, user: ru.get(r.userId)! }] : [])),
    };
  });

  app.post('/agencies/requests/:id/:action', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const p = z.object({ id: z.string(), action: z.enum(['approve', 'reject']) }).parse(req.params);
    const r = await prisma.agencyJoinRequest.findUnique({ where: { id: p.id }, include: { agency: true } });
    if (!r || r.agency.ownerId !== me) throw err.forbidden();
    if (r.status !== 'PENDING') throw err.badRequest('REQUEST_PROCESSED');
    if (p.action === 'approve') {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: r.userId } });
      if (user.agencyId) throw err.badRequest('ALREADY_IN_AGENCY');
      await prisma.$transaction([
        prisma.agencyJoinRequest.update({ where: { id: r.id }, data: { status: 'APPROVED' } }),
        // Agentliyə qəbul = host statusu (qazanc başlayır)
        prisma.user.update({ where: { id: r.userId }, data: { agencyId: r.agencyId, agencyJoinedAt: new Date(), hostStatus: 'APPROVED', verified: user.kycStatus === 'APPROVED' } }),
      ]);
    } else {
      await prisma.agencyJoinRequest.update({ where: { id: r.id }, data: { status: 'REJECTED' } });
    }
    return { ok: true };
  });

  /** Agentlik sahibi, selfi təsdiqi göndərmiş üzvünü host kimi təsdiqləyə bilər */
  app.post('/agencies/members/:userId/approve-host', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const agency = await prisma.agency.findUnique({ where: { ownerId: me } });
    if (!agency || agency.status !== 'ACTIVE') throw err.forbidden();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.agencyId !== agency.id) throw err.notFound();
    if (!user.verificationUrl) throw err.badRequest('VERIFICATION_REQUIRED');
    await prisma.user.update({ where: { id: userId }, data: { hostStatus: 'APPROVED', verified: true } });
    return { ok: true };
  });

  app.delete('/agencies/members/:userId', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const agency = await prisma.agency.findUnique({ where: { ownerId: me } });
    if (!agency) throw err.forbidden();
    await prisma.user.updateMany({ where: { id: userId, agencyId: agency.id }, data: { agencyId: null, agencyJoinedAt: null } });
    return { ok: true };
  });

  app.get('/agencies/my-request', { preHandler: requireAuth }, async (req) => {
    const r = await prisma.agencyJoinRequest.findFirst({ where: { userId: uid(req) }, orderBy: { createdAt: 'desc' }, include: { agency: { select: { name: true, code: true } } } });
    return { request: r };
  });
}
