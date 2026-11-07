/**
 * Təhlükəsizlik reqressiya testləri: IDOR (başqasının söhbəti/zəngi/ödənişi/sifarişi/KYC faylı), soket icazələri,
 * ödəniş webhook imzası və idempotentlik, refresh token rotasiyası, OTP limitləri, yükləmə yoxlaması, konfiq yoxlaması.
 *   DATABASE_URL=... npx tsx test/security.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { io as ioc, type Socket } from 'socket.io-client';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simo-sec-'));
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
process.env.PRIVATE_UPLOAD_DIR = path.join(tmp, 'private');
process.env.EPOINT_PRIVATE_KEY = 'test-epoint-private-key-123456';
process.env.EPOINT_PUBLIC_KEY = 'i000000001';

const { buildApp } = await import('../src/app.js');
const { prisma } = await import('../src/db.js');
const { config, configProblems } = await import('../src/config.js');
const { createSocketServer } = await import('../src/realtime/socket.js');
const { stopCallBilling } = await import('../src/services/calls.js');
const { createPending } = await import('../src/services/payments/packages.js');
const { epointEncode } = await import('../src/services/payments/epoint.js');
const sec = await import('../src/lib/security.js');

const PORT = Number(process.env.TEST_PORT_SECURITY ?? 4559);
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;

async function api<T = any>(method: string, p: string, token?: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; data: T; headers: Headers }> {
  const res = await fetch(BASE + p, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

async function uploadFile(p: string, token: string, buf: Buffer, type: string, name = 'f.jpg') {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buf)], { type }), name);
  const res = await fetch(BASE + p, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, data: (await res.json()) as any };
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

function waitFor<T = any>(s: Socket, event: string, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), ms);
    s.once(event, (p: T) => { clearTimeout(t); resolve(p); });
  });
}
function notReceived(s: Socket, event: string, ms = 600): Promise<void> {
  return new Promise((resolve, reject) => {
    const h = () => reject(new Error(`gözlənilməz hadisə: ${event}`));
    s.once(event, h);
    setTimeout(() => { s.off(event, h); resolve(); }, ms);
  });
}

async function login(phone: string) {
  const r1 = await api('POST', '/auth/otp/request', undefined, { phone });
  assert.equal(r1.status, 200, JSON.stringify(r1.data));
  const r2 = await api('POST', '/auth/otp/verify', undefined, { phone, code: r1.data.devCode });
  assert.equal(r2.status, 200, JSON.stringify(r2.data));
  return { access: r2.data.accessToken as string, refresh: r2.data.refreshToken as string };
}

/** IP üzrə OTP limiti (5/10 dəq) testləri dayandırmasın: əksər istifadəçilər birbaşa yaradılır */
async function makeUser(phone: string) {
  const { issueTokens } = await import('../src/lib/auth.js');
  const u = await prisma.user.create({ data: { phone, name: 'Sec ' + phone.slice(-4), onboarded: true, gender: 'FEMALE', birthDate: new Date('1995-01-01') } });
  const t = await issueTokens({ id: u.id, role: 'USER' });
  return { access: t.accessToken, refresh: t.refreshToken, id: u.id };
}

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = ioc(BASE, { auth: { token }, transports: ['websocket'], reconnection: false });
    s.once('connect', () => resolve(s));
    s.once('connect_error', (e) => reject(e));
  });
}

