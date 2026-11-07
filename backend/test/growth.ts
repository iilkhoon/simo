/**
 * Böyümə mexanikalarının testləri: mövsümi kampaniyalar (admin CRUD, görünmə, reytinq, anons push-u)
 * və "host onlayn oldu" izləyici bildirişi (tezlik limiti, blok, gecə rejimi, izləyici başına gündəlik limit).
 *   DATABASE_URL=... npx tsx test/growth.ts
 */
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { signAccess } from '../src/lib/auth.js';
import { campaignTemplates, campaignTick, hostCameOnline, quietHours } from '../src/services/growth.js';

const PORT = Number(process.env.TEST_PORT_GROWTH ?? 4557);
const BASE = `http://127.0.0.1:${PORT}`;
const stamp = Date.now().toString(36);
let seq = 0;
let passed = 0;
const H = 3600_000;

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
  try { await fn(); passed++; console.log(`  ✓ ${name}`); } catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

async function mkUser(data: Record<string, unknown> = {}) {
  const u = await prisma.user.create({ data: { name: `G${++seq}`, email: `g${seq}_${stamp}@test.az`, onboarded: true, gender: 'MALE', ...data } });
  return { id: u.id, token: signAccess({ id: u.id, role: (data.role as 'ADMIN') ?? 'USER' }) };
}

/** Bugün 12:00 Bakı vaxtı (08:00 UTC) — gecə rejiminə düşməyən sabit an */
function daytime() {
  const d = new Date();
  d.setUTCHours(8, 0, 0, 0);
  return d;
}

async function ensureGift(id: string, price: number, currency: 'COIN' | 'DIAMOND' = 'COIN') {
  await prisma.gift.upsert({ where: { id }, update: { active: true }, create: { id, nameAz: id, nameRu: id, nameEn: id, price, currency } });
}

async function gt(giftId: string, senderId: string, receiverId: string, coins: number, createdAt = new Date()) {
  await prisma.giftTransaction.create({ data: { giftId, senderId, receiverId, coins, diamonds: 0, context: 'PROFILE', createdAt } });
}

