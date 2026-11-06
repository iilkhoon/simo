/**
 * Pul axınlarının testləri: yarış (race) şəraitində ikiqat xərc, mənfi balans, promo/ödənişli Nar,
 * qazanc bölgüsü (host / agentlik / Simo), dəqiqəlik zəng ödənişi, çıxarış (KYC, gözləmə, limit, rədd + qaytarma),
 * ödəniş idempotentliyi, agentlik dəvət kodu, sahib paneli, həftəlik hesabat və CSV.
 *   DATABASE_URL=... npx tsx test/money.ts
 */
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { signAccess } from '../src/lib/auth.js';
import { ECONOMY, splitEarnings, weekKey } from '../src/economy.js';
import { clearTierCache, creditCoins, rewardReceiver, spend } from '../src/services/wallet.js';
import { billingTick, chargeMinute, stopCallBilling } from '../src/services/calls.js';
import { createPending, fulfillPayment } from '../src/services/payments/packages.js';
import { hostOnlineTick } from '../src/services/hostStats.js';
import { markOffline, markOnline, setIo } from '../src/realtime/hub.js';
import { csvCell } from '../src/routes/adminAgency.js';

const PORT = 4556;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;
const stamp = Date.now().toString(36);
let seq = 0;

async function api<T = any>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: T; text: string }> {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { status: res.status, data, text };
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

async function mkUser(data: Record<string, unknown> = {}) {
  const u = await prisma.user.create({ data: { name: `M${++seq}`, email: `m${seq}_${stamp}@test.az`, onboarded: true, gender: 'FEMALE', ...data } });
  return { id: u.id, token: signAccess({ id: u.id, role: (data.role as 'ADMIN') ?? 'USER' }) };
}

async function mkAgency(status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' = 'ACTIVE', customShare: number | null = null) {
  const owner = await mkUser({ kycStatus: 'APPROVED', hostStatus: 'APPROVED' });
  const a = await prisma.agency.create({ data: { name: `Ag ${stamp}${seq}`, code: `T${stamp}${seq}`.toUpperCase().slice(-8), ownerId: owner.id, status, customShare } });
  await prisma.user.update({ where: { id: owner.id }, data: { agencyId: a.id } });
  return { owner, agency: a };
}

async function bal(id: string) {
  return prisma.user.findUniqueOrThrow({ where: { id }, select: { coins: true, promoCoins: true, diamonds: true, diamondsBought: true } });
}

async function ledgerOk(id: string) {
  const u = await bal(id);
  const c = await prisma.walletTransaction.aggregate({ where: { userId: id, currency: 'COIN' }, _sum: { amount: true } });
  const d = await prisma.walletTransaction.aggregate({ where: { userId: id, currency: 'DIAMOND' }, _sum: { amount: true } });
  assert.equal(c._sum.amount ?? 0, u.coins, 'COIN ledger = balans');
  assert.equal(d._sum.amount ?? 0, u.diamonds, 'DIAMOND ledger = balans');
}

async function main() {
  const app = await buildApp();
  await app.ready();
  await app.listen({ port: PORT, host: '127.0.0.1' });
  const admin = await mkUser({ role: 'ADMIN' });
  try {
    await step('Bölgü: host 15% sabit, agentlik səviyyə payı, aşağı yuvarlaqlaşdırma', async () => {
      assert.deepEqual(splitEarnings(100, 0.15), { host: 15, agency: 15, platform: 70 });
      assert.deepEqual(splitEarnings(100, 0.2), { host: 15, agency: 20, platform: 65 }, 'agentlik böyüyəndə host payı azalmır');
      assert.deepEqual(splitEarnings(7, 0.15), { host: 1, agency: 1, platform: 5 });
      assert.deepEqual(splitEarnings(0, 0.15), { host: 0, agency: 0, platform: 0 });
      assert.equal(splitEarnings(100, 0.9).agency, 30, 'komissiya 30%-dən çox ola bilməz');
    });

    await step('Eyni anda 10 xərc: ikiqat xərc yoxdur, balans mənfi olmur', async () => {
      const u = await mkUser();
      await prisma.$transaction((tx) => creditCoins(tx, u.id, 100, 'PURCHASE'));
      const res = await Promise.allSettled(Array.from({ length: 10 }, () => prisma.$transaction((tx) => spend(tx, u.id, 30, 'TEST'))));
      assert.equal(res.filter((r) => r.status === 'fulfilled').length, 3);
      assert.equal((await bal(u.id)).coins, 10);
      await ledgerOk(u.id);
      await assert.rejects(prisma.user.update({ where: { id: u.id }, data: { coins: -1 } }), 'DB CHECK: mənfi balans qadağandır');
    });

    await step('Promo Nar birinci xərclənir və hosta Almaz yaratmır', async () => {
      const man = await mkUser({ gender: 'MALE' });
      const { agency } = await mkAgency();
      const host = await mkUser({ agencyId: agency.id, hostStatus: 'APPROVED' });
      await prisma.$transaction(async (tx) => {
        await creditCoins(tx, man.id, 50, 'BONUS', undefined, '', true);
        await creditCoins(tx, man.id, 50, 'PURCHASE');
      });
      const r = await prisma.$transaction(async (tx) => {
        const s = await spend(tx, man.id, 80, 'GIFT_SENT');
        return { s, d: await rewardReceiver(tx, host.id, s.paid, 'GIFT_RECEIVED', 'x') };
      });
      assert.equal(r.s.paid, 30, '50 promo + 30 ödənişli');
      assert.equal(r.d, Math.floor(30 * ECONOMY.hostShare));
      const b = await bal(man.id);
      assert.deepEqual([b.coins, b.promoCoins], [20, 0]);
    });

    await step('Agentlik: komissiya sahibə, fərdi faiz, dayandırılmış agentlik, agentliksiz host, sahib-host', async () => {
      const { owner, agency } = await mkAgency('ACTIVE', 0.25);
      const host = await mkUser({ agencyId: agency.id, hostStatus: 'APPROVED' });
      await prisma.$transaction((tx) => rewardReceiver(tx, host.id, 1000, 'CALL_EARNED', 'c1'));
      assert.equal((await bal(host.id)).diamonds, 150);
      assert.equal((await bal(owner.id)).diamonds, 250, 'fərdi 25% komissiya');
      const e = await prisma.hostEarning.findFirstOrThrow({ where: { hostId: host.id } });
      assert.deepEqual([e.source, e.paidCoins, e.hostAmount, e.agencyAmount], ['CALL', 1000, 150, 250]);
      // Sahib özü host kimi qazananda hər iki pay ona
      await prisma.$transaction((tx) => rewardReceiver(tx, owner.id, 100, 'GIFT_RECEIVED', 'g1'));
      assert.equal((await bal(owner.id)).diamonds, 250 + 15 + 25);
      // Dayandırılmış agentlik və agentliksiz host — qazanc yoxdur
      const s = await mkAgency('SUSPENDED');
      const h2 = await mkUser({ agencyId: s.agency.id, hostStatus: 'APPROVED' });
      const solo = await mkUser({ hostStatus: 'APPROVED' });
      assert.equal(await prisma.$transaction((tx) => rewardReceiver(tx, h2.id, 1000, 'GIFT_RECEIVED')), 0);
      assert.equal(await prisma.$transaction((tx) => rewardReceiver(tx, solo.id, 1000, 'GIFT_RECEIVED')), 0);
      await ledgerOk(host.id);
      await ledgerOk(owner.id);
    });

    await step('Agentlik səviyyəsi yalnız bu agentlikdə qazanılanla hesablanır (keş təmizlənir)', async () => {
      const { agency } = await mkAgency();
      const host = await mkUser({ agencyId: agency.id, hostStatus: 'APPROVED' });
      await prisma.hostEarning.create({ data: { hostId: host.id, agencyId: agency.id, source: 'GIFT', paidCoins: 400_000, hostAmount: 60_000, agencyAmount: 60_000 } });
      clearTierCache(agency.id);
      const r = await api('GET', `/agencies/public/${agency.code}`);
      assert.equal(r.data.tier, 2, '120 000 → Gümüş');
    });

    await step('Zəng: eyni dəqiqə iki dəfə tutulmur; balans bitəndə zəng bitir', async () => {
      const { agency } = await mkAgency();
      const man = await mkUser({ gender: 'MALE' });
      const host = await mkUser({ agencyId: agency.id, hostStatus: 'APPROVED' });
      await prisma.$transaction((tx) => creditCoins(tx, man.id, 100, 'PURCHASE'));
      const call = await prisma.call.create({ data: { callerId: man.id, calleeId: host.id, type: 'VIDEO', pricePerMin: 40, channel: `t_${stamp}_${seq}`, status: 'ACTIVE', startedAt: new Date() } });
      const r = await Promise.all([chargeMinute(call.id), chargeMinute(call.id), chargeMinute(call.id)]);
      assert.ok(r.every(Boolean));
      let c = await prisma.call.findUniqueOrThrow({ where: { id: call.id } });
      assert.equal(c.billedMinutes, 1, 'paralel çağırışlarda bir dəqiqə');
      assert.equal((await bal(man.id)).coins, 60);
      // 2-ci dəqiqə vaxtı çatıb → ödənir; 3-cü dəqiqəyə balans çatmır → zəng bitir
      await billingTick(Date.now() + 61_000);
      assert.equal((await bal(man.id)).coins, 20);
      await billingTick(Date.now() + 121_000);
      c = await prisma.call.findUniqueOrThrow({ where: { id: call.id } });
      assert.equal(c.status, 'ENDED');
      assert.equal(c.endReason, 'INSUFFICIENT_COINS');
      assert.equal(c.coinsSpent, 80);
      assert.equal((await bal(man.id)).coins, 20, 'son dəqiqə tutulmadı, mənfi yoxdur');
      assert.equal((await bal(host.id)).diamonds, 2 * Math.floor(40 * ECONOMY.hostShare));
      await ledgerOk(man.id);
    });

    await step('Zəng: bağlantı 45 saniyədən çox kəsiləndə zəng bitir (artıq ödəniş tutulmur)', async () => {
      const man = await mkUser({ gender: 'MALE' });
      const host = await mkUser({ hostStatus: 'APPROVED' });
      await prisma.$transaction((tx) => creditCoins(tx, man.id, 1000, 'PURCHASE'));
      const call = await prisma.call.create({ data: { callerId: man.id, calleeId: host.id, type: 'VOICE', pricePerMin: 40, channel: `d_${stamp}_${seq}`, status: 'ACTIVE', startedAt: new Date(), billedMinutes: 1, coinsSpent: 40 } });
      const fakeRoom = { emit: () => true };
      setIo({ to: () => fakeRoom } as never);
      markOnline(host.id); // yalnız host bağlıdır, zəng edən yoxdur
      try {
        const t0 = Date.now();
        await billingTick(t0);
        assert.equal((await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).status, 'ACTIVE');
        await billingTick(t0 + 46_000);
        const c = await prisma.call.findUniqueOrThrow({ where: { id: call.id } });
        assert.equal(c.status, 'ENDED');
        assert.equal(c.endReason, 'DISCONNECTED');
        assert.equal((await bal(man.id)).coins, 1000, 'bağlantı kəsiləndən sonra dəqiqə tutulmadı');
      } finally {
        markOffline(host.id);
        setIo(null as never);
      }
    });

    await step('Çıxarış: KYC, minimum, 7 günlük gözləmə, paralel sorğularda yalnız biri keçir', async () => {
      const { agency } = await mkAgency();
      const host = await mkUser({ agencyId: agency.id, hostStatus: 'APPROVED', kycStatus: 'NONE' });
      // Köhnə qazanc (gözləmə bitib) + yeni qazanc (gözləmədə)
      await prisma.user.update({ where: { id: host.id }, data: { diamonds: 20_000 } });
      await prisma.walletTransaction.create({ data: { userId: host.id, currency: 'DIAMOND', amount: 20_000, balanceAfter: 20_000, type: 'GIFT_RECEIVED', createdAt: new Date(Date.now() - 10 * 86400_000) } });
      await prisma.$transaction((tx) => rewardReceiver(tx, host.id, 40_000, 'GIFT_RECEIVED', 'new'));
      const body = { diamonds: 6000, method: 'CARD', account: '4169738800001111' };
      assert.equal((await api('POST', '/wallet/withdraw', host.token, body)).data.error, 'KYC_REQUIRED');
      await prisma.user.update({ where: { id: host.id }, data: { kycStatus: 'APPROVED' } });
      assert.equal((await api('POST', '/wallet/withdraw', host.token, { ...body, diamonds: 100 })).status, 400, 'minimumdan az');
      const held = await api('POST', '/wallet/withdraw', host.token, { ...body, diamonds: 21_000 });
      assert.equal(held.data.error, 'WITHDRAW_HELD');
      assert.equal(held.data.available, 20_000);
      const res = await Promise.all(Array.from({ length: 5 }, () => api('POST', '/wallet/withdraw', host.token, body)));
      assert.equal(res.filter((r) => r.status === 200).length, 1, JSON.stringify(res.map((r) => r.data.error)));
      const b = await bal(host.id);
      assert.equal(b.diamonds, 20_000 + 6000 - 6000);
      const w = res.find((r) => r.status === 200)!.data.withdrawal;
      assert.equal(w.amountQepik + w.feeQepik, 6000);
      // Admin: təsdiq → paralel iki rədd → Almaz bir dəfə qaytarılır
      assert.equal((await api('POST', `/admin/withdrawals/${w.id}`, admin.token, { status: 'APPROVED' })).status, 200);
      const rej = await Promise.all([1, 2].map(() => api('POST', `/admin/withdrawals/${w.id}`, admin.token, { status: 'REJECTED', reason: 'Hesab məlumatı səhvdir' })));
      assert.equal(rej.filter((r) => r.status === 200).length, 1);
      assert.equal((await bal(host.id)).diamonds, 26_000, 'bir dəfə qaytarıldı');
      const mine = await api('GET', '/wallet/withdrawals', host.token);
      assert.equal(mine.data.items[0].rejectReason, 'Hesab məlumatı səhvdir');
      assert.equal((await api('POST', `/admin/withdrawals/${w.id}`, admin.token, { status: 'PAID' })).data.error, 'WITHDRAW_PROCESSED');
      await ledgerOk(host.id);
      const csv = await api('GET', '/admin/withdrawals.csv', admin.token);
      assert.ok(csv.text.includes(w.id) && csv.text.includes('reject_reason'));
    });

    await step('Ödəniş idempotentliyi: eyni ödəniş paralel tamamlananda bir dəfə yazılır', async () => {
      const u = await mkUser({ gender: 'MALE', firstRechargeDone: true });
      const p = await createPending(u.id, 'DEV', 'coins_600', `idem_${stamp}`);
      const again = await createPending(u.id, 'DEV', 'coins_600', `idem_${stamp}`);
      assert.equal(again.id, p.id);
      const r = await Promise.all([fulfillPayment(p.id), fulfillPayment(p.id), fulfillPayment(p.id)]);
      assert.equal(r.filter((x) => !x.already).length, 1);
      assert.equal((await bal(u.id)).coins, p.coins);
      await ledgerOk(u.id);
    });

    await step('Mübadilə: alınmış Almaz birinci, balans çatmayanda xəta', async () => {
      const u = await mkUser();
      await prisma.user.update({ where: { id: u.id }, data: { diamonds: 50, diamondsBought: 30 } });
      await prisma.walletTransaction.create({ data: { userId: u.id, currency: 'DIAMOND', amount: 50, balanceAfter: 50, type: 'PURCHASE' } });
      const r = await Promise.all([1, 2, 3].map(() => api('POST', '/wallet/exchange', u.token, { diamonds: 20 })));
      assert.equal(r.filter((x) => x.status === 200).length, 2);
      const b = await bal(u.id);
      assert.deepEqual([b.diamonds, b.diamondsBought, b.coins], [10, 0, 40]);
      await ledgerOk(u.id);
    });

    await step('Dəvət kodu ilə qoşulma, sahib paneli, paralel təsdiq, çıxış və cooldown, hostu çıxarmaq', async () => {
      const { owner, agency } = await mkAgency();
      const girl = await mkUser({ hostStatus: 'NONE' });
      // Host şərtləri testdə tamamlanmış sayılır: profil, post, KYC, 10 söhbət
      await prisma.user.update({ where: { id: girl.id }, data: { createdAt: new Date(Date.now() - 10 * 86400_000), avatarUrl: 'https://x.az/a.jpg', bio: 'Salam, mən Ayselam', kycStatus: 'APPROVED' } });
      for (let i = 0; i < 3; i++) await prisma.photo.create({ data: { userId: girl.id, url: `https://x.az/${i}.jpg`, order: i } });
      await prisma.video.create({ data: { userId: girl.id, url: 'https://x.az/v.mp4' } });
      for (let i = 0; i < 10; i++) {
        const p = await mkUser({ gender: 'MALE' });
        const [a, b] = [girl.id, p.id].sort();
        const c = await prisma.conversation.create({ data: { userAId: a, userBId: b } });
        await prisma.message.create({ data: { conversationId: c.id, senderId: girl.id, text: 'Salam' } });
      }
      const pub = await api('GET', `/agencies/public/${agency.code.toLowerCase()}`);
      assert.equal(pub.data.name, agency.name);
      assert.equal((await api('POST', '/agencies/join', girl.token, { code: 'NOPE99' })).data.error, 'AGENCY_NOT_FOUND');
      const j = await api('POST', '/agencies/join', girl.token, { code: agency.code.toLowerCase(), message: 'Salam!' });
      assert.equal(j.status, 200, JSON.stringify(j.data));
      assert.equal((await api('POST', '/agencies/join', girl.token, { code: agency.code })).data.error, 'REQUEST_PENDING');
      const dash = await api('GET', '/agencies/me?period=today', owner.token);
      assert.equal(dash.data.requests.length, 1);
      assert.equal(dash.data.requests[0].source, 'CODE');
      assert.ok(dash.data.agency.inviteLink.includes(agency.code));
      const rid = dash.data.requests[0].id;
      const ap = await Promise.all([1, 2].map(() => api('POST', `/agencies/requests/${rid}/approve`, owner.token, {})));
      assert.equal(ap.filter((r) => r.status === 200).length, 1);
      const g = await prisma.user.findUniqueOrThrow({ where: { id: girl.id } });
      assert.equal(g.agencyId, agency.id);
      assert.equal(g.hostStatus, 'APPROVED');
      // Qazanc → panel: dövr qazancı, komissiya, mənbə bölgüsü, onlayn vaxt
      await prisma.$transaction((tx) => rewardReceiver(tx, girl.id, 1000, 'GIFT_RECEIVED', 'gx'));
      await prisma.$transaction((tx) => rewardReceiver(tx, girl.id, 200, 'MESSAGE_EARNED', 'mx'));
      await prisma.user.update({ where: { id: girl.id }, data: { online: true } });
      await hostOnlineTick();
      await hostOnlineTick();
      const d2 = await api('GET', '/agencies/me?period=today', owner.token);
      const row = d2.data.members.find((m: any) => m.user.id === girl.id);
      assert.equal(row.earnings, 150 + 30);
      assert.equal(row.commission, 150 + 30);
      assert.equal(row.onlineMin, 2);
      assert.equal(row.bySource.GIFT, 150);
      assert.equal(d2.data.stats.commission, 180);
      assert.equal(d2.data.stats.bySource.MESSAGE, 30);
      // Hostun öz paneli
      const he = await api('GET', '/host/earnings', girl.token);
      assert.equal(he.data.periods.today.total, 180);
      assert.equal(he.data.periods.month.bySource.GIFT, 150);
      assert.equal(he.data.targets.today.onlineMin, 2);
      assert.equal(he.data.agency.id, agency.id);
      const my = await api('GET', '/agencies/my', girl.token);
      assert.equal(my.data.agency.name, agency.name);
      // Sahib çıxa bilməz; host çıxır → cooldown; sahib başqa hostu çıxaranda cooldown yoxdur
      assert.equal((await api('POST', '/agencies/leave', owner.token, {})).data.error, 'OWNER_CANNOT_LEAVE');
      const lv = await api('POST', '/agencies/leave', girl.token, {});
      assert.ok(new Date(lv.data.cooldownUntil).getTime() > Date.now() + 6 * 86400_000);
      assert.equal((await api('POST', '/agencies/join', girl.token, { code: agency.code })).data.error, 'AGENCY_COOLDOWN');
      const other = await mkUser({ agencyId: agency.id, hostStatus: 'APPROVED' });
      assert.equal((await api('DELETE', `/agencies/members/${other.id}`, owner.token)).data.removed, 1);
      const o = await prisma.user.findUniqueOrThrow({ where: { id: other.id } });
      assert.deepEqual([o.agencyId, o.agencyLeftAt], [null, null]);
      // Kod yenilənir — köhnə kod işləmir
      const rot = await api('POST', '/agencies/me/rotate-code', owner.token, {});
      assert.notEqual(rot.data.code, agency.code);
      assert.equal((await api('GET', `/agencies/public/${agency.code}`)).status, 404);
    });

    await step('Admin: fərdi komissiya, hostlar hesabatı, həftəlik hesabat bağlanır (təkrar yox), CSV', async () => {
      const { owner, agency } = await mkAgency();
      const host = await mkUser({ agencyId: agency.id, hostStatus: 'APPROVED' });
      const set = await api('POST', `/admin/agencies/${agency.id}`, admin.token, { customShare: 0.18 });
      assert.equal(set.data.agency.customShare, 0.18);
      assert.equal((await api('POST', `/admin/agencies/${agency.id}`, admin.token, { customShare: 0.5 })).status, 400);
      await prisma.$transaction((tx) => rewardReceiver(tx, host.id, 1000, 'CALL_EARNED', 'cc'));
      assert.equal((await bal(owner.id)).diamonds, 180);
      const hosts = await api('GET', `/admin/agencies/${agency.id}/hosts?period=week`, admin.token);
      assert.equal(hosts.data.items.find((h: any) => h.id === host.id).hostAmount, 150);
      // Keçən həftəyə aid qazanc yaradılır və həftə bağlanır
      const lastWeek = weekKey(new Date(Date.now() - 7 * 86400_000));
      await prisma.hostEarning.create({ data: { hostId: host.id, agencyId: agency.id, source: 'GIFT', paidCoins: 2000, hostAmount: 300, agencyAmount: 300, createdAt: new Date(`${lastWeek}T12:00:00+04:00`) } });
      const st = await api('GET', `/admin/settlements?week=${lastWeek}`, admin.token);
      const mine = st.data.items.find((x: any) => x.agencyId === agency.id);
      assert.deepEqual([mine.paidCoins, mine.agencyAmount, mine.hosts], [2000, 300, 1]);
      assert.equal((await api('POST', '/admin/settlements/close', admin.token, { agencyId: agency.id, week: weekKey() })).data.error, 'WEEK_NOT_FINISHED');
      const cl = await Promise.all([1, 2].map(() => api('POST', '/admin/settlements/close', admin.token, { agencyId: agency.id, week: lastWeek })));
      assert.equal(cl.filter((r) => r.status === 200).length, 1);
      const csv = await api('GET', `/admin/settlements.csv?week=${lastWeek}`, admin.token);
      assert.ok(csv.text.includes(agency.code));
      const rep = await api('GET', `/admin/agencies/${agency.id}/report.csv?week=${lastWeek}`, admin.token);
      assert.ok(rep.text.includes('GIFT'));
      assert.equal((await api('GET', '/admin/settlements?week=2026-13-01', admin.token)).data.error, 'INVALID_WEEK');
      assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`, 'CSV formula inyeksiyası');
      assert.equal((await api('GET', '/admin/settlements', owner.token)).status, 403);
    });

    console.log(`\n${passed} pul testi keçdi ✅`);
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
