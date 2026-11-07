/**
 * Təhlükəsizlik API-si: razılıqlar, zəng/yayın kadr moderasiyası, kadrlı şikayət, admin moderasiya növbəsi.
 */
import fs from 'node:fs';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAdmin, requireAuth, uid } from '../lib/auth.js';
import {
  SAFETY, SAFETY_DOCS, SAFETY_REPORT_REASONS, acceptConsent, addStrike, audit, banUser, createSafetyReport, evidenceAbsPath,
  exportUserCase, liftSuspension, processFrame, reviewEvidence, safetyStatus, startSafetyJobs, suspendUser,
} from '../services/safety.js';
import { getModerationProvider } from '../services/safetyProviders.js';

const ctxSchema = z.object({ contextType: z.enum(['CALL', 'LIVE']), contextId: z.string().min(1).max(64) });

/** Multipart-dan yeganə şəkil faylını oxuyur (yoxdursa null) */
async function readImage(req: FastifyRequest): Promise<Buffer | null> {
  if (!req.isMultipart()) return null;
  const file = await req.file({ limits: { fileSize: 4 * 1024 * 1024 } });
  if (!file) return null;
  if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) throw err.badRequest('FILE_TYPE');
  const buf = await file.toBuffer();
  if (file.file.truncated) throw err.badRequest('FILE_TOO_LARGE');
  return buf;
}

