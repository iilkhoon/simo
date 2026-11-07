/**
 * Host olmaq yolu, şəxsiyyət təsdiqi (KYC), host parametrləri və agentlik kataloqu.
 *
 * Axın: qeydiyyat → hesabı istifadə et (3 gün, 10 nəfərlə söhbət) → 3 tapşırıq
 * (profil, ilk post, şəxsiyyət təsdiqi) → agentliyə müraciət → agentlik qəbul edir → host (qazanc başlayır).
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { AGENCY_TIERS, ECONOMY, ageFrom, agencyTier, levelFromXp, maxMsgPriceForLevel } from '../economy.js';
import { agencyMonthly } from '../services/wallet.js';
import { notify } from '../services/notify.js';
import { assertHostAgreement, recordSelfDeclaredMinor } from '../services/safety.js';

/** Host olmaq üçün şərtlərin vəziyyəti */
export async function hostRequirements(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { photos: true } });
  const R = ECONOMY.hostRequirements;
  const ageDays = Math.floor((Date.now() - u.createdAt.getTime()) / 86400_000);
  const partners = await prisma.message.findMany({
    where: { senderId: userId, type: { in: ['TEXT', 'IMAGE', 'GIFT'] } },
    select: { conversation: { select: { userAId: true, userBId: true } } },
    distinct: ['conversationId'],
    take: 200,
  });
  const chatPartners = new Set(partners.map((m) => (m.conversation.userAId === userId ? m.conversation.userBId : m.conversation.userAId))).size;
  const posts = await prisma.video.count({ where: { userId, status: 'ACTIVE' } });
  const items = [
    { key: 'accountAge', done: ageDays >= R.accountAgeDays, value: ageDays, target: R.accountAgeDays },
    { key: 'chatPartners', done: chatPartners >= R.chatPartners, value: chatPartners, target: R.chatPartners },
    { key: 'profile', done: !!u.avatarUrl && u.photos.length >= R.photos && u.bio.trim().length >= 10, value: u.photos.length, target: R.photos },
    { key: 'firstPost', done: posts >= 1, value: posts, target: 1 },
    { key: 'kyc', done: u.kycStatus === 'PENDING' || u.kycStatus === 'APPROVED', value: u.kycStatus === 'APPROVED' ? 1 : 0, target: 1, status: u.kycStatus },
  ];
  return { eligible: items.every((i) => i.done), items };
}

async function agencyCard(a: { id: string; name: string; code: string; logoUrl: string | null; description: string; city: string; defaultMsgPrice: number; createdAt: Date; ownerId: string }) {
  const [members, monthly] = await Promise.all([prisma.user.count({ where: { agencyId: a.id } }), agencyMonthly(prisma, a.id)]);
  const tier = agencyTier(monthly);
  return {
    id: a.id, name: a.name, code: a.code, logoUrl: a.logoUrl, description: a.description, city: a.city,
    defaultMsgPrice: a.defaultMsgPrice, members, monthlyDiamonds: monthly,
    tier: tier.tier, tierName: tier.name, agencyShare: tier.share, hostShare: Math.round((ECONOMY.receiversShare - tier.share) * 100) / 100,
    createdAt: a.createdAt,
  };
}

