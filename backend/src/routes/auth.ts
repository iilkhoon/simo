import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { AppError, err } from '../lib/errors.js';
import { issueTokens, requireAuth, sha256, uid } from '../lib/auth.js';
import { sendSms } from '../services/sms.js';
import { ensureTesterUser, fixedOtpFor, isTestPhone, refillTester } from '../services/tester.js';

/** Azərbaycan nömrəsi: +994 XX XXX XX XX (50, 51, 55, 60, 70, 77, 99, 10, 12 və s.) */
export function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0') && d.length === 10) d = '994' + d.slice(1);
  if (d.length === 9) d = '994' + d;
  if (!/^\d{10,15}$/.test(d)) throw err.badRequest('INVALID_PHONE');
  return '+' + d;
}

const OTP_MESSAGES: Record<string, (c: string) => string> = {
  az: (c) => `Simo təsdiq kodu: ${c}. Kodu heç kimə deməyin.`,
  ru: (c) => `Код подтверждения Simo: ${c}. Никому не сообщайте код.`,
  en: (c) => `Your Simo code: ${c}. Do not share it with anyone.`,
};

/** Dəvət kodu: istifadəçinin qısa ID-si (məs. 1234) və ya köhnə referralCode */
async function findReferrer(code?: string) {
  if (!code) return null;
  const c = code.trim();
  if (/^\d{1,9}$/.test(c)) return prisma.user.findUnique({ where: { shortId: Number(c) }, select: { id: true } });
  return prisma.user.findUnique({ where: { referralCode: c }, select: { id: true } });
}

/* ───────── Sui-istifadəyə qarşı sayğaclar (yaddaşda; tək proses üçün kifayətdir) ───────── */

const smsSent: number[] = [];
/** Qlobal saatlıq SMS limiti — bot hücumunda SMS provayder balansı boşalmasın */
function globalSmsAllowed(): boolean {
  const now = Date.now();
  while (smsSent.length && now - smsSent[0] > 3600_000) smsSent.shift();
  if (smsSent.length >= config.otp.globalHour) return false;
  smsSent.push(now);
  return true;
}

const loginFails = new Map<string, number[]>();
/** E-poçt girişində hesab üzrə uğursuz cəhdlər (IP limitindən əlavə): saatda 10 */
function loginLocked(key: string): boolean {
  const now = Date.now();
  const arr = (loginFails.get(key) ?? []).filter((t) => now - t < 3600_000);
  loginFails.set(key, arr);
  return arr.length >= 10;
}
function loginFailed(key: string) {
  const arr = loginFails.get(key) ?? [];
  arr.push(Date.now());
  loginFails.set(key, arr);
  if (loginFails.size > 50_000) loginFails.clear();
}

/** Köhnə OTP və refresh tokenlərinin təmizlənməsi (index.ts saatda bir çağırır) */
export async function cleanupAuthTables() {
  await prisma.otpCode.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 2 * 86400_000) } } });
  await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}

