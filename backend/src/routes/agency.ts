/**
 * Agentlik proqramı: qeydiyyat (admin təsdiqi), dəvət kodu/linki, qoşulma müraciətləri,
 * sahib paneli (hostlar, dövr qazancı, komissiya, onlayn saatlar), hostun agentlik görünüşü, çıxış (cooldown).
 * Ətraflı: /docs/AGENCY_PROGRAM.md
 */
import crypto from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { hostRequirements } from './host.js';
import { AGENCY_TIERS, ECONOMY } from '../economy.js';
import { agencyTerms } from '../services/wallet.js';
import { hostsStats, periodStart, type Period } from '../services/hostStats.js';
import { notify } from '../services/notify.js';
import { emitToUser } from '../realtime/hub.js';

export function agencyCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(6), (b) => alphabet[b % alphabet.length]).join('');
}

async function uniqueCode(): Promise<string> {
  let code = agencyCode();
  while (await prisma.agency.findUnique({ where: { code } })) code = agencyCode();
  return code;
}

/** Dəvət linki: veb səhifə tətbiqi açır (simo://agency?code=…), tətbiq yoxdursa mağazaya yönləndirir */
export const inviteLink = (code: string) => `${config.webUrl}/join.html?code=${encodeURIComponent(code)}`;

/** Agentlikdən çıxdıqdan sonra yeni agentliyə qoşulma gözləməsi bitəcəyi an (yoxdursa null) */
export function cooldownUntil(agencyLeftAt: Date | null | undefined): Date | null {
  if (!agencyLeftAt) return null;
  const until = new Date(agencyLeftAt.getTime() + ECONOMY.agencyCooldownDays * 86400_000);
  return until.getTime() > Date.now() ? until : null;
}

/**
 * Qoşulma müraciəti (kod/link və ya kataloq): agentliksiz, gözləmə müddəti bitmiş, host şərtlərini tamamlamış
 * istifadəçi; eyni anda yalnız bir gözləyən müraciət.
 */
export async function createJoinRequest(me: string, agencyId: string, source: 'CODE' | 'APPLY', message = '') {
  const a = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!a || a.status !== 'ACTIVE') throw err.notFound('AGENCY_NOT_FOUND');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me }, include: { ownedAgency: { select: { id: true } } } });
  if (user.agencyId) throw err.badRequest('ALREADY_IN_AGENCY');
  if (a.ownerId === me || user.ownedAgency) throw err.badRequest('OWN_AGENCY');
  const until = cooldownUntil(user.agencyLeftAt);
  if (until) throw err.badRequest('AGENCY_COOLDOWN', { until });
  const reqs = await hostRequirements(me);
  if (!reqs.eligible) throw err.badRequest('HOST_REQUIREMENTS', { items: reqs.items });
  const pending = await prisma.agencyJoinRequest.findFirst({ where: { userId: me, status: 'PENDING' } });
  if (pending) throw err.badRequest('REQUEST_PENDING');
  const request = await prisma.agencyJoinRequest.create({ data: { agencyId: a.id, userId: me, source, message: message.slice(0, 300) } });
  void notify(a.ownerId, 'agency', { actorId: me, body: message || undefined, data: { requestId: request.id } }).catch(() => {});
  emitToUser(a.ownerId, 'agency:request', { requestId: request.id });
  return request;
}

const periodSchema = z.enum(['today', 'week', 'month']).default('week');