export default async function hostRoutes(app: FastifyInstance) {
  /* ───────── Host şərtləri ───────── */
  app.get('/host/requirements', { preHandler: requireAuth }, async (req) => hostRequirements(uid(req)));

  /** Host parametrləri: mesaj qiyməti (səviyyəyə görə hədd), pulsuz söhbət, private abunə qiyməti */
  app.patch('/host/settings', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({
      msgPrice: z.number().int().nullable().optional(),
      freeChat: z.boolean().optional(),
      privatePrice: z.number().int().nullable().optional(),
    }).parse(req.body);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    if (u.hostStatus !== 'APPROVED') throw err.forbidden('NOT_HOST');
    const level = levelFromXp(u.totalEarned);
    if (b.msgPrice != null) {
      const max = maxMsgPriceForLevel(level);
      if (b.msgPrice < ECONOMY.msgPrice.min || b.msgPrice > max) throw err.badRequest('PRICE_OUT_OF_RANGE', { min: ECONOMY.msgPrice.min, max });
    }
    if (b.privatePrice != null) {
      const P = ECONOMY.privatePrice;
      if (level < P.minLevel) throw err.badRequest('LEVEL_REQUIRED', { level: P.minLevel });
      if (u.kycStatus !== 'APPROVED') throw err.badRequest('KYC_REQUIRED');
      if (b.privatePrice < P.min || b.privatePrice > P.max) throw err.badRequest('PRICE_OUT_OF_RANGE', { min: P.min, max: P.max });
    }
    await prisma.user.update({ where: { id: me }, data: b });
    return { ok: true, maxMsgPrice: maxMsgPriceForLevel(level) };
  });

  /* ───────── Şəxsiyyət təsdiqi (KYC) ───────── */
  app.post('/kyc', { preHandler: requireAuth, config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req) => {
    const me = uid(req);
    const b = z.object({
      firstName: z.string().trim().min(2).max(40),
      lastName: z.string().trim().min(2).max(40),
      birthDate: z.coerce.date(),
      docType: z.enum(['ID_CARD', 'PASSPORT', 'DRIVER_LICENSE']).default('ID_CARD'),
      docFrontUrl: z.string().url(),
      docBackUrl: z.string().url().optional(),
      selfieUrl: z.string().url(),
    }).parse(req.body);
    if ((ageFrom(b.birthDate) ?? 0) < 18) { await recordSelfDeclaredMinor(me, b.birthDate); throw err.badRequest('UNDERAGE'); }
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    if (u.kycStatus === 'APPROVED') throw err.badRequest('KYC_ALREADY_APPROVED');
    if (u.kycStatus === 'PENDING') throw err.badRequest('KYC_PENDING');
    const v = await prisma.$transaction(async (tx) => {
      const row = await tx.verification.create({ data: { userId: me, ...b } });
      await tx.user.update({ where: { id: me }, data: { kycStatus: 'PENDING', verificationUrl: b.selfieUrl } });
      return row;
    });
    return { verification: { id: v.id, status: v.status, createdAt: v.createdAt } };
  });

  app.get('/kyc', { preHandler: requireAuth }, async (req) => {
    const v = await prisma.verification.findFirst({ where: { userId: uid(req) }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, note: true, createdAt: true, reviewedAt: true } });
    return { verification: v };
  });

  /* ───────── Agentlik kataloqu ───────── */
  app.get('/agencies', { preHandler: requireAuth }, async (req) => {
    const q = z.object({ q: z.string().max(40).optional() }).parse(req.query);
    const list = await prisma.agency.findMany({
      where: { status: 'ACTIVE', ...(q.q ? { name: { contains: q.q, mode: 'insensitive' as const } } : {}) },
      take: 60,
    });
    const cards = await Promise.all(list.map(agencyCard));
    cards.sort((a, b) => b.monthlyDiamonds - a.monthlyDiamonds || b.members - a.members);
    return { items: cards, tiers: AGENCY_TIERS };
  });

  app.get('/agencies/detail/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const a = await prisma.agency.findUnique({ where: { id } });
    if (!a || a.status !== 'ACTIVE') throw err.notFound('AGENCY_NOT_FOUND');
    const card = await agencyCard(a);
    const top = await prisma.user.findMany({ where: { agencyId: a.id }, orderBy: { totalEarned: 'desc' }, take: 6, select: { ...publicUserSelect, photos: true } });
    const owner = await prisma.user.findUnique({ where: { id: a.ownerId }, select: { ...publicUserSelect, photos: true } });
    const myReq = await prisma.agencyJoinRequest.findFirst({ where: { agencyId: a.id, userId: uid(req), status: 'PENDING' } });
    return { agency: card, owner: owner ? presentUser(owner) : null, topHosts: top.map((u) => presentUser(u)), requested: !!myReq };
  });

  /** Agentliyə müraciət — host şərtləri tamamlanmalıdır */
  app.post('/agencies/:id/apply', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ message: z.string().max(300).default('') }).parse(req.body ?? {});
    const a = await prisma.agency.findUnique({ where: { id } });
    if (!a || a.status !== 'ACTIVE') throw err.notFound('AGENCY_NOT_FOUND');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    if (user.agencyId) throw err.badRequest('ALREADY_IN_AGENCY');
    if (a.ownerId === me) throw err.badRequest('OWN_AGENCY');
    const reqs = await hostRequirements(me);
    if (!reqs.eligible) throw err.badRequest('HOST_REQUIREMENTS', { items: reqs.items });
    // Host müqaviləsi (müstəqil podratçı, cinsi xidmət qadağası, vergi) qəbul edilməlidir
    await assertHostAgreement(me);
    const pending = await prisma.agencyJoinRequest.findFirst({ where: { userId: me, status: 'PENDING' } });
    if (pending) throw err.badRequest('REQUEST_PENDING');
    const request = await prisma.agencyJoinRequest.create({ data: { agencyId: a.id, userId: me } });
    void notify(a.ownerId, 'agency', { actorId: me, body: b.message || undefined, data: { requestId: request.id } }).catch(() => {});
    return { request };
  });

  /** Agentlik sahibi: hostlar üçün standart qiymət və profil */
  app.patch('/agencies/me', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({
      defaultMsgPrice: z.number().int().min(ECONOMY.msgPrice.min).max(100).optional(),
      description: z.string().max(500).optional(),
      logoUrl: z.string().url().optional(),
      city: z.string().max(40).optional(),
    }).parse(req.body);
    const a = await prisma.agency.findUnique({ where: { ownerId: me } });
    if (!a) throw err.notFound('AGENCY_NOT_FOUND');
    const agency = await prisma.agency.update({ where: { id: a.id }, data: b });
    return { agency };
  });
}
