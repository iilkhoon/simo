/**
 * Təhlükəsizlik xidməti — 1-ə-1 görüntülü zənglərdə və video yayınlarda istifadəçi davranışının moderasiyası.
 *
 * Hüquqi müdafiə üçün platforma: (a) qadağanı müqavilə ilə qoyur (Şərtlər, İcma qaydaları, Host/Agentlik müqaviləsi),
 * (b) aktiv moderasiya edir (bu fayl: kadr yoxlaması), (c) şikayətlərə tez reaksiya verir, (d) sübut və jurnal saxlayır,
 * (e) hüquq-mühafizə orqanları ilə əməkdaşlıq edir (ixrac + legalHold). Ətraflı: docs/legal/SAFETY_COMPLIANCE.md
 *
 * Axın: müştəri hər 10–20 saniyədən bir (təsadüfi) ÖZ kamerasının kiçik kadrını göndərir → provayder (Sightengine /
 * Rekognition / none) → qərar. Pozuntuda: qarşı tərəfdə video dərhal bulanıqlaşır, göndərənə xəbərdarlıq, strike;
 * eyni zəngdə təkrar aşkarlanarsa zəng bitirilir (ödəyən üçün pozuntu hissəsi geri qaytarılır), N strike → dayandırma.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { err } from '../lib/errors.js';
import { ageFrom } from '../economy.js';
import { frameVerdict, strikeAction, type FrameVerdict, type StrikeAction } from '../lib/moderation.js';
import { emitToRoom, emitToUser, disconnectUser } from '../realtime/hub.js';
import { getRoom } from '../realtime/liveState.js';
import { finishCall } from './calls.js';
import { endLive } from './live.js';
import { creditCoins } from './wallet.js';
import { getModerationProvider } from './safetyProviders.js';

const num = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] !== '' && process.env[name] !== undefined ? v : fallback;
};

/** Parametrlər env ilə dəyişdirilə bilər (rəqəmlər — sənədləşdirilmiş standart siyasət) */
export const SAFETY = {
  get blockScore() { return num('SAFETY_BLOCK_SCORE', 0.8); },
  get reviewScore() { return num('SAFETY_REVIEW_SCORE', 0.5); },
  /** Eyni zəngdə/yayında neçənci aşkarlamada zəng bitirilir */
  get endAfter() { return Math.max(1, num('SAFETY_END_AFTER', 2)); },
  /** Neçə aktiv strike-da müvəqqəti dayandırma (2× — daimi blok) */
  get strikesToSuspend() { return Math.max(1, num('SAFETY_STRIKES_TO_SUSPEND', 3)); },
  get suspendDays() { return num('SAFETY_SUSPEND_DAYS', 7); },
  get strikeTtlDays() { return num('SAFETY_STRIKE_TTL_DAYS', 180); },
  get blurSeconds() { return num('SAFETY_BLUR_SECONDS', 20); },
  get frameMinSec() { return num('SAFETY_FRAME_MIN_SEC', 10); },
  get frameMaxSec() { return num('SAFETY_FRAME_MAX_SEC', 20); },
  /** "none" rejimində yoxlanılmamış kadrların hansı hissəsi insan baxışı üçün saxlanılır (0..1) */
  get queueSample() { return num('SAFETY_QUEUE_SAMPLE', 0.25); },
  /** Eyni istifadəçiyə 24 saatda neçə fərqli şikayətçi (çılpaqlıq/azyaşlı) — baxışa qədər müvəqqəti dayandırma */
  get reportsToSuspend() { return Math.max(2, num('SAFETY_REPORTS_TO_SUSPEND', 3)); },
  get evidenceDir() { return path.resolve(process.env.SAFETY_EVIDENCE_DIR ?? path.join(config.uploadDir, '..', 'safety-evidence')); },
  /** Saxlama müddətləri (gün) */
  retention: {
    get unscanned() { return num('SAFETY_RETENTION_UNSCANNED_DAYS', 3); },
    get suspect() { return num('SAFETY_RETENTION_SUSPECT_DAYS', 30); },
    get violation() { return num('SAFETY_RETENTION_VIOLATION_DAYS', 180); },
    get confirmed() { return num('SAFETY_RETENTION_CONFIRMED_DAYS', 365); },
    get dismissed() { return num('SAFETY_RETENTION_DISMISSED_DAYS', 7); },
  },
};

/** Sənəd versiyaları — mətn dəyişəndə yenilənir, istifadəçidən yenidən razılıq istənir */
export const SAFETY_DOCS = {
  VIDEO_MONITORING: '2026-11-06',
  HOST_AGREEMENT: '2026-11-06',
  AGENCY_AGREEMENT: '2026-11-06',
} as const;
export type ConsentKind = keyof typeof SAFETY_DOCS;

const days = (n: number) => new Date(Date.now() + n * 86400_000);

export async function audit(action: string, targetUserId: string | null, data: Record<string, unknown> = {}, actorId?: string | null) {
  await prisma.safetyAuditLog.create({ data: { action, targetUserId, actorId: actorId ?? null, data: data as object } }).catch(() => {});
}

