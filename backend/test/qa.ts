/**
 * QA reqressiya testləri: uçdan-uca (Playwright) səyahətlərdə tapılan server xətaları.
 *   DATABASE_URL=... npx tsx test/qa.ts
 */
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { createSocketServer } from '../src/realtime/socket.js';
import { stopCallBilling } from '../src/services/calls.js';

const PORT = Number(process.env.TEST_PORT_QA ?? 4557);
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;
let ipSeq = 1;

async function api<T = any>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      // OTP IP limiti testləri bir-birinə təsir etməsin
      'X-Forwarded-For': `10.99.0.${ipSeq++ % 250}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

async function registerPhone(phone: string) {
  const r1 = await api('POST', '/auth/otp/request', undefined, { phone });
  assert.equal(r1.status, 200, JSON.stringify(r1.data));
  const r2 = await api('POST', '/auth/otp/verify', undefined, { phone, code: r1.data.devCode });
  assert.equal(r2.status, 200);
  return r2.data.accessToken as string;
}

async function onboard(token: string, name: string, gender: 'MALE' | 'FEMALE') {
  const r = await api('PUT', '/me/onboarding', token, {
    name, gender, birthDate: '1995-05-05', avatarUrl: 'https://x.az/a.jpg', interests: ['music', 'travel', 'coffee'],
    interestedIn: gender === 'MALE' ? 'FEMALE' : 'MALE',
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.id as string;
}

async function main() {
  const stamp = Date.now().toString().slice(-7);
  const app = await buildApp();
  await app.ready();
  createSocketServer(app.server);
  await app.listen({ port: PORT, host: '127.0.0.1' });
  try {
    await step('CORS: veb tətbiq PUT/DELETE sorğuları göndərə bilir (preflight)', async () => {
      for (const m of ['PUT', 'DELETE', 'PATCH']) {
        const res = await fetch(`${BASE}/me/onboarding`, {
          method: 'OPTIONS',
          headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': m, 'Access-Control-Request-Headers': 'authorization,content-type' },
        });
        assert.ok(res.status < 300, `preflight ${m}: ${res.status}`);
        assert.ok((res.headers.get('access-control-allow-methods') ?? '').includes(m), `allow-methods ${m}`);
      }
    });

    await step('Şikayət: özünü şikayət etmək olmur (SELF_REPORT)', async () => {
      const t = await registerPhone(`+99455${stamp.slice(-6)}1`);
      const id = await onboard(t, 'Özü', 'MALE');
      const r = await api('POST', '/reports', t, { targetUserId: id, reason: 'SPAM' });
      assert.equal(r.status, 400);
      assert.equal(r.data.error, 'SELF_REPORT');
    });

    await step('Test hesabı: demo alış balansı artırır (promo — hosta Almaz yaratmır), real-time wallet:update', async () => {
      const phone = '+994990000002';
      const r1 = await api('POST', '/auth/otp/request', undefined, { phone });
      assert.equal(r1.status, 200);
      const t = (await api('POST', '/auth/otp/verify', undefined, { phone, code: '111111' })).data.accessToken as string;
      const before = await api('GET', '/me', t);
      assert.equal(before.data.isTester, true);
      const { io } = await import('socket.io-client');
      const s = io(BASE, { auth: { token: t }, transports: ['websocket'] });
      await new Promise<void>((r) => s.once('connect', () => r()));
      const upd = new Promise<{ coins: number }>((r) => s.once('wallet:update', r));
      const buy = await api('POST', '/payments/dev/purchase', t, { packageId: 'coins_600' });
      assert.equal(buy.status, 200, JSON.stringify(buy.data));
      const after = (await api('GET', '/me', t)).data;
      assert.equal(after.coins, before.data.coins + buy.data.credited, 'balans alış qədər artır');
      assert.equal((await upd).coins, after.coins);
      s.close();
      const u = await prisma.user.findUniqueOrThrow({ where: { id: after.id }, select: { coins: true, promoCoins: true } });
      assert.ok(u.promoCoins >= buy.data.credited, 'demo Nar promo kimi yazılır');
    });

    void stamp;
    console.log(`\n${passed} QA testi keçdi ✅`);
  } finally {
    stopCallBilling();
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