async function main() {
  const app = await buildApp();
  await app.ready();
  await app.listen({ port: PORT, host: '127.0.0.1' });
  const admin = await mkUser({ role: 'ADMIN' });
  const user = await mkUser();
  // Hər qaçışda öz hədiyyələri — əvvəlki qaçışların əməliyyatları reytinqə qarışmasın
  const ROSE = `t_rose_${stamp}`, BOUQUET = `t_bouquet_${stamp}`, CROWN = `t_crown_${stamp}`, DHEART = `t_dheart_${stamp}`;
  await ensureGift(ROSE, 1);
  await ensureGift(BOUQUET, 99);
  await ensureGift(CROWN, 999);
  await ensureGift(DHEART, 1000, 'DIAMOND');
  const now = Date.now();
  const base = {
    titleAz: 'Novruz', titleRu: 'Новруз', titleEn: 'Novruz', emoji: '🔥', giftIds: [ROSE, BOUQUET],
    startsAt: new Date(now - 2 * 24 * H).toISOString(), endsAt: new Date(now + 2 * 24 * H).toISOString(),
  };
  let campaignId = '';

  try {
    await step('Kampaniya: yalnız admin yarada bilər, tarix və hədiyyə yoxlanılır', async () => {
      assert.equal((await api('POST', '/admin/campaigns', user.token, { ...base, slug: `nv-${stamp}` })).status, 403);
      const bad = await api('POST', '/admin/campaigns', admin.token, { ...base, slug: `nv-${stamp}`, endsAt: base.startsAt });
      assert.equal(bad.status, 400); assert.equal(bad.data.error, 'BAD_DATES');
      const unk = await api('POST', '/admin/campaigns', admin.token, { ...base, slug: `nv-${stamp}`, giftIds: ['no_such_gift'] });
      assert.equal(unk.data.error, 'UNKNOWN_GIFT');
      const ok = await api('POST', '/admin/campaigns', admin.token, { ...base, slug: `nv-${stamp}` });
      assert.equal(ok.status, 200, JSON.stringify(ok.data));
      campaignId = ok.data.campaign.id;
      const dup = await api('POST', '/admin/campaigns', admin.token, { ...base, slug: `nv-${stamp}` });
      assert.equal(dup.data.error, 'SLUG_TAKEN');
    });

    await step('Kampaniya: tətbiqdə gedən görünür, 7 gündən uzaq gələcək görünmür, söndürülən görünmür', async () => {
      const far = await api('POST', '/admin/campaigns', admin.token, { ...base, slug: `far-${stamp}`, startsAt: new Date(now + 20 * 24 * H).toISOString(), endsAt: new Date(now + 22 * 24 * H).toISOString() });
      const soon = await api('POST', '/admin/campaigns', admin.token, { ...base, slug: `soon-${stamp}`, startsAt: new Date(now + 2 * 24 * H).toISOString(), endsAt: new Date(now + 3 * 24 * H).toISOString() });
      const off = await api('POST', '/admin/campaigns', admin.token, { ...base, slug: `off-${stamp}` });
      assert.equal((await api('DELETE', `/admin/campaigns/${off.data.campaign.id}`, admin.token)).status, 200);
      const r = await api('GET', '/campaigns', user.token);
      const slugs = r.data.items.map((c: any) => c.slug);
      assert.ok(slugs.includes(`nv-${stamp}`));
      assert.ok(slugs.includes(`soon-${stamp}`));
      assert.ok(!slugs.includes(`far-${stamp}`));
      assert.ok(!slugs.includes(`off-${stamp}`));
      const mine = r.data.items.find((c: any) => c.slug === `nv-${stamp}`);
      assert.equal(mine.status, 'live');
      assert.equal(mine.title.ru, 'Новруз');
      assert.equal(r.data.items.find((c: any) => c.slug === `soon-${stamp}`).status, 'upcoming');
      // gedən kampaniya siyahıda birincidir
      assert.equal(r.data.items[0].status, 'live');
      assert.equal(far.status, 200); assert.equal(soon.status, 200);
    });

    await step('Kampaniya reytinqi: yalnız kampaniya hədiyyələri və pəncərə daxilində; test hesabı görünmür', async () => {
      const h1 = await mkUser({ gender: 'FEMALE', hostStatus: 'APPROVED' });
      const h2 = await mkUser({ gender: 'FEMALE', hostStatus: 'APPROVED' });
      const s1 = await mkUser();
      const s2 = await mkUser();
      const tester = await mkUser({ isTester: true });
      await gt(BOUQUET, s1.id, h1.id, 990);
      await gt(ROSE, s2.id, h2.id, 500);
      await gt(ROSE, s2.id, h1.id, 100);
      await gt(CROWN, s2.id, h2.id, 9990); // kampaniya hədiyyəsi deyil
      await gt(BOUQUET, s2.id, h2.id, 5000, new Date(now - 5 * 24 * H)); // kampaniyadan əvvəl
      await gt(BOUQUET, tester.id, h2.id, 99000);
      const r = await api('GET', `/campaigns/${campaignId}`, s2.token);
      assert.equal(r.status, 200, JSON.stringify(r.data));
      const senders = r.data.senders.map((x: any) => [x.user.id, x.score]);
      assert.deepEqual(senders.slice(0, 2), [[s1.id, 990], [s2.id, 600]]);
      assert.ok(!senders.some(([id]: [string]) => id === tester.id), 'tester reytinqdə yoxdur');
      const hosts = r.data.hosts.map((x: any) => [x.user.id, x.score]);
      assert.deepEqual(hosts.find(([id]: [string]) => id === h1.id), [h1.id, 1090]);
      // h2: 500 (rose) + 99000 (tester göndərib — qəbul edən host sayılır) — tester yalnız özü gizlənir
      assert.equal(hosts[0][0], h2.id);
      assert.deepEqual(r.data.me, { sent: 600, received: 0 });
      assert.equal(r.data.senders[0].rank, 1);
      // slug ilə də açılır
      assert.equal((await api('GET', `/campaigns/nv-${stamp}`, s2.token)).status, 200);
    });

    await step('Kampaniya: hədiyyə siyahısı boşdursa — bütün hədiyyələr (Nar və Almaz eyni qəpik dəyərində)', async () => {
      const c = await api('POST', '/admin/campaigns', admin.token, { ...base, slug: `all-${stamp}`, giftIds: [] });
      const h = await mkUser({ gender: 'FEMALE', hostStatus: 'APPROVED' });
      const s = await mkUser();
      await gt(CROWN, s.id, h.id, 999);
      await gt(DHEART, s.id, h.id, 1000);
      const r = await api('GET', `/campaigns/${c.data.campaign.id}`, s.token);
      assert.equal(r.data.senders.find((x: any) => x.user.id === s.id).score, 1999);
    });

    await step('Kampaniya anonsu: bir dəfə göndərilir, gecə gözləyir', async () => {
      const fresh = await mkUser({ lastSeenAt: new Date(Date.now() + 60_000) });
      const night = new Date(daytime().getTime() + 12 * H); // 00:00 Bakı
      assert.ok(quietHours(night));
      assert.equal(await campaignTick(night, 20), 0);
      const n1 = await campaignTick(daytime(), 20);
      assert.ok(n1 > 0);
      const got = await prisma.notification.findMany({ where: { userId: fresh.id, type: 'campaign' } });
      assert.ok(got.length >= 1);
      assert.equal(await campaignTick(daytime(), 20), 0, 'ikinci dəfə göndərilmir');
      const after = await prisma.notification.count({ where: { userId: fresh.id, type: 'campaign' } });
      assert.equal(after, got.length);
    });

    await step('Admin: PATCH tarixləri yoxlayır, şablonlar gələcək tarixlidir', async () => {
      const bad = await api('PATCH', `/admin/campaigns/${campaignId}`, admin.token, { endsAt: new Date(now - 10 * 24 * H).toISOString() });
      assert.equal(bad.data.error, 'BAD_DATES');
      const ok = await api('PATCH', `/admin/campaigns/${campaignId}`, admin.token, { prizesAz: '1-ci yer: 10 000 Nar' });
      assert.equal(ok.data.campaign.prizesAz, '1-ci yer: 10 000 Nar');
      const t = await api('GET', '/admin/campaigns/templates', admin.token);
      assert.equal(t.data.items.length, 5);
      for (const x of campaignTemplates()) assert.ok(x.endsAt > new Date() && x.endsAt > x.startsAt, x.slug);
      const list = await api('GET', '/admin/campaigns', admin.token);
      assert.ok(list.data.items.some((c: any) => c.id === campaignId));
    });

    await step('Host onlayn oldu: izləyicilərə push; blok, onlayn, tokensiz xaric; 6 saat limiti', async () => {
      const host = await mkUser({ gender: 'FEMALE', hostStatus: 'APPROVED', name: 'Aysel' });
      const payer = await mkUser({ pushToken: 'test-token' });
      const plain = await mkUser({ pushToken: 'test-token' });
      const blocked = await mkUser({ pushToken: 'test-token' });
      const online = await mkUser({ pushToken: 'test-token', online: true });
      const noToken = await mkUser();
      for (const f of [payer, plain, blocked, online, noToken]) await prisma.follow.create({ data: { followerId: f.id, followingId: host.id } });
      await prisma.block.create({ data: { blockerId: blocked.id, blockedId: host.id } });
      await gt(ROSE, payer.id, host.id, 50);
      const t0 = daytime();
      assert.equal(await hostCameOnline(host.id, t0), 2);
      const n = await prisma.notification.findMany({ where: { type: 'host_online', actorId: host.id } });
      assert.deepEqual(new Set(n.map((x) => x.userId)), new Set([payer.id, plain.id]));
      assert.equal((n[0].data as any).name, 'Aysel');
      assert.equal(await hostCameOnline(host.id, new Date(t0.getTime() + H)), 0, '6 saat ərzində təkrar yoxdur');
      // 6 saat keçdi — yenə göndərilir; izləyici başına gündə 2 limitindən sonra dayanır
      await prisma.hostOnlineAlert.update({ where: { hostId: host.id }, data: { sentAt: new Date(t0.getTime() - 7 * H) } });
      assert.equal(await hostCameOnline(host.id, t0), 2);
      await prisma.hostOnlineAlert.update({ where: { hostId: host.id }, data: { sentAt: new Date(t0.getTime() - 7 * H) } });
      assert.equal(await hostCameOnline(host.id, t0), 0, 'gündəlik limit');
      const rec = await prisma.hostOnlineAlert.findUniqueOrThrow({ where: { hostId: host.id } });
      assert.equal(rec.reached, 0);
    });

    await step('Host onlayn oldu: host olmayan, gizli rejim, "məşğul" və gecə — göndərilmir', async () => {
      const notHost = await mkUser({ gender: 'FEMALE' });
      const incog = await mkUser({ gender: 'FEMALE', hostStatus: 'APPROVED', incognito: true });
      const busy = await mkUser({ gender: 'FEMALE', hostStatus: 'APPROVED', presence: 'BUSY' });
      const night = await mkUser({ gender: 'FEMALE', hostStatus: 'APPROVED' });
      const f = await mkUser({ pushToken: 'test-token' });
      for (const h of [notHost, incog, busy, night]) await prisma.follow.create({ data: { followerId: f.id, followingId: h.id } });
      assert.equal(await hostCameOnline(notHost.id, daytime()), 0);
      assert.equal(await hostCameOnline(incog.id, daytime()), 0);
      assert.equal(await hostCameOnline(busy.id, daytime()), 0);
      assert.equal(await hostCameOnline(night.id, new Date(daytime().getTime() + 13 * H)), 0);
      // gecə cəhdi limiti "yandırmır" — səhər göndərilir
      assert.equal(await hostCameOnline(night.id, daytime()), 1);
    });

    console.log(`\ngrowth: ${passed} test keçdi`);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