export async function getProfile(userId: string) {
  return prisma.safetyProfile.upsert({ where: { userId }, create: { userId }, update: {} });
}

/* ───────── Razılıqlar ───────── */

export async function safetyStatus(userId: string) {
  const p = await getProfile(userId);
  const provider = getModerationProvider().name;
  return {
    videoNoticeAccepted: !!p.videoNoticeAt && p.videoNoticeVersion === SAFETY_DOCS.VIDEO_MONITORING,
    hostAgreementAccepted: !!p.hostAgreementAt && p.hostAgreementVersion === SAFETY_DOCS.HOST_AGREEMENT,
    agencyAgreementAccepted: !!p.agencyAgreementAt && p.agencyAgreementVersion === SAFETY_DOCS.AGENCY_AGREEMENT,
    versions: SAFETY_DOCS,
    strikes: p.strikes,
    strikesToSuspend: SAFETY.strikesToSuspend,
    suspendedUntil: p.suspensionActive ? p.suspendedUntil : null,
    monitoring: {
      enabled: provider !== 'none' || SAFETY.queueSample > 0,
      provider,
      minSec: SAFETY.frameMinSec,
      maxSec: Math.max(SAFETY.frameMinSec, SAFETY.frameMaxSec),
    },
  };
}

export async function acceptConsent(userId: string, kind: ConsentKind, version: string) {
  if (version !== SAFETY_DOCS[kind]) throw err.badRequest('DOC_VERSION', { current: SAFETY_DOCS[kind] });
  const now = new Date();
  const data =
    kind === 'VIDEO_MONITORING' ? { videoNoticeAt: now, videoNoticeVersion: version }
      : kind === 'HOST_AGREEMENT' ? { hostAgreementAt: now, hostAgreementVersion: version }
        : { agencyAgreementAt: now, agencyAgreementVersion: version };
  await prisma.safetyProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  await audit('CONSENT', userId, { kind, version });
  return safetyStatus(userId);
}

export async function assertHostAgreement(userId: string) {
  const p = await getProfile(userId);
  if (!p.hostAgreementAt || p.hostAgreementVersion !== SAFETY_DOCS.HOST_AGREEMENT) throw err.badRequest('HOST_AGREEMENT_REQUIRED', { version: SAFETY_DOCS.HOST_AGREEMENT });
}

export async function assertAgencyAgreement(userId: string) {
  const p = await getProfile(userId);
  if (!p.agencyAgreementAt || p.agencyAgreementVersion !== SAFETY_DOCS.AGENCY_AGREEMENT) throw err.badRequest('AGENCY_AGREEMENT_REQUIRED', { version: SAFETY_DOCS.AGENCY_AGREEMENT });
}

/* ───────── Yaş təminatı ───────── */

/** Qeydiyyatda 18-dən kiçik doğum tarixi: hesab bloklanır (sonradan başqa tarix yazmaqla keçmək olmur) */
export async function recordSelfDeclaredMinor(userId: string, birthDate: Date) {
  const now = new Date();
  await prisma.$transaction([
    prisma.ageCheck.create({ data: { userId, source: 'SELF_DECLARED', declaredBirthDate: birthDate, ageYears: ageFrom(birthDate), passed: false } }),
    prisma.safetyProfile.upsert({
      where: { userId },
      create: { userId, declaredMinorAt: now, suspensionActive: false, suspendReason: 'MINOR' },
      update: { declaredMinorAt: now, suspendReason: 'MINOR' },
    }),
    prisma.user.update({ where: { id: userId }, data: { banned: true, online: false } }),
  ]);
  await audit('MINOR_SELF_DECLARED', userId, { birthDate });
  emitToUser(userId, 'force-logout', { reason: 'UNDERAGE' });
}

export async function assertNotDeclaredMinor(userId: string) {
  const p = await prisma.safetyProfile.findUnique({ where: { userId } });
  if (p?.declaredMinorAt) throw err.forbidden('UNDERAGE_LOCKED');
}

/**
 * Host təsdiqindən əvvəl: hesabdakı VƏ şəxsiyyət sənədindəki (KYC) doğum tarixinə görə 18+.
 * Sənəd yoxdursa və ya rədd edilibsə — host təsdiqlənə bilməz. Hər yoxlama AgeCheck kimi yazılır.
 */
export async function assertHostAgeEligible(userId: string, actorId?: string | null) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { birthDate: true } });
  const v = await prisma.verification.findFirst({ where: { userId, status: { in: ['PENDING', 'APPROVED'] } }, orderBy: { createdAt: 'desc' } });
  const accountAge = ageFrom(u.birthDate);
  const idAge = v ? ageFrom(v.birthDate) : null;
  const sameDob = !!(v && u.birthDate && v.birthDate.toISOString().slice(0, 10) === u.birthDate.toISOString().slice(0, 10));
  const passed = !!v && (idAge ?? 0) >= 18 && (accountAge ?? 18) >= 18;
  await prisma.ageCheck.create({
    data: {
      userId, verificationId: v?.id ?? null, source: 'HOST_APPROVAL', declaredBirthDate: u.birthDate, idBirthDate: v?.birthDate ?? null,
      ageYears: idAge, passed, actorId: actorId ?? null, note: !v ? 'NO_ID' : sameDob ? '' : 'DOB_MISMATCH',
    },
  });
  if (!v) throw err.badRequest('HOST_KYC_REQUIRED');
  if (!passed) {
    await audit('HOST_AGE_REJECTED', userId, { idAge, accountAge }, actorId);
    throw err.badRequest('UNDERAGE');
  }
}