export default async function safetyRoutes(app: FastifyInstance) {
  startSafetyJobs();

  /* ───────── İstifadəçi ───────── */

  app.get('/safety/me', { preHandler: requireAuth }, async (req) => safetyStatus(uid(req)));

  app.post('/safety/consent', { preHandler: requireAuth }, async (req) => {
    const b = z.object({ kind: z.enum(['VIDEO_MONITORING', 'HOST_AGREEMENT', 'AGENCY_AGREEMENT']), version: z.string().max(20) }).parse(req.body);
    return acceptConsent(uid(req), b.kind, b.version);
  });

  /**
   * Zəng / video yayın zamanı öz kameranın kadrı. multipart: file=<jpeg>; ?contextType=CALL|LIVE&contextId=...
   * Cavab: { verdict, action } — action: NONE | QUEUED | WARNED | ENDED
   */
  app.post('/safety/frames', { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req) => {
    const q = ctxSchema.parse(req.query);
    const image = await readImage(req);
    if (!image) throw err.badRequest('FILE_REQUIRED');
    return processFrame(uid(req), q.contextType, q.contextId, image);
  });

  /**
   * Zəng / yayın daxilində şikayət. Şəkil (qarşı tərəfin videosunun kadrı) istəyə görə — multipart; sahələr query-dədir.
   * Şəkilsiz: JSON gövdə.
   */
  app.post('/safety/reports', { preHandler: requireAuth, config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req) => {
    const schema = ctxSchema.extend({
      targetUserId: z.string().min(1),
      reason: z.enum(SAFETY_REPORT_REASONS),
      details: z.string().max(500).default(''),
    });
    const multipart = req.isMultipart();
    const b = schema.parse(multipart ? req.query : req.body);
    const image = multipart ? await readImage(req) : null;
    return createSafetyReport({ reporterId: uid(req), ...b, image });
  });

  /* ───────── Admin: moderasiya növbəsi ───────── */

  app.get('/admin/safety/stats', { preHandler: requireAdmin }, async () => {
    const day = new Date(Date.now() - 86400_000);
    const [pending, violations24h, strikes24h, suspended, banned, holds, urgentReports] = await Promise.all([
      prisma.safetyEvidence.count({ where: { reviewStatus: 'PENDING', filePath: { not: null } } }),
      prisma.safetyEvidence.count({ where: { verdict: 'VIOLATION', createdAt: { gte: day } } }),
      prisma.safetyStrike.count({ where: { createdAt: { gte: day } } }),
      prisma.safetyProfile.count({ where: { suspensionActive: true } }),
      prisma.safetyProfile.count({ where: { permanentBan: true } }),
      prisma.safetyEvidence.count({ where: { legalHold: true } }),
      prisma.report.count({ where: { status: 'OPEN', reason: 'UNDERAGE' } }),
    ]);
    return { pending, violations24h, strikes24h, suspended, banned, holds, urgentReports, provider: getModerationProvider().name, thresholds: { block: SAFETY.blockScore, review: SAFETY.reviewScore, endAfter: SAFETY.endAfter, strikesToSuspend: SAFETY.strikesToSuspend }, docs: SAFETY_DOCS };
  });

  app.get('/admin/safety/queue', { preHandler: requireAdmin }, async (req) => {
    const q = z.object({
      status: z.enum(['PENDING', 'CONFIRMED', 'DISMISSED', 'ALL']).default('PENDING'),
      verdict: z.enum(['VIOLATION', 'SUSPECT', 'UNSCANNED', 'SAFE', 'ALL']).default('ALL'),
      userId: z.string().optional(),
      take: z.coerce.number().int().min(1).max(200).default(100),
    }).parse(req.query);
    const items = await prisma.safetyEvidence.findMany({
      where: {
        ...(q.status !== 'ALL' ? { reviewStatus: q.status } : {}),
        ...(q.verdict !== 'ALL' ? { verdict: q.verdict } : {}),
        ...(q.userId ? { subjectId: q.userId } : {}),
      },
      // Azyaşlı şübhəsi (legalHold) və pozuntular birinci
      orderBy: [{ legalHold: 'desc' }, { maxScore: 'desc' }, { createdAt: 'desc' }],
      take: q.take,
    });
    const ids = [...new Set(items.flatMap((e) => [e.subjectId, e.reporterId, e.peerId].filter((x): x is string => !!x)))];
    const [users, profiles, reports] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, shortId: true, name: true, avatarUrl: true, banned: true, hostStatus: true, gender: true, birthDate: true } }),
      prisma.safetyProfile.findMany({ where: { userId: { in: ids } } }),
      prisma.report.findMany({ where: { id: { in: items.map((e) => e.reportId).filter((x): x is string => !!x) } } }),
    ]);
    const um = new Map(users.map((u) => [u.id, u]));
    const pm = new Map(profiles.map((p) => [p.userId, p]));
    const rm = new Map(reports.map((r) => [r.id, r]));
    return {
      items: items.map((e) => ({
        ...e, filePath: undefined, hasImage: !!e.filePath,
        subject: um.get(e.subjectId) ?? null, subjectSafety: pm.get(e.subjectId) ?? null,
        reporter: e.reporterId ? um.get(e.reporterId) ?? null : null, peer: e.peerId ? um.get(e.peerId) ?? null : null,
        report: e.reportId ? rm.get(e.reportId) ?? null : null,
      })),
    };
  });

  /** Sübut şəkli — yalnız admin, ictimai URL yoxdur; hər baxış jurnala yazılır */
  app.get('/admin/safety/evidence/:id/image', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const ev = await prisma.safetyEvidence.findUnique({ where: { id } });
    const abs = evidenceAbsPath(ev?.filePath ?? null);
    if (!ev || !abs) throw err.notFound('EVIDENCE_NOT_FOUND');
    await audit('EVIDENCE_VIEWED', ev.subjectId, { evidenceId: id }, uid(req));
    reply.header('Cache-Control', 'no-store').header('Content-Type', 'image/jpeg');
    return reply.send(fs.createReadStream(abs));
  });

  app.post('/admin/safety/evidence/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ action: z.enum(['CONFIRM', 'DISMISS', 'BAN', 'HOLD', 'RELEASE_HOLD']), note: z.string().max(500).default('') }).parse(req.body);
    return reviewEvidence(id, b.action, uid(req), b.note);
  });

  app.get('/admin/safety/users/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const [user, profile, strikes, ageChecks, evidence] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { id: true, shortId: true, name: true, avatarUrl: true, banned: true, hostStatus: true, kycStatus: true, birthDate: true } }),
      prisma.safetyProfile.findUnique({ where: { userId: id } }),
      prisma.safetyStrike.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.ageCheck.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.safetyEvidence.count({ where: { subjectId: id } }),
    ]);
    if (!user) throw err.notFound();
    return { user, profile, strikes, ageChecks, evidenceCount: evidence };
  });

  app.post('/admin/safety/users/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ action: z.enum(['STRIKE', 'SUSPEND', 'UNSUSPEND', 'BAN']), days: z.number().int().min(1).max(365).default(7), reason: z.string().max(200).default('MODERATOR') }).parse(req.body);
    const actor = uid(req);
    if (b.action === 'STRIKE') return addStrike(id, b.reason, { source: 'ADMIN', actorId: actor });
    if (b.action === 'SUSPEND') return { until: await suspendUser(id, b.days, b.reason, actor) };
    if (b.action === 'BAN') { await banUser(id, b.reason, actor); return { ok: true }; }
    return { ok: await liftSuspension(id, actor) };
  });

  /** Hüquq-mühafizə orqanının rəsmi sorğusu: ?ref=<sorğu nömrəsi>&hold=1 (sübutlar silinməsin) */
  app.get('/admin/safety/users/:id/export', { preHandler: requireAdmin }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const q = z.object({ ref: z.string().min(1).max(120), hold: z.enum(['0', '1']).default('1') }).parse(req.query);
    return exportUserCase(id, uid(req), q.ref, q.hold === '1');
  });

  app.get('/admin/safety/audit', { preHandler: requireAdmin }, async (req) => {
    const q = z.object({ userId: z.string().optional(), take: z.coerce.number().int().min(1).max(500).default(200) }).parse(req.query);
    const items = await prisma.safetyAuditLog.findMany({ where: q.userId ? { targetUserId: q.userId } : {}, orderBy: { createdAt: 'desc' }, take: q.take });
    return { items };
  });
}
