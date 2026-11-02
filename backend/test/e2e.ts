/**
 * Uçdan-uca test: real PostgreSQL ilə əsas axınları yoxlayır.
 *   DATABASE_URL=... npm test
 */
import assert from 'node:assert/strict';
import { io as ioc, type Socket } from 'socket.io-client';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { createSocketServer } from '../src/realtime/socket.js';
import { stopCallBilling } from '../src/services/calls.js';

const PORT = 4555;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;

async function api<T = any>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

function waitFor<T = any>(s: Socket, event: string, ms = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), ms);
    s.once(event, (p: T) => {
      clearTimeout(t);
      resolve(p);
    });
  });
}

async function registerPhone(phone: string) {
  const r1 = await api('POST', '/auth/otp/request', undefined, { phone });
  assert.equal(r1.status, 200, JSON.stringify(r1.data));
  const r2 = await api('POST', '/auth/otp/verify', undefined, { phone, code: r1.data.devCode });
  assert.equal(r2.status, 200);
  return r2.data.accessToken as string;
}

async function main() {
  const stamp = Date.now().toString().slice(-7);
  const app = await buildApp();
  await app.ready();
  createSocketServer(app.server);
  await app.listen({ port: PORT, host: '127.0.0.1' });
  const sockets: Socket[] = [];

  try {
    let man = '', girl = '', agent = '', admin = '';
    let manId = '', girlId = '', convId = '';

    await step('OTP qeydiyyat (+994) və onboarding, 18+ yoxlaması', async () => {
      man = await registerPhone(`050${stamp}`);
      const under = await api('PUT', '/me/onboarding', man, { name: 'Elvin', gender: 'MALE', birthDate: '2015-01-01', avatarUrl: 'https://x.az/a.jpg' });
      assert.equal(under.data.error, 'UNDERAGE');
      const ok = await api('PUT', '/me/onboarding', man, {
        name: 'Elvin', gender: 'MALE', birthDate: '1995-05-05', avatarUrl: 'https://x.az/a.jpg', interests: ['music', 'tea'], languages: ['az', 'ru'],
      });
      assert.equal(ok.status, 200, JSON.stringify(ok.data));
      assert.equal(ok.data.coins, 30, 'qeydiyyat bonusu (promo)');
      assert.equal(ok.data.interestedIn, 'FEMALE');
      manId = ok.data.id;
      await api('PUT', '/me/location', man, { lat: 40.40, lng: 49.86 });
    });

    await step('Email qeydiyyat + host statusu', async () => {
      const r = await api('POST', '/auth/email/register', undefined, { email: `aysel${stamp}@test.az`, password: 'secret123' });
      girl = r.data.accessToken;
      const ob = await api('PUT', '/me/onboarding', girl, { name: 'Aysel', gender: 'FEMALE', birthDate: '1999-03-03', avatarUrl: 'https://x.az/b.jpg', interests: ['music'] });
      girlId = ob.data.id;
      await api('PUT', '/me/location', girl, { lat: 40.41, lng: 49.87 });
      const apply = await api('POST', '/me/host/apply', girl, { verificationUrl: 'https://x.az/selfie.jpg' });
      assert.equal(apply.data.hostStatus, 'PENDING');
      const login = await api('POST', '/auth/email/login', undefined, { email: `aysel${stamp}@test.az`, password: 'secret123' });
      assert.equal(login.status, 200);
      const bad = await api('POST', '/auth/email/login', undefined, { email: `aysel${stamp}@test.az`, password: 'wrong' });
      assert.equal(bad.data.error, 'INVALID_CREDENTIALS');
    });

    await step('Admin hostu təsdiqləyir', async () => {
      const r = await api('POST', '/auth/email/register', undefined, { email: `admin${stamp}@test.az`, password: 'secret123' });
      await prisma.user.update({ where: { id: (await api('GET', '/me', r.data.accessToken)).data.id }, data: { role: 'ADMIN' } });
      admin = (await api('POST', '/auth/refresh', undefined, { refreshToken: r.data.refreshToken })).data.accessToken;
      const stats = await api('GET', '/admin/stats', admin);
      assert.equal(stats.status, 200);
      assert.equal((await api('GET', '/admin/stats', man)).status, 403);
      const up = await api('POST', `/admin/users/${girlId}`, admin, { hostStatus: 'APPROVED' });
      assert.equal(up.status, 200);
    });

    await step('Kəşf, günün 10 seçimi, yaxınlıqdakılar', async () => {
      const d = await api('GET', '/discover', man);
      assert.equal(d.status, 200);
      assert.ok(d.data.items.some((u: any) => u.id === girlId), 'qız kəşfdə görünür');
      assert.ok(d.data.items.every((u: any) => u.gender === 'FEMALE'));
      const daily = await api('GET', '/discover/daily', man);
      assert.ok(daily.data.items.length <= 10);
      const near = await api('GET', '/nearby?radius=20', man);
      const g = near.data.items.find((u: any) => u.id === girlId);
      assert.ok(g && g.distanceKm >= 1 && g.distanceKm < 5);
    });

    await step('Təsadüfi video tanışlıq: onlayn host seçilir, keçilən təkrar gəlmir', async () => {
      await prisma.user.update({ where: { id: girlId }, data: { online: true } });
      const m = await api('GET', '/calls/match?type=VIDEO', man);
      assert.equal(m.status, 200);
      assert.ok(m.data.user, 'onlayn host tapılmalıdır');
      assert.equal(m.data.user.gender, 'FEMALE');
      assert.ok(m.data.price > 0);
      const skipped = await api('GET', `/calls/match?type=VOICE&skip=${girlId}`, man);
      assert.notEqual(skipped.data.user?.id, girlId);
    });

    await step('Qarşılıqlı bəyənmə → uyğunluq', async () => {
      const a = await api('POST', '/swipes', man, { toId: girlId, action: 'LIKE' });
      assert.equal(a.data.matched, false);
      const likes = await api('GET', '/me/likes', girl);
      assert.equal(likes.data.locked, true);
      assert.equal(likes.data.total, 1);
      const b = await api('POST', '/swipes', girl, { toId: manId, action: 'LIKE' });
      assert.equal(b.data.matched, true);
      convId = b.data.conversationId;
    });

    const sMan = ioc(BASE, { auth: { token: man }, transports: ['websocket'] });
    const sGirl = ioc(BASE, { auth: { token: girl }, transports: ['websocket'] });
    sockets.push(sMan, sGirl);
    await Promise.all([waitFor(sMan, 'connect'), waitFor(sGirl, 'connect')]);

    await step('Mesaj: ilk pulsuz, sonra 10 coin (promo coindən — qıza nağdlaşan almaz yazılmır); real-time çatdırılma', async () => {
      const incoming = waitFor(sGirl, 'message:new');
      const m1 = await api('POST', `/conversations/${convId}/messages`, man, { text: 'Salam! Nömrəm +994 50 123 45 67' });
      assert.equal(m1.status, 200, JSON.stringify(m1.data));
      assert.equal(m1.data.message.coinsCost, 0);
      assert.ok(!m1.data.message.text.includes('123 45 67'), 'telefon maskalanır');
      const got = await incoming;
      assert.equal(got.id, m1.data.message.id);
      const m2 = await api('POST', `/conversations/${convId}/messages`, man, { text: 'Necəsən?' });
      assert.equal(m2.data.message.coinsCost, 10);
      assert.equal(m2.data.coins, 20);
      const g = await api('GET', '/me', girl);
      assert.equal(g.data.diamonds, 0, 'promo coin almaz yaratmır');
      const reply = await api('POST', `/conversations/${convId}/messages`, girl, { text: 'Yaxşıyam 😊' });
      assert.equal(reply.data.message.coinsCost, 0, 'hostun cavabı pulsuzdur');
      const convs = await api('GET', '/conversations', man);
      assert.equal(convs.data.items[0].unread, 1);
    });

    await step('Coin alışı (dev): ilk yükləmə hədiyyəsi ≤300 promo coin', async () => {
      const r = await api('POST', '/payments/dev/purchase', man, { packageId: 'coins_600' });
      assert.equal(r.data.credited, 630 + 300);
      const r2 = await api('POST', '/payments/dev/purchase', man, { packageId: 'coins_1300' });
      assert.equal(r2.data.credited, 1400, 'ikinci alışda hədiyyə yoxdur');
      const u = await prisma.user.findUniqueOrThrow({ where: { id: manId } });
      assert.equal(u.coins, 20 + 930 + 1400);
      assert.equal(u.promoCoins, 20 + 300);
    });

    await step('Hədiyyə göndərmə (söhbətdə) + balans yoxlaması', async () => {
      const gifts = await api('GET', '/gifts');
      assert.ok(gifts.data.items.length >= 18);
      const recv = waitFor(sGirl, 'gift:received');
      const r = await api('POST', '/gifts/send', man, { giftId: 'teddy', receiverId: girlId, count: 10, context: 'CHAT' });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.coins, 2350 - 500);
      const ev = await recv;
      assert.equal(ev.gift.id, 'teddy');
      const tooMuch = await api('POST', '/gifts/send', man, { giftId: 'love_planet', receiverId: girlId, count: 1, context: 'CHAT' });
      assert.equal(tooMuch.status, 402);
      assert.equal(tooMuch.data.error, 'INSUFFICIENT_COINS');
      const g = await api('GET', '/me', girl);
      assert.equal(g.data.diamonds, (500 - 320) * 0.5, 'yalnız ödənişli hissədən (180 coin) 50%');
    });

    await step('VIP Silver alışı və gündəlik bonus', async () => {
      const v = await api('POST', '/vip/buy', man, { tier: 'SILVER' });
      assert.equal(v.data.vipTier, 'SILVER');
      assert.equal(v.data.coins, 1850 - 500);
      const c = await api('POST', '/rewards/checkin', man);
      assert.equal(c.data.amount, 3);
      const c2 = await api('POST', '/rewards/checkin', man);
      assert.equal(c2.data.error, 'ALREADY_CHECKED_IN');
      const m = await api('POST', `/conversations/${convId}/messages`, man, { text: 'VIP pulsuz mesaj' });
      assert.equal(m.data.message.coinsCost, 0, 'VIP gündəlik pulsuz mesaj');
    });

    await step('Görüntülü zəng: zəng, qəbul, ilk dəqiqə ödənişi, bitirmə', async () => {
      const price = await api('GET', `/calls/price/${girlId}`, man);
      assert.equal(price.data.VIDEO, 76, 'Silver 5% endirim: 80 → 76');
      const incoming = waitFor(sGirl, 'call:incoming');
      const c = await api('POST', '/calls', man, { calleeId: girlId, type: 'VIDEO' });
      assert.equal(c.status, 200, JSON.stringify(c.data));
      const inc = await incoming;
      assert.equal(inc.call.id, c.data.call.id);
      const accepted = waitFor(sMan, 'call:accepted');
      const a = await api('POST', `/calls/${c.data.call.id}/accept`, girl);
      assert.equal(a.status, 200, JSON.stringify(a.data));
      await accepted;
      const me = await api('GET', '/me', man);
      assert.equal(me.data.coins, 1353 - 76);
      const ended = waitFor(sGirl, 'call:ended');
      await api('POST', `/calls/${c.data.call.id}/end`, man);
      const e = await ended;
      assert.equal(e.status, 'ENDED');
      assert.equal(e.coinsSpent, 76);
      const busy = await api('POST', '/calls', man, { calleeId: girlId, type: 'VOICE' });
      assert.equal(busy.status, 200);
      await api('POST', `/calls/${busy.data.call.id}/reject`, girl);
    });

    await step('Canlı yayın: başlat, qoşul, şərh, hədiyyə animasiyası, bitir', async () => {
      const l = await api('POST', '/live', girl, { type: 'VIDEO', title: 'Salam Bakı!' });
      assert.equal(l.status, 200, JSON.stringify(l.data));
      const roomId = l.data.room.id;
      const ack = await new Promise<any>((r) => sGirl.emit('live:join', { roomId }, r));
      assert.equal(ack.ok, true);
      const viewers = waitFor(sGirl, 'live:viewers');
      await new Promise<any>((r) => sMan.emit('live:join', { roomId }, r));
      assert.equal((await viewers).count, 1);
      const list = await api('GET', '/live', man);
      assert.ok(list.data.items.some((r: any) => r.id === roomId));
      const comment = waitFor(sGirl, 'live:comment');
      sMan.emit('live:comment', { roomId, text: 'Çox gözəlsən 😍' });
      assert.equal((await comment).text, 'Çox gözəlsən 😍');
      const giftEv = waitFor(sGirl, 'live:gift');
      await api('POST', '/gifts/send', man, { giftId: 'rose', receiverId: girlId, count: 99, context: 'LIVE', contextId: roomId });
      assert.equal((await giftEv).count, 99);
      const info = await api('GET', `/live/${roomId}`, man);
      assert.equal(info.data.topGifters[0].coins, 99);
      const endEv = waitFor(sMan, 'live:ended');
      const end = await api('POST', `/live/${roomId}/end`, girl);
      assert.equal(end.data.summary.giftsCoins, 99);
      await endEv;
    });

    await step('Səsli otaq: oturacaq tutmaq', async () => {
      const l = await api('POST', '/live', girl, { type: 'VOICE', title: 'Gecə söhbəti' });
      const roomId = l.data.room.id;
      await new Promise<any>((r) => sMan.emit('live:join', { roomId }, r));
      const host = await api('POST', `/live/${roomId}/seat`, man, { seat: 0 });
      assert.equal(host.data.error, 'HOST_SEAT');
      const seat = await api('POST', `/live/${roomId}/seat`, man, { seat: 3 });
      assert.equal(seat.status, 200);
      const info = await api('GET', `/live/${roomId}`, man);
      assert.equal(info.data.seats[3].user.id, manId);
      assert.equal(info.data.seats[0].user.id, girlId);
      await api('POST', `/live/${roomId}/end`, girl);
    });

    await step('Video: yüklə, lent, bəyən, şərh, baxış', async () => {
      const v = await api('POST', '/videos', girl, { url: 'https://x.az/v.mp4', caption: 'Bakı bulvarı #baku #sea' });
      assert.deepEqual(v.data.video.hashtags, ['baku', 'sea']);
      const feed = await api('GET', '/videos/feed', man);
      assert.ok(feed.data.items.some((i: any) => i.id === v.data.video.id));
      await api('POST', `/videos/${v.data.video.id}/like`, man);
      await api('POST', `/videos/${v.data.video.id}/like`, man);
      await api('POST', `/videos/${v.data.video.id}/view`, man);
      const c = await api('POST', `/videos/${v.data.video.id}/comments`, man, { text: 'Super!' });
      assert.equal(c.status, 200);
      const row = await prisma.video.findUniqueOrThrow({ where: { id: v.data.video.id } });
      assert.equal(row.likesCount, 1);
      assert.equal(row.views, 1);
      assert.equal(row.commentsCount, 1);
    });

    await step('Agentlik: yarat, admin təsdiqi, qoşulma, komissiya', async () => {
      agent = await registerPhone(`055${stamp}`);
      await api('PUT', '/me/onboarding', agent, { name: 'Star Agency', gender: 'FEMALE', birthDate: '1990-01-01', avatarUrl: 'https://x.az/c.jpg' });
      const a = await api('POST', '/agencies', agent, { name: `Star ${stamp}` });
      assert.equal(a.data.agency.status, 'PENDING');
      await api('POST', `/admin/agencies/${a.data.agency.id}`, admin, { status: 'ACTIVE' });
      const j = await api('POST', '/agencies/join', girl, { code: a.data.agency.code });
      assert.equal(j.status, 200);
      const dash = await api('GET', '/agencies/me', agent);
      assert.equal(dash.data.requests.length, 1);
      await api('POST', `/agencies/requests/${dash.data.requests[0].id}/approve`, agent);
      await api('POST', '/gifts/send', man, { giftId: 'bouquet', receiverId: girlId, count: 1, context: 'PROFILE' });
      const ag = await api('GET', '/me', agent);
      assert.equal(ag.data.diamonds, Math.floor(Math.floor(99 * 0.5) * 0.1), 'agentlik komissiyası');
      const dash2 = await api('GET', '/agencies/me', agent);
      assert.equal(dash2.data.stats.members, 1);
      assert.ok(dash2.data.members[0].weekDiamonds > 0);
    });

    await step('Almaz mübadiləsi və nağdlaşdırma sorğusu', async () => {
      await prisma.user.update({ where: { id: girlId }, data: { diamonds: { increment: 12000 } } });
      const ex = await api('POST', '/wallet/exchange', girl, { diamonds: 101 });
      assert.equal(ex.status, 200);
      const w = await api('POST', '/wallet/withdraw', girl, { diamonds: 10000, method: 'CARD', account: '4169 7388 0000 0000' });
      assert.equal(w.status, 200, JSON.stringify(w.data));
      assert.equal(w.data.withdrawal.amountQepik, 5000 - 150, '200 almaz = 1 ₼, 3% xidmət haqqı');
      const w2 = await api('POST', '/wallet/withdraw', girl, { diamonds: 10000, method: 'CARD', account: '4169' });
      assert.equal(w2.data.error, 'WITHDRAW_PENDING');
      const before = (await api('GET', '/me', girl)).data.diamonds;
      await api('POST', `/admin/withdrawals/${w.data.withdrawal.id}`, admin, { status: 'REJECTED' });
      assert.equal((await api('GET', '/me', girl)).data.diamonds, before + 10000, 'rədd edildikdə qaytarılır');
    });

    await step('Şikayət, blok, profil baxışı', async () => {
      const p = await api('GET', `/users/${girlId}`, man);
      assert.equal(p.data.matched, true);
      assert.ok(p.data.giftWall.length > 0);
      const visitors = await api('GET', '/me/visitors', girl);
      assert.equal(visitors.data.total, 1);
      assert.equal((await api('POST', '/reports', man, { targetUserId: girlId, reason: 'SPAM' })).status, 200);
      await api('POST', `/users/${manId}/block`, girl);
      const m = await api('POST', `/conversations/${convId}/messages`, man, { text: 'hi' });
      assert.equal(m.data.error, 'BLOCKED');
      const call = await api('POST', '/calls', man, { calleeId: girlId, type: 'VIDEO' });
      assert.equal(call.data.error, 'BLOCKED');
    });

    await step('Liderlər cədvəli', async () => {
      const lb = await api('GET', '/leaderboard?type=charm&period=week', man);
      assert.ok(lb.data.items.some((i: any) => i.user.id === girlId));
      const wl = await api('GET', '/leaderboard?type=wealth&period=day', man);
      assert.equal(wl.status, 200);
    });

    await step('Ledger ardıcıllığı: balans = kitab cəmi', async () => {
      for (const id of [manId, girlId]) {
        const u = await prisma.user.findUniqueOrThrow({ where: { id } });
        const coins = await prisma.walletTransaction.aggregate({ where: { userId: id, currency: 'COIN' }, _sum: { amount: true } });
        assert.equal(coins._sum.amount ?? 0, u.coins);
      }
    });

    await step('Dəvət: qısa ID ilə qeydiyyat, dəvət edənə ilk alışın 10%-i (promo)', async () => {
      const manShort = (await api('GET', '/me', man)).data.shortId;
      const before = (await api('GET', '/me', man)).data.coins;
      const r = await api('POST', '/auth/email/register', undefined, { email: `ref${stamp}@test.az`, password: 'secret123', referralCode: String(manShort) });
      await api('PUT', '/me/onboarding', r.data.accessToken, { name: 'Ref', gender: 'MALE', birthDate: '1990-01-01', avatarUrl: 'https://x.az/r.jpg' });
      await api('POST', '/payments/dev/purchase', r.data.accessToken, { packageId: 'coins_1300' });
      assert.equal((await api('GET', '/me', man)).data.coins, before + 140, '1300+100 coinin 10%-i (promo, ≤200)');
    });

    await step('Hesabın silinməsi', async () => {
      const t = await registerPhone(`070${stamp}`);
      assert.equal((await api('DELETE', '/me', t)).status, 200);
      assert.equal((await api('GET', '/me', t)).status, 401);
    });

    console.log(`\n${passed} test keçdi ✅`);
  } finally {
    sockets.forEach((s) => s.close());
    stopCallBilling();
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