/** Admin KYC-ni təsdiqləyəndə: sənəddəki doğum tarixi 18+ olmalıdır (qeyd yazılır) */
export async function assertKycAdult(verificationId: string, actorId?: string | null) {
  const v = await prisma.verification.findUniqueOrThrow({ where: { id: verificationId } });
  const age = ageFrom(v.birthDate);
  const passed = (age ?? 0) >= 18;
  await prisma.ageCheck.create({ data: { userId: v.userId, verificationId: v.id, source: 'KYC_REVIEW', idBirthDate: v.birthDate, ageYears: age, passed, actorId: actorId ?? null } });
  if (!passed) throw err.badRequest('UNDERAGE');
}

/* ───────── Strike, dayandırma, blok ───────── */

async function activeStrikeCount(userId: string) {
  return prisma.safetyStrike.count({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } } });
}

async function syncStrikeCount(userId: string) {
  const n = await activeStrikeCount(userId);
  await prisma.safetyProfile.upsert({ where: { userId }, create: { userId, strikes: n }, update: { strikes: n } });
  return n;
}

/** Aktiv zəngləri və yayınları bağlayır (dayandırma/blok zamanı) */
async function endActiveSessions(userId: string, reason: string) {
  const calls = await prisma.call.findMany({ where: { status: { in: ['ACTIVE', 'RINGING'] }, OR: [{ callerId: userId }, { calleeId: userId }] }, select: { id: true, status: true } });
  for (const c of calls) await finishCall(c.id, c.status === 'ACTIVE' ? 'ENDED' : 'CANCELLED', reason).catch(() => {});
  const lives = await prisma.liveRoom.findMany({ where: { hostId: userId, status: 'LIVE' }, select: { id: true } });
  for (const l of lives) await endLive(l.id, 'MODERATION').catch(() => {});
}

export async function suspendUser(userId: string, durationDays: number, reason: string, actorId?: string | null) {
  const until = days(durationDays);
  await prisma.$transaction([
    prisma.safetyProfile.upsert({
      where: { userId },
      create: { userId, suspendedUntil: until, suspensionActive: true, suspendReason: reason },
      update: { suspendedUntil: until, suspensionActive: true, suspendReason: reason },
    }),
    prisma.user.update({ where: { id: userId }, data: { banned: true, online: false } }),
  ]);
  await audit('SUSPEND', userId, { until, reason }, actorId);
  emitToUser(userId, 'force-logout', { reason: 'SUSPENDED', until });
  await endActiveSessions(userId, 'SAFETY_SUSPENDED');
  return until;
}

export async function banUser(userId: string, reason: string, actorId?: string | null) {
  await prisma.$transaction([
    prisma.safetyProfile.upsert({
      where: { userId },
      create: { userId, permanentBan: true, suspensionActive: false, suspendReason: reason },
      update: { permanentBan: true, suspensionActive: false, suspendReason: reason },
    }),
    prisma.user.update({ where: { id: userId }, data: { banned: true, online: false } }),
  ]);
  await audit('BAN', userId, { reason }, actorId);
  emitToUser(userId, 'force-logout', { reason: 'BANNED' });
  await prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
  disconnectUser(userId);
  await endActiveSessions(userId, 'SAFETY_BANNED');
}

export async function liftSuspension(userId: string, actorId?: string | null) {
  const p = await getProfile(userId);
  if (p.permanentBan || p.declaredMinorAt) return false;
  await prisma.$transaction([
    prisma.safetyProfile.update({ where: { userId }, data: { suspensionActive: false, suspendedUntil: null } }),
    prisma.user.update({ where: { id: userId }, data: { banned: false } }),
  ]);
  await audit('UNSUSPEND', userId, {}, actorId);
  return true;
}

/** Müddəti bitmiş dayandırmaları götürür (daimi blok və azyaşlı bloku istisna) */
export async function liftExpiredSuspensions() {
  const due = await prisma.safetyProfile.findMany({ where: { suspensionActive: true, permanentBan: false, declaredMinorAt: null, suspendedUntil: { lt: new Date() } }, select: { userId: true } });
  for (const d of due) await liftSuspension(d.userId, null);
  return due.length;
}

export interface StrikeOpts {
  source?: 'AUTO' | 'ADMIN' | 'REPORTS';
  contextType?: string;
  contextId?: string;
  evidenceId?: string;
  actorId?: string | null;
}

/**
 * Strike yazır və pilləyə görə tədbir görür. Avtomatik strike eyni zəng/yayın üçün bir dəfə yazılır
 * (bir zəngdə 5 kadr = 1 strike; təkrar aşkarlama zəngi bitirir).
 */