async function sessionFor(userId: string, role: 'USER' | 'ADMIN', isNew: boolean) {
  const tokens = await issueTokens({ id: userId, role });
  return { ...tokens, isNew };
}

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp/request', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z.object({ phone: z.string().min(7).max(32), locale: z.string().max(8).default('az') }).parse(req.body);
    const phone = normalizePhone(body.phone);
    // Test / App Review hesabı: SMS göndərilmir, sabit kod ilə daxil olunur
    if (fixedOtpFor(phone)) return { ok: true, phone, ...(config.devMode && isTestPhone(phone) ? { devCode: config.testOtpCode } : {}) };
    // SMS pumping: yalnız icazəli ölkə prefiksləri (standart +994)
    if (config.otp.allowedPrefixes.length && !config.otp.allowedPrefixes.some((p) => phone.startsWith(p))) throw err.badRequest('PHONE_COUNTRY_NOT_SUPPORTED');
    const [recent, lastHour, lastDay] = await Promise.all([
      prisma.otpCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 60_000) } } }),
      prisma.otpCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 3600_000) } } }),
      prisma.otpCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
    ]);
    if (recent > 0) throw err.badRequest('OTP_TOO_SOON');
    // Nömrə üzrə limit (IP dəyişdirməklə bir nömrəyə SMS yağdırmaq / kodu təxmin etmək olmur)
    if (lastHour >= config.otp.perPhoneHour || lastDay >= config.otp.perPhoneDay) throw new AppError('OTP_LIMIT', 429);
    if (!globalSmsAllowed()) {
      req.log.error({ event: 'otp_global_cap' }, 'OTP qlobal saatlıq limitə çatdı — mümkün SMS hücumu');
      throw new AppError('OTP_UNAVAILABLE', 503);
    }
    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.otpCode.create({
      data: { phone, codeHash: sha256(phone + code), expiresAt: new Date(Date.now() + 5 * 60_000) },
    });
    await sendSms(phone, (OTP_MESSAGES[body.locale] ?? OTP_MESSAGES.az)(code));
    return { ok: true, phone, ...(config.devMode ? { devCode: code } : {}) };
  });

  app.post('/auth/otp/verify', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z.object({ phone: z.string().max(32), code: z.string().regex(/^\d{6}$/), referralCode: z.string().max(40).optional(), locale: z.string().max(8).optional() }).parse(req.body);
    const phone = normalizePhone(body.phone);
    const tester = isTestPhone(phone);
    const fixed = fixedOtpFor(phone);
    if (fixed) {
      if (!crypto.timingSafeEqual(Buffer.from(sha256(body.code)), Buffer.from(sha256(fixed)))) throw err.badRequest('OTP_INVALID');
    } else {
      const otp = await prisma.otpCode.findFirst({
        where: { phone, usedAt: null, expiresAt: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
      });
      if (!otp || otp.attempts >= 5) throw err.badRequest('OTP_INVALID');
      if (!crypto.timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(sha256(phone + body.code)))) {
        await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
        throw err.badRequest('OTP_INVALID');
      }
      // Şərti: eyni kod paralel iki sorğu ilə iki dəfə istifadə olunmasın
      const used = await prisma.otpCode.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: new Date() } });
      if (!used.count) throw err.badRequest('OTP_INVALID');
    }
    // Test hesabı: hazır profil (onboarding tələb olunmur)
    let user = tester ? await ensureTesterUser(phone) : await prisma.user.findUnique({ where: { phone } });
    if (user?.deletedAt) throw err.forbidden('ACCOUNT_DELETED');
    if (user?.banned) throw err.forbidden('BANNED');
    let isNew = false;
    if (!user) {
      const ref = await findReferrer(body.referralCode);
      user = await prisma.user.create({
        data: { phone, referredById: ref?.id, locale: body.locale ?? 'az' },
      });
      isNew = true;
    }
    if (tester) await refillTester(user.id);
    return sessionFor(user.id, user.role, isNew || !user.onboarded);
  });

  app.post('/auth/email/register', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z
      .object({ email: z.string().email().max(254), password: z.string().min(8).max(100), referralCode: z.string().max(40).optional(), locale: z.string().max(8).optional() })
      .parse(req.body);
    const email = body.email.toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw err.badRequest('EMAIL_TAKEN');
    const ref = await findReferrer(body.referralCode);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(body.password, 10),
        referredById: ref?.id,
        locale: body.locale ?? 'az',
        // E-poçt təsdiqlənmir — istehsalda ADMIN_EMAILS ilə avtomatik admin VERİLMİR (kim birinci qeydiyyatdan keçsə admin olardı).
        // İstehsalda admin: serverdə `npm run admin -- grant <email>` (docs/PRODUCTION.md)
        role: !config.isProd && config.adminEmails.includes(email) ? 'ADMIN' : 'USER',
      },
    });
    return sessionFor(user.id, user.role, true);
  });

  app.post('/auth/email/login', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z.object({ email: z.string().email().max(254), password: z.string().max(100) }).parse(req.body);
    const email = body.email.toLowerCase().trim();
    if (loginLocked(email)) throw new AppError('LOGIN_LOCKED', 429);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
      loginFailed(email);
      throw err.badRequest('INVALID_CREDENTIALS');
    }
    if (user.deletedAt) throw err.forbidden('ACCOUNT_DELETED');
    if (user.banned) throw err.forbidden('BANNED');
    return sessionFor(user.id, user.role, !user.onboarded);
  });

  app.post('/auth/refresh', { config: { rateLimit: { max: 60, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z.object({ refreshToken: z.string().max(200) }).parse(req.body);
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(body.refreshToken) } });
    if (!row || row.expiresAt < new Date()) throw err.unauthorized('REFRESH_INVALID');
    if (row.revoked) {
      // Artıq istifadə olunmuş (rotasiya edilmiş) token yenidən gəlib → oğurlanma ehtimalı: bütün sessiyalar bağlanır.
      // 30 saniyəlik güzəşt: eyni anda iki tabdan gələn yeniləmə istifadəçini çıxarmasın.
      if (row.revokedAt && Date.now() - row.revokedAt.getTime() > 30_000) {
        await prisma.refreshToken.updateMany({ where: { userId: row.userId, revoked: false }, data: { revoked: true, revokedAt: new Date() } });
        req.log.warn({ event: 'refresh_reuse', userId: row.userId }, 'Refresh token təkrar istifadəsi — bütün sessiyalar ləğv edildi');
      }
      throw err.unauthorized('REFRESH_INVALID');
    }
    // Şərti rotasiya: eyni token paralel iki sorğu ilə iki cüt token verməsin
    const rotated = await prisma.refreshToken.updateMany({ where: { id: row.id, revoked: false }, data: { revoked: true, revokedAt: new Date() } });
    if (!rotated.count) throw err.unauthorized('REFRESH_INVALID');
    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    if (!user || user.deletedAt || user.banned) throw err.unauthorized();
    return sessionFor(user.id, user.role, !user.onboarded);
  });

  app.post('/auth/logout', { preHandler: requireAuth }, async (req) => {
    const body = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});
    if (body.refreshToken) {
      await prisma.refreshToken.updateMany({ where: { tokenHash: sha256(body.refreshToken), userId: uid(req) }, data: { revoked: true, revokedAt: new Date() } });
    }
    await prisma.user.update({ where: { id: uid(req) }, data: { pushToken: null } });
    return { ok: true };
  });
}