export default async function agencyRoutes(app: FastifyInstance) {
  app.post('/agencies', { preHandler: requireAuth, config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req) => {
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
    const agency = await prisma.agency.create({ data: { ...b, code: await uniqueCode(), ownerId: me } });
    return { agency };
  });

  /** Dəvət kodu ilə agentliyin ictimai kartı (link açılanda göstərilir) */
  app.get('/agencies/public/:code', async (req) => {
    const { code } = z.object({ code: z.string().trim().max(16) }).parse(req.params);
    const a = await prisma.agency.findUnique({ where: { code: code.toUpperCase() }, include: { _count: { select: { members: true } } } });
    if (!a || a.status !== 'ACTIVE') throw err.notFound('AGENCY_NOT_FOUND');
    const terms = await agencyTerms(prisma, a, true);
    return { id: a.id, name: a.name, code: a.code, logoUrl: a.logoUrl, description: a.description, city: a.city, members: a._count.members, tier: terms.tier.tier, tierName: terms.tier.name, hostShare: terms.hostShare };
  });

  /** Dəvət kodu / linki ilə qoşulma müraciəti */
  app.post('/agencies/join', { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 hour' } } }, async (req) => {
    const me = uid(req);
    const b = z.object({ code: z.string().trim().min(4).max(16), message: z.string().max(300).default('') }).parse(req.body);
    const a = await prisma.agency.findUnique({ where: { code: b.code.toUpperCase() } });
    if (!a || a.status !== 'ACTIVE') throw err.notFound('AGENCY_NOT_FOUND');
    const request = await createJoinRequest(me, a.id, 'CODE', b.message);
    return { request, agency: { id: a.id, name: a.name } };
  });

  /** Müraciəti geri götürmək */
  app.delete('/agencies/my-request', { preHandler: requireAuth }, async (req) => {
    const r = await prisma.agencyJoinRequest.updateMany({ where: { userId: uid(req), status: 'PENDING' }, data: { status: 'REJECTED', rejectReason: 'CANCELLED', decidedAt: new Date() } });
    return { ok: true, cancelled: r.count };
  });

  /** Host agentlikdən könüllü çıxır → yeni agentliyə qoşulmaq üçün gözləmə müddəti başlayır */
  app.post('/agencies/leave', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { agencyId: true, agency: { select: { ownerId: true, name: true } } } });
    if (!u.agencyId) return { ok: true, cooldownUntil: null };
    if (u.agency?.ownerId === me) throw err.badRequest('OWNER_CANNOT_LEAVE');
    const now = new Date();
    await prisma.user.update({ where: { id: me }, data: { agencyId: null, agencyJoinedAt: null, agencyLeftAt: now } });
    if (u.agency) void notify(u.agency.ownerId, 'agency_update', { actorId: me, data: { event: 'HOST_LEFT', userId: me } }).catch(() => {});
    return { ok: true, cooldownUntil: cooldownUntil(now) };
  });

  /** Hostun agentlik görünüşü: hansı agentlikdəyəm, şərtlər, müraciət statusu, gözləmə müddəti */
  app.get('/agencies/my', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { agencyId: true, agencyJoinedAt: true, agencyLeftAt: true } });
    const request = await prisma.agencyJoinRequest.findFirst({ where: { userId: me }, orderBy: { createdAt: 'desc' }, include: { agency: { select: { id: true, name: true, code: true } } } });
    let agency = null;
    if (u.agencyId) {
      const a = await prisma.agency.findUnique({ where: { id: u.agencyId }, include: { _count: { select: { members: true } } } });
      if (a) {
        const terms = await agencyTerms(prisma, a, true);
        const owner = await prisma.user.findUnique({ where: { id: a.ownerId }, select: { ...publicUserSelect, photos: true } });
        agency = {
          id: a.id, name: a.name, code: a.code, logoUrl: a.logoUrl, city: a.city, status: a.status, members: a._count.members,
          tier: terms.tier.tier, tierName: terms.tier.name, hostShare: terms.hostShare, isOwner: a.ownerId === me,
          owner: owner ? presentUser(owner) : null, contactPhone: a.contactPhone,
        };
      }
    }
    return { agency, joinedAt: u.agencyJoinedAt, cooldownUntil: cooldownUntil(u.agencyLeftAt), cooldownDays: ECONOMY.agencyCooldownDays, request };
  });

  /** Agentlik sahibinin paneli: hostlar, dövr qazancı, komissiya, onlayn saatlar, zənglər, müraciətlər */
  app.get('/agencies/me', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const q = z.object({ period: periodSchema }).parse(req.query);
    const agency = await prisma.agency.findUnique({ where: { ownerId: me } });
    if (!agency) return { agency: null };
    const members = await prisma.user.findMany({ where: { agencyId: agency.id }, select: { ...publicUserSelect, photos: true, agencyJoinedAt: true } });
    const ids = members.map((m) => m.id);
    const [today, week, month, requests, terms, series] = await Promise.all([
      hostsStats(ids, periodStart('today'), agency.id),
      hostsStats(ids, periodStart('week'), agency.id),
      hostsStats(ids, periodStart('month'), agency.id),
      prisma.agencyJoinRequest.findMany({ where: { agencyId: agency.id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
      agencyTerms(prisma, agency),
      prisma.$queryRaw<{ day: string; host: bigint; agency: bigint }[]>`
        SELECT to_char(("createdAt" + interval '4 hour')::date, 'YYYY-MM-DD') AS day, SUM("hostAmount") AS host, SUM("agencyAmount") AS agency
        FROM "HostEarning" WHERE "agencyId" = ${agency.id} AND "createdAt" >= ${new Date(periodStart('today').getTime() - 13 * 86400_000)}
        GROUP BY 1 ORDER BY 1`,
    ]);
    const byPeriod = { today, week, month }[q.period as Period];
    const reqUsers = await prisma.user.findMany({ where: { id: { in: requests.map((r) => r.userId) } }, select: { ...publicUserSelect, photos: true } });
    const ru = new Map(reqUsers.map((u) => [u.id, presentUser(u)]));
    const next = AGENCY_TIERS.find((t) => t.minMonthly > terms.monthly) ?? null;
    const sum = (m: typeof week, k: 'hostAmount' | 'agencyAmount' | 'paidCoins' | 'onlineMin' | 'callMin' | 'calls' | 'gifts') => [...m.values()].reduce((a, s) => a + s[k], 0);
    const bySource: Record<string, number> = {};
    for (const s of byPeriod.values()) for (const [k, v] of Object.entries(s.bySource)) bySource[k] = (bySource[k] ?? 0) + v;
    const list = members
      .map((u) => {
        const p = byPeriod.get(u.id)!;
        return {
          user: presentUser(u), joinedAt: u.agencyJoinedAt, isOwner: u.id === agency.ownerId, lastSeenAt: u.lastSeenAt,
          earnings: p.hostAmount, commission: p.agencyAmount, paidCoins: p.paidCoins, onlineMin: p.onlineMin, callMin: p.callMin, calls: p.calls, gifts: p.gifts, bySource: p.bySource,
          weekDiamonds: week.get(u.id)!.hostAmount, monthDiamonds: month.get(u.id)!.hostAmount,
        };
      })
      .sort((a, b) => b.earnings + b.commission - (a.earnings + a.commission) || b.monthDiamonds - a.monthDiamonds);
    return {
      agency: { ...agency, inviteLink: inviteLink(agency.code) },
      period: q.period,
      tier: { ...terms.tier, share: terms.share, tierShare: terms.tier.share, custom: terms.custom, hostShare: terms.hostShare, monthly: terms.monthly, next },
      stats: {
        members: members.length,
        onlineNow: members.filter((m) => m.online).length,
        hostEarnings: sum(byPeriod, 'hostAmount'),
        commission: sum(byPeriod, 'agencyAmount'),
        paidCoins: sum(byPeriod, 'paidCoins'),
        onlineMin: sum(byPeriod, 'onlineMin'),
        callMin: sum(byPeriod, 'callMin'),
        calls: sum(byPeriod, 'calls'),
        gifts: sum(byPeriod, 'gifts'),
        bySource,
        // Köhnə sahələr (geri uyğunluq)
        weekDiamonds: sum(week, 'hostAmount'),
        monthDiamonds: sum(month, 'hostAmount'),
        monthCommission: sum(month, 'agencyAmount'),
      },
      series: series.map((r) => ({ day: r.day, host: Number(r.host), agency: Number(r.agency) })),
      members: list,
      requests: requests.flatMap((r) => (ru.get(r.userId) ? [{ id: r.id, createdAt: r.createdAt, source: r.source, message: r.message, user: ru.get(r.userId)! }] : [])),
    };
  });

  /** Dəvət kodunu yeniləmək (köhnə kod/link işləməz olur) */
  app.post('/agencies/me/rotate-code', { preHandler: requireAuth, config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req) => {
    const a = await prisma.agency.findUnique({ where: { ownerId: uid(req) } });
    if (!a) throw err.notFound('AGENCY_NOT_FOUND');
    const agency = await prisma.agency.update({ where: { id: a.id }, data: { code: await uniqueCode() } });
    return { code: agency.code, inviteLink: inviteLink(agency.code) };
  });

  app.post('/agencies/requests/:id/:action', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const p = z.object({ id: z.string(), action: z.enum(['approve', 'reject']) }).parse(req.params);
    const b = z.object({ reason: z.string().max(200).default('') }).parse(req.body ?? {});
    const r = await prisma.agencyJoinRequest.findUnique({ where: { id: p.id }, include: { agency: true } });
    if (!r || r.agency.ownerId !== me) throw err.forbidden();
    if (r.status !== 'PENDING') throw err.badRequest('REQUEST_PROCESSED');
    if (p.action === 'approve') {
      if (r.agency.status !== 'ACTIVE') throw err.badRequest('AGENCY_NOT_ACTIVE');
      await prisma.$transaction(async (tx) => {
        // Şərti yeniləmələr: eyni müraciət iki dəfə təsdiqlənmir, host eyni anda iki agentliyə düşmür
        const upd = await tx.agencyJoinRequest.updateMany({ where: { id: r.id, status: 'PENDING' }, data: { status: 'APPROVED', decidedAt: new Date() } });
        if (upd.count === 0) throw err.badRequest('REQUEST_PROCESSED');
        const user = await tx.user.findUniqueOrThrow({ where: { id: r.userId }, select: { kycStatus: true } });
        // Agentliyə qəbul = host statusu (qazanc başlayır)
        const moved = await tx.user.updateMany({
          where: { id: r.userId, agencyId: null, banned: false, deletedAt: null },
          data: { agencyId: r.agencyId, agencyJoinedAt: new Date(), agencyLeftAt: null, hostStatus: 'APPROVED', ...(user.kycStatus === 'APPROVED' ? { verified: true } : {}) },
        });
        if (moved.count === 0) throw err.badRequest('ALREADY_IN_AGENCY');
      });
      void notify(r.userId, 'agency_update', { actorId: me, body: r.agency.name, data: { event: 'APPROVED', agencyId: r.agencyId } }).catch(() => {});
    } else {
      const upd = await prisma.agencyJoinRequest.updateMany({ where: { id: r.id, status: 'PENDING' }, data: { status: 'REJECTED', rejectReason: b.reason, decidedAt: new Date() } });
      if (upd.count === 0) throw err.badRequest('REQUEST_PROCESSED');
      void notify(r.userId, 'agency_update', { actorId: me, body: b.reason || r.agency.name, data: { event: 'REJECTED', agencyId: r.agencyId } }).catch(() => {});
    }
    emitToUser(r.userId, 'agency:status', { request: p.action });
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

  /** Sahib hostu agentlikdən çıxarır (hostda gözləmə müddəti başlamır — o, dərhal başqa agentliyə qoşula bilər) */
  app.delete('/agencies/members/:userId', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const agency = await prisma.agency.findUnique({ where: { ownerId: me } });
    if (!agency) throw err.forbidden();
    if (userId === me) throw err.badRequest('OWNER_CANNOT_LEAVE');
    const r = await prisma.user.updateMany({ where: { id: userId, agencyId: agency.id }, data: { agencyId: null, agencyJoinedAt: null, agencyLeftAt: null } });
    if (r.count) void notify(userId, 'agency_update', { actorId: me, body: agency.name, data: { event: 'REMOVED', agencyId: agency.id } }).catch(() => {});
    return { ok: true, removed: r.count };
  });

  app.get('/agencies/my-request', { preHandler: requireAuth }, async (req) => {
    const r = await prisma.agencyJoinRequest.findFirst({ where: { userId: uid(req) }, orderBy: { createdAt: 'desc' }, include: { agency: { select: { name: true, code: true } } } });
    return { request: r };
  });
}
