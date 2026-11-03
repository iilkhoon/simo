import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { refillTester } from '../services/tester.js';
import { config } from '../config.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { createPending, fulfillPayment } from '../services/payments/packages.js';
import { appAccountTokenFor, fetchAppleTransaction } from '../services/payments/apple.js';
import { fetchGooglePurchase } from '../services/payments/google.js';
import { epointCreatePayment, epointDecode, epointVerify } from '../services/payments/epoint.js';

export default async function paymentRoutes(app: FastifyInstance) {
  /** iOS alışında appAccountToken kimi istifadə olunur (başqasının qəbzini oğurlamağa qarşı) */
  app.get('/payments/account-token', { preHandler: requireAuth }, async (req) => ({ token: appAccountTokenFor(uid(req)) }));

  app.post('/payments/apple/verify', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ transactionId: z.string().min(1), productId: z.string() }).parse(req.body);
    const tx = await fetchAppleTransaction(b.transactionId).catch((e: Error) => {
      throw err.badRequest('PAYMENT_VERIFY_FAILED', { detail: e.message });
    });
    if (tx.revocationDate) throw err.badRequest('PAYMENT_REVOKED');
    if (tx.appAccountToken && tx.appAccountToken !== appAccountTokenFor(me)) throw err.forbidden('PAYMENT_OWNER_MISMATCH');
    const pkg = await prisma.coinPackage.findUnique({ where: { appleProductId: tx.productId } });
    if (!pkg) throw err.badRequest('PACKAGE_NOT_FOUND');
    const existing = await prisma.payment.findUnique({ where: { provider_externalId: { provider: 'APPLE', externalId: tx.transactionId } } });
    if (existing && existing.userId !== me) throw err.forbidden('PAYMENT_OWNER_MISMATCH');
    const payment = existing ?? (await createPending(me, 'APPLE', pkg.id, tx.transactionId));
    const r = await fulfillPayment(payment.id, tx);
    return { ok: true, credited: r.credited, already: r.already };
  });

  app.post('/payments/google/verify', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ purchaseToken: z.string().min(1), productId: z.string() }).parse(req.body);
    const pkg = await prisma.coinPackage.findUnique({ where: { googleProductId: b.productId } });
    if (!pkg) throw err.badRequest('PACKAGE_NOT_FOUND');
    const p = await fetchGooglePurchase(b.productId, b.purchaseToken).catch((e: Error) => {
      throw err.badRequest('PAYMENT_VERIFY_FAILED', { detail: e.message });
    });
    if (p.purchaseState !== 0) throw err.badRequest('PAYMENT_NOT_COMPLETED');
    if (p.obfuscatedExternalAccountId && p.obfuscatedExternalAccountId !== me) throw err.forbidden('PAYMENT_OWNER_MISMATCH');
    const existing = await prisma.payment.findUnique({ where: { provider_externalId: { provider: 'GOOGLE', externalId: b.purchaseToken } } });
    if (existing && existing.userId !== me) throw err.forbidden('PAYMENT_OWNER_MISMATCH');
    const payment = existing ?? (await createPending(me, 'GOOGLE', pkg.id, b.purchaseToken));
    const r = await fulfillPayment(payment.id, p);
    return { ok: true, credited: r.credited, already: r.already };
  });

  async function epointCheckout(userId: string, packageId: string, language: string, source: 'app' | 'web') {
    const pkg = await prisma.coinPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.active) throw err.badRequest('PACKAGE_NOT_FOUND');
    const payment = await createPending(userId, 'EPOINT', pkg.id, null, source);
    const back = source === 'app' ? `${config.publicUrl}/payments/epoint/return` : `${config.webUrl}/topup.html`;
    const url = await epointCreatePayment({
      orderId: payment.id,
      amountAzn: pkg.priceQepik / 100,
      description: `Simo Coin ${pkg.coins + pkg.bonusCoins}`,
      language,
      successUrl: `${back}?status=success&order=${payment.id}`,
      errorUrl: `${back}?status=error&order=${payment.id}`,
    }).catch((e: Error) => {
      throw err.badRequest('PAYMENT_PROVIDER_ERROR', { detail: e.message });
    });
    return { paymentId: payment.id, redirectUrl: url };
  }

  app.post('/payments/epoint/checkout', { preHandler: requireAuth }, async (req) => {
    const b = z.object({ packageId: z.string(), language: z.string().default('az') }).parse(req.body);
    return epointCheckout(uid(req), b.packageId, b.language, 'app');
  });

  /** Veb yükləmə (simo.az/topup) — istifadəçi ID ilə, giriş tələb olunmur */
  app.post('/payments/epoint/web-checkout', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (req) => {
    const b = z.object({ shortId: z.coerce.number().int(), packageId: z.string(), language: z.string().default('az') }).parse(req.body);
    const user = await prisma.user.findFirst({ where: { shortId: b.shortId, deletedAt: null, banned: false } });
    if (!user) throw err.notFound('USER_NOT_FOUND');
    return epointCheckout(user.id, b.packageId, b.language, 'web');
  });

  /** Epoint server-to-server bildirişi */
  app.post('/payments/epoint/callback', async (req, reply) => {
    const b = z.object({ data: z.string(), signature: z.string() }).parse(req.body);
    if (!epointVerify(b.data, b.signature)) return reply.code(400).send({ ok: false });
    const d = epointDecode<{ order_id: string; status: string; transaction?: string; amount?: number }>(b.data);
    const payment = await prisma.payment.findUnique({ where: { id: d.order_id } });
    if (!payment) return reply.code(404).send({ ok: false });
    if (d.status === 'success') {
      if (d.amount != null && Math.round(Number(d.amount) * 100) !== payment.amountQepik) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', raw: d as object } });
        return { ok: false };
      }
      if (d.transaction && !payment.externalId) {
        await prisma.payment.update({ where: { id: payment.id }, data: { externalId: d.transaction } });
      }
      await fulfillPayment(payment.id, d);
    } else {
      await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED', raw: d as object } });
    }
    return { ok: true };
  });

  /** Tətbiqdaxili brauzer bu ünvana qayıdır və deep-link ilə tətbiqə yönləndirilir */
  app.get('/payments/epoint/return', async (req, reply) => {
    const q = z.object({ status: z.string().default('error'), order: z.string().default('') }).parse(req.query);
    const target = `simo://payment-result?status=${encodeURIComponent(q.status)}&order=${encodeURIComponent(q.order)}`;
    return reply
      .type('text/html')
      .send(`<!doctype html><meta name="viewport" content="width=device-width"><body style="background:#F6F0E8;color:#17120F;font-family:sans-serif;text-align:center;padding-top:30vh"><p style="font-weight:800;font-size:22px">Simo…</p><script>location.href=${JSON.stringify(target)}</script><a style="display:inline-block;margin-top:12px;padding:12px 22px;border:2px solid #17120F;border-radius:999px;background:#F2344F;color:#fff;font-weight:700;text-decoration:none;box-shadow:3px 3px 0 #17120F" href="${target}">Simo</a></body>`);
  });

  app.get('/payments/:id/status', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const p = await prisma.payment.findFirst({ where: { id, userId: uid(req) } });
    if (!p) throw err.notFound();
    return { status: p.status, coins: p.coins };
  });

  /** YALNIZ inkişaf rejimi: real ödəniş olmadan test üçün coin yükləmə */
  app.post('/payments/dev/purchase', { preHandler: requireAuth }, async (req) => {
    const b = z.object({ packageId: z.string() }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) }, select: { isTester: true } });
    if (user.isTester) {
      // Test hesabı: demo alış — real ödəniş yoxdur, balans onsuz da limitsizdir
      const pkg = await prisma.coinPackage.findUnique({ where: { id: b.packageId } });
      if (!pkg) throw err.badRequest('PACKAGE_NOT_FOUND');
      await refillTester(uid(req));
      return { ok: true, credited: pkg.currency === 'DIAMOND' ? 0 : pkg.coins + pkg.bonusCoins, demo: true };
    }
    if (!config.devMode) throw err.notFound();
    const payment = await createPending(uid(req), 'DEV', b.packageId, `dev_${Date.now()}_${Math.random()}`);
    const r = await fulfillPayment(payment.id);
    return { ok: true, credited: r.credited };
  });
}