export async function addStrike(userId: string, reason: string, o: StrikeOpts = {}): Promise<{ created: boolean; strikes: number; action: StrikeAction | 'NONE' }> {
  if (o.contextType && o.contextId) {
    const dup = await prisma.safetyStrike.findFirst({ where: { userId, contextType: o.contextType, contextId: o.contextId, revokedAt: null } });
    if (dup) return { created: false, strikes: await activeStrikeCount(userId), action: 'NONE' };
  }
  await prisma.safetyStrike.create({
    data: {
      userId, reason, source: o.source ?? 'AUTO', contextType: o.contextType, contextId: o.contextId, evidenceId: o.evidenceId,
      actorId: o.actorId ?? null, expiresAt: days(SAFETY.strikeTtlDays),
    },
  });
  const strikes = await syncStrikeCount(userId);
  await prisma.safetyProfile.update({ where: { userId }, data: { lastStrikeAt: new Date() } });
  const action = strikeAction(strikes, SAFETY.strikesToSuspend);
  await audit('STRIKE', userId, { reason, strikes, action, ...o }, o.actorId);
  if (action === 'BAN') await banUser(userId, `STRIKES:${reason}`, o.actorId);
  else if (action === 'SUSPEND') await suspendUser(userId, SAFETY.suspendDays, `STRIKES:${reason}`, o.actorId);
  else emitToUser(userId, 'safety:strike', { strikes, strikesToSuspend: SAFETY.strikesToSuspend, reason });
  return { created: true, strikes, action };
}

/** Sübuta bağlı strike-ları ləğv edir (moderator yanlış pozitiv dedikdə) */
export async function revokeStrikesForEvidence(evidenceId: string, actorId?: string | null) {
  const ev = await prisma.safetyEvidence.findUniqueOrThrow({ where: { id: evidenceId } });
  const res = await prisma.safetyStrike.updateMany({
    where: { userId: ev.subjectId, revokedAt: null, OR: [{ evidenceId }, { contextType: ev.contextType, contextId: ev.contextId, source: 'AUTO' }] },
    data: { revokedAt: new Date() },
  });
  if (res.count) {
    const n = await syncStrikeCount(ev.subjectId);
    await audit('STRIKE_REVOKED', ev.subjectId, { evidenceId, revoked: res.count, strikes: n }, actorId);
    // Yalnız avtomatik strike səbəbindən dayandırılıbsa və hədd aşağı düşübsə — dayandırmanı götür
    const p = await getProfile(ev.subjectId);
    if (p.suspensionActive && p.suspendReason?.startsWith('STRIKES:') && n < SAFETY.strikesToSuspend) await liftSuspension(ev.subjectId, actorId);
  }
  return res.count;
}

/* ───────── Sübut faylları ───────── */

export function retentionDays(verdict: FrameVerdict, kind: string) {
  if (kind === 'REPORT_FRAME') return SAFETY.retention.violation;
  if (verdict === 'VIOLATION') return SAFETY.retention.violation;
  if (verdict === 'SUSPECT') return SAFETY.retention.suspect;
  return SAFETY.retention.unscanned;
}

async function writeEvidenceFile(image: Buffer) {
  const sub = new Date().toISOString().slice(0, 7);
  const dir = path.join(SAFETY.evidenceDir, sub);
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  const name = `${crypto.randomBytes(16).toString('hex')}.jpg`;
  await fs.promises.writeFile(path.join(dir, name), image, { mode: 0o600 });
  return { rel: `${sub}/${name}`, sha256: crypto.createHash('sha256').update(image).digest('hex') };
}

export function evidenceAbsPath(rel: string | null) {
  if (!rel) return null;
  const abs = path.resolve(SAFETY.evidenceDir, rel);
  if (!abs.startsWith(SAFETY.evidenceDir + path.sep)) return null;
  return fs.existsSync(abs) ? abs : null;
}

/** Müddəti bitmiş sübut fayllarını silir (metadata — ballar, hash, qərar — jurnal kimi qalır). legalHold silinmir. */
export async function sweepEvidence() {
  const rows = await prisma.safetyEvidence.findMany({ where: { expiresAt: { lt: new Date() }, legalHold: false, filePath: { not: null } }, take: 500, select: { id: true, filePath: true } });
  for (const r of rows) {
    const abs = evidenceAbsPath(r.filePath);
    if (abs) await fs.promises.rm(abs, { force: true }).catch(() => {});
    await prisma.safetyEvidence.update({ where: { id: r.id }, data: { filePath: null } });
  }
  return rows.length;
}

/** Yüklənmiş şəkli normallaşdırır: EXIF/metadata silinir, ən çox 640px JPEG */
export async function normalizeImage(buf: Buffer) {
  if (!buf.length || buf.length > 4 * 1024 * 1024) throw err.badRequest('BAD_IMAGE');
  try {
    return await sharp(buf).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
  } catch {
    throw err.badRequest('BAD_IMAGE');
  }
}

async function scan(image: Buffer) {
  const p = getModerationProvider();
  try {
    const r = await p.moderate(image);
    return { provider: r.provider, scores: r.scores, raw: r.raw, error: null as string | null };
  } catch (e) {
    return { provider: p.name, scores: null, raw: null, error: (e as Error).message.slice(0, 200) };
  }
}

