import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { err } from '../lib/errors.js';
import { issueTokens, requireAuth, sha256, uid } from '../lib/auth.js';
import { sendSms } from '../services/sms.js';

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

async function sessionFor(userId: string, role: 'USER' | 'ADMIN', isNew: boolean) {
  const tokens = await issueTokens({ id: userId, role });
  return { ...tokens, isNew };
}

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/otp/request', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z.object({ phone: z.string().min(7), locale: z.string().default('az') }).parse(req.body);
    const phone = normalizePhone(body.phone);
    const recent = await prisma.otpCode.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 60_000) } } });
    if (recent > 0) throw err.badRequest('OTP_TOO_SOON');
    const code = String(crypto.randomInt(100000, 1000000));
    await prisma.otpCode.create({
      data: { phone, codeHash: sha256(phone + code), expiresAt: new Date(Date.now() + 5 * 60_000) },
    });
    await sendSms(phone, (OTP_MESSAGES[body.locale] ?? OTP_MESSAGES.az)(code));
    return { ok: true, phone, ...(config.devMode ? { devCode: code } : {}) };
  });

  app.post('/auth/otp/verify', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z.object({ phone: z.string(), code: z.string().length(6), referralCode: z.string().optional(), locale: z.string().optional() }).parse(req.body);
    const phone = normalizePhone(body.phone);
    const otp = await prisma.otpCode.findFirst({
      where: { phone, usedAt: null, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= 5) throw err.badRequest('OTP_INVALID');
    if (otp.codeHash !== sha256(phone + body.code)) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw err.badRequest('OTP_INVALID');
    }
    await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    let user = await prisma.user.findUnique({ where: { phone } });
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
    return sessionFor(user.id, user.role, isNew || !user.onboarded);
  });

  app.post('/auth/email/register', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(8).max(100), referralCode: z.string().optional(), locale: z.string().optional() })
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
        role: config.adminEmails.includes(email) ? 'ADMIN' : 'USER',
      },
    });
    return sessionFor(user.id, user.role, true);
  });

  app.post('/auth/email/login', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase().trim() } });
    if (!user?.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw err.badRequest('INVALID_CREDENTIALS');
    }
    if (user.deletedAt) throw err.forbidden('ACCOUNT_DELETED');
    if (user.banned) throw err.forbidden('BANNED');
    return sessionFor(user.id, user.role, !user.onboarded);
  });

  app.post('/auth/refresh', async (req) => {
    const body = z.object({ refreshToken: z.string() }).parse(req.body);
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(body.refreshToken) } });
    if (!row || row.revoked || row.expiresAt < new Date()) throw err.unauthorized('REFRESH_INVALID');
    await prisma.refreshToken.update({ where: { id: row.id }, data: { revoked: true } });
    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    if (!user || user.deletedAt || user.banned) throw err.unauthorized();
    return sessionFor(user.id, user.role, !user.onboarded);
  });

  app.post('/auth/logout', { preHandler: requireAuth }, async (req) => {
    const body = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});
    if (body.refreshToken) {
      await prisma.refreshToken.updateMany({ where: { tokenHash: sha256(body.refreshToken) }, data: { revoked: true } });
    }
    await prisma.user.update({ where: { id: uid(req) }, data: { pushToken: null } });
    return { ok: true };
  });
}