async function main() {
  const stamp = Date.now().toString().slice(-7);
  const app = await buildApp();
  await app.ready();
  createSocketServer(app.server);
  await app.listen({ port: PORT, host: '127.0.0.1' });
  const sockets: Socket[] = [];

  try {
    /* ───────── Konfiqurasiya / köməkçilər (vahid testlər) ───────── */
    await step('İstehsalda dev parametrləri ilə server başlamır; staging yalnız test rejimini yumşaldır', async () => {
      const bad = configProblems({ ...config, isProd: true, staging: false, jwtSecret: 'dev-secret-change-me', devMode: true, testPhones: ['+994990000001'], testOtpCode: '111111', sms: { ...config.sms, url: '' } });
      assert.ok(bad.fatal.some((f) => f.includes('JWT_SECRET')));
      assert.ok(bad.fatal.some((f) => f.includes('DEV_MODE')));
      assert.ok(bad.fatal.some((f) => f.includes('TEST_PHONES')));
      const staging = configProblems({ ...config, isProd: true, staging: true, jwtSecret: 'x'.repeat(64), devMode: true, testPhones: ['+994990000001'], testOtpCode: '111111' });
      assert.equal(staging.fatal.length, 0, staging.fatal.join('; '));
      assert.ok(staging.warn.some((w) => w.includes('DEV_MODE')));
      const weakInStaging = configProblems({ ...config, isProd: true, staging: true, jwtSecret: 'short' });
      assert.ok(weakInStaging.fatal.some((f) => f.includes('JWT_SECRET')), 'zəif JWT sirri staging-də də keçmir');
      const good = configProblems({ ...config, isProd: true, staging: false, jwtSecret: crypto.randomBytes(48).toString('hex'), devMode: false, testPhones: [], testOtpCode: '', reviewOtpCode: '', sms: { ...config.sms, url: 'https://sms.example/send' } });
      assert.equal(good.fatal.length, 0, good.fatal.join('; '));
    });

    await step('Köməkçilər: media link (javascript:), yol keçidi (../), magic bytes, telefon maskası', async () => {
      assert.equal(sec.isAcceptableMediaUrl('javascript:alert(1)'), false);
      assert.equal(sec.isAcceptableMediaUrl('data:image/png;base64,AAAA'), false);
      assert.equal(sec.isAcceptableMediaUrl('https://x.az/a.jpg', false), true);
      assert.equal(sec.isAcceptableMediaUrl('https://evil.example/a.jpg', true), false, 'istehsalda yad host');
      assert.equal(sec.isAcceptableMediaUrl(`${config.publicUrl}/files/a.jpg`, true), true);
      assert.equal(sec.safeResolve('/data/up', '../etc/passwd'), null);
      assert.equal(sec.safeResolve('/data/up', '/etc/passwd'), null);
      assert.equal(sec.safeResolve('/data/up', 'a/../../up2/x'), null);
      assert.ok(sec.safeResolve('/data/up', 'kyc/u1/a.jpg'));
      assert.equal(sec.sniffMime(Buffer.from('<html><script>')), null);
      assert.equal(sec.sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
      assert.equal(sec.maskPhone('kod +994501234567'), 'kod +99450*****67');
      assert.ok(!sec.redactUrl('/x?token=abc.def&a=1').includes('abc.def'));
    });

    await step('/ready və X-Request-Id', async () => {
      const r = await api('GET', '/ready');
      assert.equal(r.status, 200);
      assert.ok(r.headers.get('x-request-id'));
      const r2 = await api('GET', '/health', undefined, undefined, { 'X-Request-Id': 'trace-12345678' });
      assert.equal(r2.headers.get('x-request-id'), 'trace-12345678');
    });

    /* ───────── OTP ───────── */
    await step('OTP: xarici nömrəyə SMS yoxdur (SMS pumping), nömrə üzrə saatlıq limit', async () => {
      const foreign = await api('POST', '/auth/otp/request', undefined, { phone: '+447700900123' });
      assert.equal(foreign.status, 400);
      assert.equal(foreign.data.error, 'PHONE_COUNTRY_NOT_SUPPORTED');
      const phone = `+99455${stamp}`;
      // Son saatda artıq 5 kod göndərilib (müxtəlif IP-lərdən) — 6-cı rədd edilir
      await prisma.otpCode.createMany({ data: Array.from({ length: 5 }, (_, i) => ({ phone, codeHash: 'x', expiresAt: new Date(Date.now() + 60_000), createdAt: new Date(Date.now() - (i + 2) * 60_000) })) });
      const r = await api('POST', '/auth/otp/request', undefined, { phone });
      assert.equal(r.status, 429);
      assert.equal(r.data.error, 'OTP_LIMIT');
    });

    await step('OTP: səhv kod 5 dəfədən sonra düzgün kod da qəbul edilmir', async () => {
      const phone = `+99451${stamp}`;
      const r1 = await api('POST', '/auth/otp/request', undefined, { phone });
      for (let i = 0; i < 5; i++) {
        const bad = String((Number(r1.data.devCode) + 1 + i) % 1000000).padStart(6, '0');
        await api('POST', '/auth/otp/verify', undefined, { phone, code: bad });
      }
      const ok = await api('POST', '/auth/otp/verify', undefined, { phone, code: r1.data.devCode });
      assert.equal(ok.status, 400);
    });

    const A = await login(`+99450${stamp}`);
    const B = await makeUser(`+99470${stamp}`);
    const C = await makeUser(`+99477${stamp}`);
    const aId = (await prisma.user.findUniqueOrThrow({ where: { phone: `+99450${stamp}` } })).id;
    const bId = B.id;
    const cId = C.id;

    /* ───────── Refresh token ───────── */
    await step('Refresh: rotasiya, təkrar istifadə rədd edilir, oğurlanma aşkarlananda bütün sessiyalar bağlanır', async () => {
      const t = await makeUser(`+99499${stamp}`);
      const r1 = await api('POST', '/auth/refresh', undefined, { refreshToken: t.refresh });
      assert.equal(r1.status, 200);
      const again = await api('POST', '/auth/refresh', undefined, { refreshToken: t.refresh });
      assert.equal(again.status, 401, 'köhnə token ikinci dəfə işləmir');
      // Güzəşt müddəti keçmiş təkrar istifadə → yeni token da ləğv olunur
      await prisma.refreshToken.updateMany({ where: { tokenHash: crypto.createHash('sha256').update(t.refresh).digest('hex') }, data: { revokedAt: new Date(Date.now() - 120_000) } });
      const theft = await api('POST', '/auth/refresh', undefined, { refreshToken: t.refresh });
      assert.equal(theft.status, 401);
      const fresh = await api('POST', '/auth/refresh', undefined, { refreshToken: r1.data.refreshToken });
      assert.equal(fresh.status, 401, 'oğurlanma aşkarlandıqdan sonra bütün refresh tokenlər ləğv olunub');
    });

    await step('JWT: alg=none və başqa sirrlə imzalanmış token rədd edilir', async () => {
      const none = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' + Buffer.from(JSON.stringify({ sub: aId, role: 'ADMIN' })).toString('base64url') + '.';
      assert.equal((await api('GET', '/me', none)).status, 401);
      const jwt = (await import('jsonwebtoken')).default;
      const forged = jwt.sign({ sub: aId, role: 'ADMIN' }, 'wrong-secret');
      assert.equal((await api('GET', '/me', forged)).status, 401);
    });

    await step('Admin marşrutları adi istifadəçiyə bağlıdır (JWT-dəki rol yox, bazadakı rol)', async () => {
      for (const p of ['/admin/stats', '/admin/users', '/admin/kyc', '/admin/withdrawals', '/admin/safety/queue']) {
        const r = await api('GET', p, A.access);
        assert.equal(r.status, 403, p);
      }
      const jwt = (await import('jsonwebtoken')).default;
      const elevated = jwt.sign({ sub: aId, role: 'ADMIN' }, config.jwtSecret, { algorithm: 'HS256', issuer: 'simo-api' });
      assert.equal((await api('GET', '/admin/stats', elevated)).status, 403);
    });

    /* ───────── IDOR ───────── */
    const conv = await api('POST', `/conversations/with/${bId}`, A.access);
    assert.equal(conv.status, 200);
    const convId = conv.data.id as string;

    await step('IDOR: C başqalarının söhbətini oxuya / yaza / "oxundu" edə bilmir', async () => {
      assert.equal((await api('POST', `/conversations/${convId}/messages`, A.access, { text: 'salam' })).status, 200);
      assert.equal((await api('GET', `/conversations/${convId}`, C.access)).status, 404);
      assert.equal((await api('GET', `/conversations/${convId}/messages`, C.access)).status, 404);
      assert.equal((await api('POST', `/conversations/${convId}/messages`, C.access, { text: 'hack' })).status, 404);
      assert.equal((await api('POST', `/conversations/${convId}/read`, C.access)).status, 404);
      const list = await api('GET', '/conversations', C.access);
      assert.ok(!list.data.items.some((i: { id: string }) => i.id === convId));
    });

    await step('IDOR: zəng, ödəniş statusu, sifariş — yalnız iştirakçılar', async () => {
      const call = await prisma.call.create({ data: { callerId: aId, calleeId: bId, type: 'VOICE', pricePerMin: 0, channel: `sec_${stamp}`, status: 'ENDED', startedAt: new Date(Date.now() - 60_000), endedAt: new Date() } });
      for (const p of [`/calls/${call.id}`, `/calls/${call.id}/summary`]) assert.equal((await api('GET', p, C.access)).status, 404, p);
      for (const p of ['accept', 'reject', 'end']) assert.equal((await api('POST', `/calls/${call.id}/${p}`, C.access)).status === 200, false, p);
      assert.equal((await api('POST', `/calls/${call.id}/rate`, C.access, { stars: 1 })).status, 404);
      // Bitmiş zəngin kanalına RTC token verilmir
      const mine = await api('GET', `/calls/${call.id}`, A.access);
      assert.equal(mine.status, 200);
      assert.equal(mine.data.rtc, null);
      // Başqasının zənginə "hədiyyə" konteksti
      const pkg = await prisma.coinPackage.findFirst({ where: { active: true, currency: 'COIN' } });
      assert.ok(pkg, 'seed paketləri');
      const pay = await createPending(aId, 'EPOINT', pkg!.id, null);
      assert.equal((await api('GET', `/payments/${pay.id}/status`, C.access)).status, 404);
      assert.equal((await api('GET', `/payments/${pay.id}/status`, A.access)).status, 200);
      const svc = await prisma.service.create({ data: { userId: bId, title: 'Test xidmət', description: '', price: 10 } });
      const order = await prisma.serviceOrder.create({ data: { serviceId: svc.id, buyerId: aId, sellerId: bId, price: 10, paid: 0 } });
      for (const act of ['accept', 'decline', 'complete', 'cancel']) {
        assert.equal((await api('POST', `/orders/${order.id}/${act}`, C.access)).status, 403, act);
      }
      const ord = await api('GET', '/orders?as=seller', C.access);
      assert.equal(ord.data.items.length, 0);
    });

    await step('Hədiyyə: başqasının zənginə kontekst kimi yazmaq olmur', async () => {
      const call = await prisma.call.create({ data: { callerId: aId, calleeId: bId, type: 'VOICE', pricePerMin: 0, channel: `sec2_${stamp}`, status: 'ENDED' } });
      const gift = await prisma.gift.findFirst({ where: { active: true, currency: 'COIN' }, orderBy: { price: 'asc' } });
      const r = await api('POST', '/gifts/send', C.access, { giftId: gift!.id, receiverId: bId, count: 1, context: 'CALL', contextId: call.id });
      assert.equal(r.status, 400);
      assert.equal(r.data.error, 'INVALID_CONTEXT');
    });

    /* ───────── Yükləmələr və şəxsi fayllar ───────── */
    const jpegWithExif = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#c33' } })
      .jpeg().withMetadata({ exif: { IFD0: { Copyright: 'secret-gps-owner', Make: 'TestPhone' } } }).toBuffer();
    assert.ok((await sharp(jpegWithExif).metadata()).exif, 'test şəklində EXIF var');

    await step('Yükləmə: saxta Content-Type (HTML/SVG şəkil kimi) rədd edilir, şəkil yenidən kodlanır, EXIF silinir', async () => {
      const html = await uploadFile('/uploads', A.access, Buffer.from('<html><script>alert(1)</script></html>'), 'image/jpeg', 'x.jpg');
      assert.equal(html.status, 400);
      assert.equal(html.data.error, 'FILE_TYPE');
      const svg = await uploadFile('/uploads', A.access, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), 'image/svg+xml', 'x.svg');
      assert.equal(svg.status, 400);
      const ok = await uploadFile('/uploads', A.access, jpegWithExif, 'image/jpeg');
      assert.equal(ok.status, 200, JSON.stringify(ok.data));
      const rel = (ok.data.url as string).split('/files/')[1];
      const file = fs.readFileSync(path.join(process.env.UPLOAD_DIR!, rel));
      assert.equal((await sharp(file).metadata()).exif, undefined, 'EXIF silinib');
      assert.ok(!file.includes(Buffer.from('secret-gps-owner')));
      const served = await fetch(`${BASE}/files/${rel}`);
      assert.equal(served.status, 200);
      assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
      assert.equal((await fetch(`${BASE}/files/../private/x`)).status, 404);
    });

    let kycUrl = '';
    await step('KYC faylı şəxsidir: /files/ altında deyil, yalnız sahibi / admin / imzalı link', async () => {
      const up = await uploadFile('/uploads?purpose=kyc', A.access, jpegWithExif, 'image/jpeg');
      assert.equal(up.status, 200, JSON.stringify(up.data));
      kycUrl = up.data.url;
      assert.ok(kycUrl.includes('/private/kyc/'), kycUrl);
      const rel = kycUrl.split('/private/')[1];
      const p = `/private/${rel}`;
      assert.equal((await fetch(BASE + p)).status, 404, 'tokensiz açılmır');
      assert.equal((await fetch(BASE + p, { headers: { Authorization: `Bearer ${C.access}` } })).status, 404, 'başqası aça bilmir');
      assert.equal((await fetch(BASE + p, { headers: { Authorization: `Bearer ${A.access}` } })).status, 200, 'sahibi açır');
      assert.equal((await fetch(`${BASE}/files/kyc/${rel.split('/').slice(1).join('/')}`)).status, 404, 'ictimai qovluqda yoxdur');
      const signed = sec.signPrivateUrl(kycUrl)!;
      const signedPath = signed.slice(config.publicUrl.length);
      assert.equal((await fetch(BASE + signedPath)).status, 200, 'imzalı link işləyir');
      assert.equal((await fetch(BASE + signedPath.replace(/sig=./, 'sig=A'))).status, 404, 'saxta imza');
      const expired = signedPath.replace(/exp=\d+/, `exp=${Math.floor(Date.now() / 1000) - 10}`);
      assert.equal((await fetch(BASE + expired)).status, 404, 'vaxtı keçmiş link');
      assert.equal((await fetch(`${BASE}/private/kyc/../../uploads/x`, { headers: { Authorization: `Bearer ${A.access}` } })).status, 404);
    });

    await step('KYC: başqasının şəxsi faylı və javascript: linki qəbul edilmir', async () => {
      const body = { firstName: 'Test', lastName: 'User', birthDate: '1995-01-01', docType: 'ID_CARD' };
      const steal = await api('POST', '/kyc', C.access, { ...body, docFrontUrl: kycUrl, selfieUrl: kycUrl });
      assert.equal(steal.status, 400);
      assert.equal(steal.data.error, 'KYC_FILE_INVALID');
      const xss = await api('POST', '/kyc', C.access, { ...body, docFrontUrl: 'javascript:alert(document.cookie)', selfieUrl: 'https://x.az/s.jpg' });
      assert.equal(xss.status, 400);
      const own = await api('POST', '/kyc', A.access, { ...body, docFrontUrl: kycUrl, selfieUrl: kycUrl });
      assert.equal(own.status, 200, JSON.stringify(own.data));
      const avatar = await api('PATCH', '/me', A.access, { avatarUrl: 'javascript:alert(1)' });
      assert.equal(avatar.status, 400);
    });

    /* ───────── Ödəniş webhook ───────── */
    await step('Epoint webhook: saxta imza, məbləğ uyğunsuzluğu, təkrar bildiriş (idempotentlik)', async () => {
      const pkg = await prisma.coinPackage.findFirst({ where: { active: true, currency: 'COIN' } });
      const before = (await prisma.user.findUniqueOrThrow({ where: { id: bId } })).coins;
      const pay = await createPending(bId, 'EPOINT', pkg!.id, null);
      const amount = (pay.amountQepik / 100).toFixed(2);
      // 1) Saxta imza
      const forged = epointEncode({ order_id: pay.id, status: 'success', amount, transaction: 'T1' });
      const f = await api('POST', '/payments/epoint/callback', undefined, { data: forged.data, signature: crypto.createHash('sha1').update(forged.data).digest('base64') });
      assert.equal(f.status, 400);
      // 2) Məbləğsiz "success" qəbul edilmir
      const noAmount = epointEncode({ order_id: pay.id, status: 'success', transaction: 'T1' });
      assert.equal((await api('POST', '/payments/epoint/callback', undefined, noAmount)).data.ok, false);
      assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: pay.id } })).status, 'FAILED');
      // 3) Yeni sifariş: az məbləğ → FAILED, coin yoxdur
      const pay2 = await createPending(bId, 'EPOINT', pkg!.id, null);
      const low = epointEncode({ order_id: pay2.id, status: 'success', amount: '0.01', transaction: 'T2' });
      assert.equal((await api('POST', '/payments/epoint/callback', undefined, low)).data.ok, false);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: bId } })).coins, before);
      // 4) Düzgün bildiriş → PAID; təkrar → ikinci dəfə coin yazılmır
      const pay3 = await createPending(bId, 'EPOINT', pkg!.id, null);
      const good = epointEncode({ order_id: pay3.id, status: 'success', amount: (pay3.amountQepik / 100).toFixed(2), currency: 'AZN', transaction: `T3_${stamp}` });
      assert.equal((await api('POST', '/payments/epoint/callback', undefined, good)).data.ok, true);
      const after1 = (await prisma.user.findUniqueOrThrow({ where: { id: bId } })).coins;
      assert.ok(after1 > before);
      assert.equal((await api('POST', '/payments/epoint/callback', undefined, good)).data.ok, true);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: bId } })).coins, after1, 'təkrar bildiriş ikinci dəfə coin yazmır');
      // 5) Başqa provayderin ödənişini Epoint bildirişi ilə "ödənmiş" etmək olmur
      const apple = await createPending(bId, 'APPLE', pkg!.id, `apple_${stamp}`);
      const cross = epointEncode({ order_id: apple.id, status: 'success', amount: (apple.amountQepik / 100).toFixed(2) });
      assert.equal((await api('POST', '/payments/epoint/callback', undefined, cross)).status, 404);
    });

    /* ───────── Soket icazələri ───────── */
    await step('Soket: "typing" yalnız söhbət iştirakçısına; kənar istifadəçi saxta hadisə göndərə bilmir', async () => {
      const [sa, sb, sc] = await Promise.all([connect(A.access), connect(B.access), connect(C.access)]);
      sockets.push(sa, sb, sc);
      const got = waitFor(sb, 'typing');
      sa.emit('typing', { conversationId: convId, to: bId });
      const p = await got;
      assert.equal(p.from, aId);
      const none = notReceived(sb, 'typing');
      sc.emit('typing', { conversationId: convId, to: bId });
      sc.emit('typing', { conversationId: 'fake', to: bId });
      await none;
      const none2 = notReceived(sc, 'typing');
      sa.emit('typing', { conversationId: convId, to: cId });
      await none2;
    });

    await step('Soket: host tərəfindən bloklanmış istifadəçi yayın otağına qoşula bilmir; otaqda olmayan şərh yaza bilmir', async () => {
      const live = await api('POST', '/live', B.access, { type: 'VIDEO', title: 'sec' });
      if (live.status !== 200) {
        // Host onboarding tələb edir — test istifadəçisini tamamlayaq
        await prisma.user.update({ where: { id: bId }, data: { onboarded: true, name: 'B' } });
      }
      const room = live.status === 200 ? live.data.room : (await api('POST', '/live', B.access, { type: 'VIDEO', title: 'sec' })).data.room;
      assert.ok(room?.id, 'yayın açıldı');
      await prisma.block.create({ data: { blockerId: bId, blockedId: cId } });
      const sc = sockets[2];
      const ack = await new Promise<any>((r) => sc.emit('live:join', { roomId: room.id }, r));
      assert.equal(ack.ok, false);
      assert.equal(ack.error, 'BLOCKED');
      const sa = sockets[0];
      const none = notReceived(sa, 'live:comment');
      sc.emit('live:comment', { roomId: room.id, text: 'spam' });
      await none;
      await api('POST', `/live/${room.id}/end`, B.access);
    });

    await step('Soket: bloklanmış hesab qoşula bilmir, blok anında bağlantı kəsilir', async () => {
      const D = await makeUser(`+99460${stamp}`);
      const id = D.id;
      const sd = await connect(D.access);
      const dropped = new Promise<void>((r) => sd.once('disconnect', () => r()));
      const { disconnectUser } = await import('../src/realtime/hub.js');
      await prisma.user.update({ where: { id }, data: { banned: true } });
      disconnectUser(id);
      await dropped;
      await assert.rejects(connect(D.access), /BANNED/);
      assert.equal((await api('GET', '/me', D.access)).status, 403);
    });
  } finally {
    for (const s of sockets) s.disconnect();
    stopCallBilling();
    await app.close();
    await prisma.$disconnect();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(`\n${passed} təhlükəsizlik (security) testi keçdi ✅`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