/* ───────── Kontekst (zəng / yayın) ───────── */

export type ContextType = 'CALL' | 'LIVE';

interface Ctx {
  type: ContextType;
  id: string;
  channel: string;
  /** Kadrı görən digər tərəflər (zəngdə qarşı tərəf) */
  peers: string[];
  call?: { id: string; callerId: string; calleeId: string; startedAt: Date | null };
  roomId?: string;
}

/** İstifadəçinin həmin zəngdə/yayında video yayımlayan iştirakçı olduğunu yoxlayır */
export async function resolveContext(userId: string, type: ContextType, id: string, requirePublisher = true): Promise<Ctx> {
  if (type === 'CALL') {
    const c = await prisma.call.findUnique({ where: { id } });
    if (!c || (c.callerId !== userId && c.calleeId !== userId)) throw err.notFound('CALL_NOT_FOUND');
    if (requirePublisher && (c.status !== 'ACTIVE' || c.type !== 'VIDEO')) throw err.badRequest('CALL_NOT_ACTIVE');
    return { type, id, channel: c.channel, peers: [c.callerId === userId ? c.calleeId : c.callerId], call: { id: c.id, callerId: c.callerId, calleeId: c.calleeId, startedAt: c.startedAt } };
  }
  const r = await prisma.liveRoom.findUnique({ where: { id } });
  if (!r) throw err.notFound('LIVE_NOT_FOUND');
  if (requirePublisher) {
    const isPublisher = r.hostId === userId || getRoom(id)?.guests.get(userId) === 'VIDEO';
    if (r.status !== 'LIVE' || r.type !== 'VIDEO' || !isPublisher) throw err.badRequest('LIVE_NOT_ACTIVE');
  }
  return { type, id, channel: r.channel, peers: [], roomId: r.id };
}

/* ───────── Agora: server tərəfdən video yayımını kəsmək (istəyə görə) ───────── */

/**
 * Agora RESTful "kicking-rule": müştəri dəyişdirilmiş olsa belə, pozucunun video yayımını/kanala qoşulmasını müvəqqəti qadağan edir.
 * AGORA_CUSTOMER_ID və AGORA_CUSTOMER_SECRET (Agora Console → RESTful API) verilməsə heç nə etmir.
 */
export async function agoraRestrict(channel: string, uid: number, privileges: ('publish_video' | 'join_channel')[], seconds: number) {
  const id = process.env.AGORA_CUSTOMER_ID;
  const secret = process.env.AGORA_CUSTOMER_SECRET;
  if (!id || !secret || !config.agora.appId) return false;
  try {
    const res = await fetch('https://api.agora.io/dev/v1/kicking-rule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` },
      body: JSON.stringify({ appid: config.agora.appId, cname: channel, uid, time_in_seconds: Math.max(60, Math.round(seconds)), privileges }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ───────── Zəng ödənişi: pozuntu hissəsinin qaytarılması ───────── */

/**
 * Qərar (docs/legal/SAFETY_COMPLIANCE.md §6): pozucu QƏBUL EDƏN (host) olduqda, ödəyənə ilk aşkarlamanın düşdüyü
 * dəqiqədən sonrakı bütün dəqiqələr qaytarılır, hostun həmin dəqiqələrdən qazancı geri alınır (balans çatdıqca).
 * Pozucu ödəyənin özüdürsə — qaytarılma yoxdur (zəng sadəcə bitir, ödəniş dayanır). İdempotentdir.
 */
export async function refundViolatingSegment(callId: string, offenderId: string, since: Date, actorId?: string | null) {
  const call = await prisma.call.findUnique({ where: { id: callId } });
  if (!call || call.calleeId !== offenderId || call.pricePerMin <= 0) return { refunded: 0, clawedBack: 0 };
  const cutoff = new Date(since.getTime() - 60_000);
  return prisma.$transaction(async (tx) => {
    const done = await tx.walletTransaction.findFirst({ where: { userId: call.callerId, type: 'SAFETY_REFUND', refId: callId } });
    if (done) return { refunded: 0, clawedBack: 0 };
    const spent = await tx.walletTransaction.findMany({ where: { userId: call.callerId, type: 'CALL_SPENT', refId: callId, createdAt: { gte: cutoff } } });
    let paid = 0;
    let promo = 0;
    for (const s of spent) {
      const amount = -s.amount;
      const p = Math.min(amount, Number(/promo:(\d+)/.exec(s.note)?.[1] ?? 0));
      promo += p;
      paid += amount - p;
    }
    if (paid > 0) await creditCoins(tx, call.callerId, paid, 'SAFETY_REFUND', callId, 'violation');
    if (promo > 0) await creditCoins(tx, call.callerId, promo, 'SAFETY_REFUND', callId, 'violation', true);
    // Host qazancını geri al (yalnız qazanılmış Almaz, mənfiyə düşmədən)
    const earned = await tx.walletTransaction.aggregate({ where: { userId: offenderId, type: 'CALL_EARNED', refId: callId, createdAt: { gte: cutoff } }, _sum: { amount: true } });
    const want = earned._sum.amount ?? 0;
    let clawedBack = 0;
    if (want > 0) {
      const h = await tx.user.findUniqueOrThrow({ where: { id: offenderId }, select: { diamonds: true, diamondsBought: true } });
      clawedBack = Math.max(0, Math.min(want, h.diamonds - h.diamondsBought));
      if (clawedBack > 0) {
        const u = await tx.user.update({ where: { id: offenderId }, data: { diamonds: { decrement: clawedBack }, totalEarned: { decrement: clawedBack } }, select: { diamonds: true } });
        await tx.walletTransaction.create({ data: { userId: offenderId, currency: 'DIAMOND', amount: -clawedBack, balanceAfter: u.diamonds, type: 'SAFETY_CLAWBACK', refId: callId, note: want > clawedBack ? `owed:${want - clawedBack}` : '' } });
      }
    }
    return { refunded: paid + promo, clawedBack };
  }).then(async (r) => {
    if (r.refunded > 0) {
      const u = await prisma.user.findUnique({ where: { id: call.callerId }, select: { coins: true } });
      if (u) emitToUser(call.callerId, 'wallet:update', { coins: u.coins });
      await audit('CALL_REFUND', call.callerId, { callId, offenderId, ...r }, actorId);
    }
    return r;
  });
}

/* ───────── Pozuntuya reaksiya ───────── */

export interface ViolationOutcome {
  count: number;
  ended: boolean;
  strike: { created: boolean; strikes: number; action: StrikeAction | 'NONE' };
}

/**
 * Avtomatik təsdiqlənmiş pozuntu (və ya şikayət kadrında yüksək bal): qarşı tərəfdə bulanıqlaşdır, xəbərdar et,
 * strike yaz, təkrar olduqda zəngi/yayını bitir.
 */
export async function handleViolation(subjectId: string, ctx: Ctx, evidenceId: string): Promise<ViolationOutcome> {
  const count = await prisma.safetyEvidence.count({ where: { subjectId, contextType: ctx.type, contextId: ctx.id, verdict: 'VIOLATION', reviewStatus: { not: 'DISMISSED' } } });
  const endNow = count >= SAFETY.endAfter;
  const blur = { contextType: ctx.type, contextId: ctx.id, offenderId: subjectId, seconds: SAFETY.blurSeconds, ended: endNow };
  if (ctx.type === 'CALL') for (const p of ctx.peers) emitToUser(p, 'safety:blur', blur);
  else emitToRoom(`live:${ctx.id}`, 'safety:blur', blur);
  emitToUser(subjectId, 'safety:warning', { contextType: ctx.type, contextId: ctx.id, count, endAfter: SAFETY.endAfter, ended: endNow, seconds: SAFETY.blurSeconds });

  const shortId = (await prisma.user.findUnique({ where: { id: subjectId }, select: { shortId: true } }))?.shortId;
  if (shortId != null) void agoraRestrict(ctx.channel, shortId, endNow ? ['join_channel'] : ['publish_video'], endNow ? 300 : SAFETY.blurSeconds);

  const strike = await addStrike(subjectId, 'NUDITY_AUTO', { source: 'AUTO', contextType: ctx.type, contextId: ctx.id, evidenceId });
  let ended = strike.action === 'SUSPEND' || strike.action === 'BAN';
  if (endNow && !ended) {
    if (ctx.type === 'CALL') await finishCall(ctx.id, 'ENDED', 'SAFETY_VIOLATION').catch(() => null);
    else await endLive(ctx.id, 'MODERATION').catch(() => false);
    ended = true;
  }
  if (ended && ctx.call) {
    const first = await prisma.safetyEvidence.findFirst({ where: { subjectId, contextType: 'CALL', contextId: ctx.id, verdict: 'VIOLATION' }, orderBy: { createdAt: 'asc' } });
    await refundViolatingSegment(ctx.id, subjectId, first?.createdAt ?? new Date());
  }
  await audit('AUTO_VIOLATION', subjectId, { contextType: ctx.type, contextId: ctx.id, evidenceId, count, ended });
  return { count, ended, strike };
}

/* ───────── Kadr emalı ───────── */

export async function processFrame(userId: string, type: ContextType, contextId: string, upload: Buffer) {
  const ctx = await resolveContext(userId, type, contextId, true);
  const image = await normalizeImage(upload);
  const s = await scan(image);
  const verdict = frameVerdict(s.scores, { block: SAFETY.blockScore, review: SAFETY.reviewScore });
  const maxScore = s.scores ? Math.max(s.scores.sexual, s.scores.suggestive) : 0;
  if (verdict === 'SAFE') return { verdict, action: 'NONE' as const };
  // Açarsız rejimdə hər kadr saxlanılmır — seçmə ilə insan baxışına
  if (verdict === 'UNSCANNED' && Math.random() >= SAFETY.queueSample) return { verdict, action: 'NONE' as const };
  const file = await writeEvidenceFile(image);
  const ev = await prisma.safetyEvidence.create({
    data: {
      kind: 'AUTO_FRAME', contextType: type, contextId, subjectId: userId, peerId: ctx.peers[0] ?? null,
      filePath: file.rel, sha256: file.sha256, provider: s.provider, scores: { ...(s.scores ?? {}), ...(s.error ? { error: s.error } : {}), raw: (s.raw ?? null) as object } as object,
      maxScore, verdict, expiresAt: days(retentionDays(verdict, 'AUTO_FRAME')),
    },
  });
  if (verdict !== 'VIOLATION') return { verdict, action: 'QUEUED' as const, evidenceId: ev.id };
  const out = await handleViolation(userId, ctx, ev.id);
  return { verdict, action: out.ended ? ('ENDED' as const) : ('WARNED' as const), evidenceId: ev.id, count: out.count, strikes: out.strike.strikes };
}

/* ───────── Zəng / yayın daxilində şikayət (qarşı tərəfin kadrı ilə) ───────── */

export const SAFETY_REPORT_REASONS = ['NUDITY', 'UNDERAGE', 'HARASSMENT', 'SCAM', 'VIOLENCE', 'SPAM', 'OTHER'] as const;
export type SafetyReportReason = (typeof SAFETY_REPORT_REASONS)[number];

export async function createSafetyReport(p: { reporterId: string; targetUserId: string; contextType: ContextType; contextId: string; reason: SafetyReportReason; details: string; image?: Buffer | null }) {
  if (p.reporterId === p.targetUserId) throw err.badRequest('SELF_REPORT');
  const ctx = await resolveContext(p.reporterId, p.contextType, p.contextId, false);
  if (ctx.type === 'CALL' && !ctx.peers.includes(p.targetUserId)) throw err.badRequest('NOT_IN_CALL');
  if (ctx.type === 'LIVE') {
    const r = await prisma.liveRoom.findUniqueOrThrow({ where: { id: ctx.id } });
    if (r.hostId !== p.targetUserId && !getRoom(ctx.id)?.guests.has(p.targetUserId)) throw err.badRequest('NOT_IN_LIVE');
  }
  const report = await prisma.report.create({
    data: { reporterId: p.reporterId, targetUserId: p.targetUserId, targetType: p.contextType, targetId: p.contextId, reason: p.reason, details: p.details },
  });
  const urgent = p.reason === 'UNDERAGE';
  let evidenceId: string | null = null;
  let verdict: FrameVerdict | null = null;
  if (p.image) {
    const image = await normalizeImage(p.image);
    const s = await scan(image);
    verdict = frameVerdict(s.scores, { block: SAFETY.blockScore, review: SAFETY.reviewScore });
    const file = await writeEvidenceFile(image);
    const ev = await prisma.safetyEvidence.create({
      data: {
        kind: 'REPORT_FRAME', contextType: p.contextType, contextId: p.contextId, subjectId: p.targetUserId, peerId: p.reporterId,
        reporterId: p.reporterId, reportId: report.id, filePath: file.rel, sha256: file.sha256, provider: s.provider,
        scores: { ...(s.scores ?? {}), ...(s.error ? { error: s.error } : {}) } as object, maxScore: s.scores ? Math.max(s.scores.sexual, s.scores.suggestive) : 0,
        verdict, legalHold: urgent, expiresAt: days(retentionDays(verdict, 'REPORT_FRAME')),
      },
    });
    evidenceId = ev.id;
    // Şikayət kadrında açıq çılpaqlıq — insan baxışını gözləmədən avtomatik tədbir
    if (verdict === 'VIOLATION') await handleViolation(p.targetUserId, { ...ctx, peers: [p.reporterId] }, ev.id);
  }
  await audit('SAFETY_REPORT', p.targetUserId, { reportId: report.id, reason: p.reason, contextType: p.contextType, contextId: p.contextId, evidenceId, verdict }, p.reporterId);

  // Çoxlu müstəqil şikayət (24 saatda N fərqli şikayətçi): baxışa qədər 1 günlük dayandırma
  if (p.reason === 'NUDITY' || p.reason === 'UNDERAGE') {
    const since = new Date(Date.now() - 86400_000);
    const reporters = await prisma.report.findMany({ where: { targetUserId: p.targetUserId, reason: { in: ['NUDITY', 'UNDERAGE'] }, createdAt: { gte: since } }, select: { reporterId: true }, distinct: ['reporterId'] });
    const prof = await getProfile(p.targetUserId);
    if (reporters.length >= SAFETY.reportsToSuspend && !prof.suspensionActive && !prof.permanentBan) await suspendUser(p.targetUserId, 1, 'REPORTS_PENDING_REVIEW');
  }
  return { reportId: report.id, evidenceId, verdict, urgent };
}

/* ───────── Moderator qərarı ───────── */

export type ReviewAction = 'CONFIRM' | 'DISMISS' | 'BAN' | 'HOLD' | 'RELEASE_HOLD';

export async function reviewEvidence(evidenceId: string, action: ReviewAction, actorId: string, note = '') {
  const ev = await prisma.safetyEvidence.findUniqueOrThrow({ where: { id: evidenceId } });
  const now = new Date();
  if (action === 'HOLD' || action === 'RELEASE_HOLD') {
    await prisma.safetyEvidence.update({ where: { id: ev.id }, data: { legalHold: action === 'HOLD', reviewNote: note || ev.reviewNote } });
    await audit(action === 'HOLD' ? 'LEGAL_HOLD' : 'LEGAL_HOLD_RELEASED', ev.subjectId, { evidenceId, note }, actorId);
    return { ok: true };
  }
  if (action === 'DISMISS') {
    await prisma.safetyEvidence.update({ where: { id: ev.id }, data: { reviewStatus: 'DISMISSED', reviewedById: actorId, reviewedAt: now, reviewNote: note, expiresAt: days(SAFETY.retention.dismissed) } });
    const revoked = await revokeStrikesForEvidence(ev.id, actorId);
    if (ev.reportId) await prisma.report.updateMany({ where: { id: ev.reportId, status: 'OPEN' }, data: { status: 'DISMISSED' } });
    await audit('EVIDENCE_DISMISSED', ev.subjectId, { evidenceId, revoked, note }, actorId);
    return { ok: true, revoked };
  }
  // CONFIRM / BAN
  await prisma.safetyEvidence.update({ where: { id: ev.id }, data: { reviewStatus: 'CONFIRMED', reviewedById: actorId, reviewedAt: now, reviewNote: note, expiresAt: days(SAFETY.retention.confirmed) } });
  if (ev.reportId) await prisma.report.updateMany({ where: { id: ev.reportId, status: 'OPEN' }, data: { status: 'RESOLVED' } });
  let strike = null;
  if (action === 'BAN') await banUser(ev.subjectId, 'MODERATOR_CONFIRMED', actorId);
  else strike = await addStrike(ev.subjectId, 'NUDITY_CONFIRMED', { source: 'ADMIN', contextType: ev.contextType, contextId: ev.contextId, evidenceId: ev.id, actorId });
  // Zəngdə host pozubsa — ödəyənə pozuntu hissəsi qaytarılır (avtomatik edilməyibsə)
  let refund = null;
  if (ev.contextType === 'CALL') refund = await refundViolatingSegment(ev.contextId, ev.subjectId, ev.createdAt, actorId);
  await audit('EVIDENCE_CONFIRMED', ev.subjectId, { evidenceId, action, note, refund }, actorId);
  return { ok: true, strike, refund };
}

/** Hüquq-mühafizə orqanı sorğusu üçün istifadəçi üzrə məlumat paketi (ixrac jurnala yazılır) */
export async function exportUserCase(userId: string, actorId: string, ref: string, hold: boolean) {
  const since = new Date(Date.now() - 365 * 86400_000);
  const [user, profile, strikes, evidence, ageChecks, reportsAgainst, reportsBy, calls, lives, verifications, logs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, shortId: true, name: true, phone: true, email: true, gender: true, birthDate: true, createdAt: true, banned: true, deletedAt: true, hostStatus: true, kycStatus: true, agencyId: true, lastSeenAt: true } }),
    prisma.safetyProfile.findUnique({ where: { userId } }),
    prisma.safetyStrike.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.safetyEvidence.findMany({ where: { OR: [{ subjectId: userId }, { reporterId: userId }] }, orderBy: { createdAt: 'desc' } }),
    prisma.ageCheck.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.report.findMany({ where: { targetUserId: userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.report.findMany({ where: { reporterId: userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.call.findMany({ where: { OR: [{ callerId: userId }, { calleeId: userId }], createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 2000 }),
    prisma.liveRoom.findMany({ where: { hostId: userId, startedAt: { gte: since } }, orderBy: { startedAt: 'desc' }, take: 1000, select: { id: true, type: true, title: true, startedAt: true, endedAt: true, peakViewers: true } }),
    prisma.verification.findMany({ where: { userId }, select: { id: true, firstName: true, lastName: true, birthDate: true, docType: true, status: true, createdAt: true, reviewedAt: true } }),
    prisma.safetyAuditLog.findMany({ where: { targetUserId: userId }, orderBy: { createdAt: 'desc' }, take: 2000 }),
  ]);
  if (!user) throw err.notFound();
  if (hold) await prisma.safetyEvidence.updateMany({ where: { subjectId: userId }, data: { legalHold: true } });
  await audit('LE_EXPORT', userId, { ref, hold }, actorId);
  return {
    generatedAt: new Date(), ref, note: 'Media fayllar ayrıca, sha256 ilə müqayisə edilərək təhvil verilir (GET /admin/safety/evidence/:id/image).',
    user, profile, strikes, ageChecks, verifications,
    evidence: evidence.map((e) => ({ ...e, filePath: undefined, hasFile: !!e.filePath })),
    reportsAgainst, reportsBy, calls, lives, auditLog: logs,
  };
}

/* ───────── Fon işləri ───────── */

let jobTimer: NodeJS.Timeout | null = null;

export function startSafetyJobs() {
  if (jobTimer) return;
  jobTimer = setInterval(() => {
    void liftExpiredSuspensions().catch((e) => console.error('safety suspensions', e));
    void sweepEvidence().catch((e) => console.error('safety sweep', e));
  }, 10 * 60_000);
  jobTimer.unref();
}
