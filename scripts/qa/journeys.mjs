#!/usr/bin/env node
/**
 * Simo — uçdan-uca QA səyahətləri (veb build + Playwright, iki brauzer konteksti: kişi istifadəçi və qadın host).
 *
 * Hazırlıq:
 *   1) Ayrı DB:  createdb simo_qa ; cd backend && DATABASE_URL=.../simo_qa npx prisma migrate deploy && npx tsx prisma/seed.ts
 *   2) Backend:  cd backend && DATABASE_URL=.../simo_qa PORT=4790 PUBLIC_URL=http://localhost:4790 npx tsx src/index.ts
 *   3) Veb:      cd mobile && EXPO_PUBLIC_API_URL=http://localhost:4790 npx expo export -p web --output-dir /tmp/simo-web --clear
 *   4) İşə sal:  QA_WEB_DIR=/tmp/simo-web QA_API=http://localhost:4790 DATABASE_URL=.../simo_qa node scripts/qa/journeys.mjs [--only=1,2,3]
 *
 * Ekran şəkilləri QA_OUT qovluğuna (standart: ./qa-out) yazılır. Hər səyahət müstəqildir — öz istifadəçilərini yaradır.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { api, chromium, clickIcon, closeSql, glyph, login, newCtx, OUT, rawKeys, Results, seeText, serveWeb, shot, sleep, sql, testPng, visibleTexts, WEB } from './lib.mjs';

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean).map(Number);
const want = (n) => !only.length || only.includes(n);
const stamp = Date.now().toString().slice(-6);
let phoneSeq = 0;
// Hər işə salmada təsadüfi operator + 4 rəqəm, sonra 3 rəqəmli sıra — nömrələr toqquşmur
const phoneRun = `${['50', '51', '55', '70', '77'][Math.floor(Math.random() * 5)]}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
const newPhone = () => `+994${phoneRun}${String(phoneSeq++).padStart(3, '0')}`;
const PNG = testPng(path.join(OUT, 'test.png'));

/** API ilə tam onboarding olunmuş istifadəçi */
async function makeUser({ gender, name, phone = newPhone(), birth = '1996-04-10' }) {
  const tk = await login(phone);
  const up = await uploadPng(tk.accessToken);
  const r = await api('PUT', '/me/onboarding', tk.accessToken, {
    name, gender, birthDate: new Date(birth).toISOString(), lookingFor: 'RELATIONSHIP', interests: ['music', 'travel', 'coffee'],
    interestedIn: gender === 'MALE' ? 'FEMALE' : 'MALE', ageMin: 18, ageMax: 40, languages: ['az'], avatarUrl: up, photos: [up], extra: {},
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return { ...tk, me: r.data, phone };
}

async function uploadPng(token) {
  const fd = new FormData();
  fd.append('file', new Blob([await (await import('node:fs')).promises.readFile(PNG)], { type: 'image/png' }), 'a.png');
  const res = await fetch(`${process.env.QA_API ?? 'http://localhost:4790'}/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  const d = await res.json();
  assert.ok(d.url, JSON.stringify(d));
  return d.url;
}

async function clickText(page, re, opts = {}) {
  await page.getByText(re).first().click({ timeout: 10000, ...opts });
}

/** Boş kvadrat foto xanasını tapıb klikləyir (onboarding / profil redaktəsi) */
async function clickEmptyTile(page, minW = 80) {
  const box = await page.evaluate((minW) => {
    const els = [...document.querySelectorAll('div')];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width < minW || r.width > 200 || Math.abs(r.height / r.width - 4 / 3) > 0.4 && Math.abs(r.height - r.width) > 10) continue;
      if (el.innerText.trim().length > 2 || el.querySelector('img')) continue;
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      if (!hit || !(el === hit || el.contains(hit))) continue;
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  }, minW);
  assert.ok(box, 'boş foto xanası tapılmadı');
  await page.mouse.click(box.x, box.y);
}

/** Hostu təsdiqlənmiş qadın (QA hazırlığı: SQL ilə; real axın 6-cı səyahətdə yoxlanılır) */
let qaAgency = null;
async function makeHost(name) {
  // Host Almazı yalnız aktiv agentlikdə yazılır (wallet.rewardReceiver) — QA agentliyi bir dəfə yaradılır
  if (!qaAgency) {
    const owner = await makeUser({ gender: 'FEMALE', name: `QA Agentlik ${stamp}` });
    const rows = await sql(`INSERT INTO "Agency" (id, name, code, "ownerId", status) VALUES ('qa' || md5(random()::text), $1, $2, $3, 'ACTIVE') RETURNING id`, [`QA Agency ${stamp}`, `QA${stamp}`, owner.me.id]);
    qaAgency = { id: rows[0].id, owner };
    await sql(`UPDATE "User" SET "agencyId"=$1 WHERE id=$2`, [qaAgency.id, owner.me.id]);
  }
  const h = await makeUser({ gender: 'FEMALE', name });
  await sql(`UPDATE "User" SET "hostStatus"='APPROVED', verified=true, "agencyId"=$1, "agencyJoinedAt"=now() WHERE id=$2`, [qaAgency.id, h.me.id]);
  return h;
}

/** Real alınmış Nar: promo balans sıfırlanır ki, hostun Almaz qazancı yoxlanıla bilsin */
async function fundUser(u, pkg = 'coins_600') {
  const r = await api('POST', '/payments/dev/purchase', u.accessToken, { packageId: pkg });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  await sql(`UPDATE "User" SET coins = coins - "promoCoins", "promoCoins" = 0 WHERE id=$1`, [u.me.id]);
  return (await api('GET', '/me', u.accessToken)).data;
}

const meOf = async (u) => (await api('GET', '/me', u.accessToken)).data;

/** Kəşf dəstəsində adı görünənə qədər "keç" (X) düyməsi */
async function swipeUntil(page, name, max = 25) {
  for (let i = 0; i < max; i++) {
    const vis = await page.getByText(new RegExp(name)).filter({ visible: true }).count();
    if (vis) return;
    await clickIcon(page, 'close', 0);
    await sleep(700);
  }
  throw new Error(`kəşfdə ${name} tapılmadı`);
}

let qaAdmin = null;
async function admin() {
  if (!qaAdmin) {
    qaAdmin = await makeUser({ gender: 'MALE', name: `QA Admin ${stamp}` });
    await sql(`UPDATE "User" SET role='ADMIN' WHERE id=$1`, [qaAdmin.me.id]);
  }
  return qaAdmin;
}

/** API ilə KYC göndərir (sənəd + selfi) */
async function submitKyc(u, birth = '1995-04-10') {
  const url = await uploadPng(u.accessToken);
  const r = await api('POST', '/kyc', u.accessToken, { firstName: 'Test', lastName: 'Qa', birthDate: birth, docType: 'ID_CARD', docFrontUrl: url, selfieUrl: url });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data.verification.id;
}

async function consent(u, kind) {
  const s = (await api('GET', '/safety/me', u.accessToken)).data;
  const r = await api('POST', '/safety/consent', u.accessToken, { kind, version: s.versions[kind] });
  assert.equal(r.status, 200, JSON.stringify(r.data));
}

async function main() {
  const srv = await serveWeb();
  const browser = await chromium.launch();
  const R = new Results(browser);

  // ───────────── 1. Qeydiyyat ─────────────
  if (want(1)) await R.run('1. Telefonla qeydiyyat → 18+ razılıq → onboarding → ana səhifə', async () => {
    const { ctx, page } = await newCtx(browser, null);
    await page.goto(WEB);
    await seeText(page, /Telefon nömrəsi ilə davam et/);
    // razılıq olmadan keçmək olmur
    await clickText(page, /Telefon nömrəsi ilə davam et/);
    await sleep(500);
    assert.ok(!page.url().includes('phone'), 'razılıq olmadan telefon ekranına keçməməlidir');
    await page.getByRole('checkbox').first().click();
    await clickText(page, /Telefon nömrəsi ilə davam et/);
    await page.waitForURL(/phone/);
    const ph = newPhone();
    await page.locator('input:visible').first().fill(ph.slice(4));
    await clickText(page, /Kodu göndər/);
    await page.waitForURL(/otp/);
    await page.waitForURL(/onboarding/, { timeout: 15000 });
    await shot(page, '1-onboarding-name');
    await page.locator('input:visible').first().fill('QA Kişi');
    await clickText(page, /^Növbəti$|^Davam$/);
    await clickText(page, /^Kişi$/);
    await clickText(page, /^Növbəti$|^Davam$/);
    const ins = page.locator('input:visible');
    // 17 yaş — keçid bağlıdır
    const y17 = new Date().getFullYear() - 17;
    await ins.nth(0).fill('01'); await ins.nth(1).fill('01'); await ins.nth(2).fill(String(y17));
    await sleep(300);
    await shot(page, '1-onboarding-underage');
    await ins.nth(2).fill('1995');
    await clickText(page, /^Növbəti$|^Davam$/);
    // foto
    await sleep(600);
    await shot(page, '1-onboarding-photo-empty');
    const fc = page.waitForEvent('filechooser', { timeout: 10000 });
    await clickEmptyTile(page);
    const chooser = await fc;
    await chooser.setFiles(PNG);
    await sleep(3000); await shot(page, '1-onboarding-photo-after');
    await page.locator('img:visible').first().waitFor({ timeout: 15000 });
    await shot(page, '1-onboarding-photo');
    await clickText(page, /^Növbəti$|^Davam$/);
    await clickText(page, /^Növbəti$|^Davam$/); // showMe (defolt: qadınlar)
    for (const i of ['Musiqi', 'Səyahət', 'Qəhvə']) await clickText(page, new RegExp(`${i}$`));
    await clickText(page, /^Növbəti$|^Davam$/);
    await clickText(page, /^Növbəti$|^Davam$/); // looking
    for (let k = 0; k < 3; k++) await clickText(page, /^Keç$/);
    await shot(page, '1-onboarding-last');
    const resp = page.waitForResponse((r) => r.url().includes('/me/onboarding'), { timeout: 10000 }).catch(() => null);
    await clickText(page, /Simo-ya başla/);
    const rr = await resp;
    assert.ok(rr, 'onboarding sorğusu göndərilmədi');
    assert.equal(rr.status(), 200, await rr.text());
    await page.waitForURL((u) => !u.pathname.includes('onboarding'), { timeout: 15000 });
    await sleep(1500);
    await shot(page, '1-home');
    const tk = await page.evaluate(() => localStorage.getItem('simo.access'));
    const me = await api('GET', '/me', tk);
    assert.equal(me.data.onboarded, true);
    assert.equal(me.data.gender, 'MALE');
    assert.ok(me.data.avatarUrl, 'avatar yüklənməlidir');
    await ctx.close();
  });


  // ───────────── 2. Kəşf → bəyən → uyğunluq → söhbət ─────────────
  if (want(2)) await R.run('2. Kəşf/svayp → bəyən → qarşılıqlı uyğunluq → uyğunluq ekranı → söhbət', async () => {
    const m = await makeUser({ gender: 'MALE', name: `Kamran${stamp}` });
    const f = await makeUser({ gender: 'FEMALE', name: `Leyla${stamp}` });
    const like = await api('POST', '/swipes', f.accessToken, { toId: m.me.id, action: 'LIKE' });
    assert.equal(like.data.matched, false);
    const M = await newCtx(browser, m);
    const F = await newCtx(browser, f);
    await F.page.goto(WEB + '/chats');
    await M.page.goto(WEB + '/');
    await M.page.getByText(/^Kəşf et$/).first().click();
    await sleep(2500);
    await swipeUntil(M.page, `Leyla${stamp}`);
    await shot(M.page, '2-discover-card');
    // böyük ürək düyməsi (72px) — kartdakı kiçik ikonlardan fərqli olaraq sonuncu görünən
    await clickIcon(M.page, 'heart', 0, { pick: 'largest' });
    await seeText(M.page, /Uyğunluq/);
    await shot(M.page, '2-match');
    await M.page.getByText(/Salam yaz/).first().click();
    await M.page.waitForURL(/\/chat\//);
    const box = M.page.locator('textarea:visible').last();
    await box.fill('Salam Leyla!');
    await clickIcon(M.page, 'arrowUp');
    await seeText(M.page, /Salam Leyla!/);
    // qız real vaxtda görür (söhbətlər siyahısı)
    await seeText(F.page, /Salam Leyla!/, 10000);
    await shot(F.page, '2-girl-chats');
    const convs = await api('GET', '/conversations', f.accessToken);
    assert.equal(convs.data.items[0].unread, 1);
    await M.ctx.close(); await F.ctx.close();
  });

  // ───────────── 3. Söhbət: pulsuz/ödənişli mesaj, şəkil, şikayət + blok ─────────────
  if (want(3)) await R.run('3. Söhbət: pulsuz ilk mesaj, ödənişli mesaj (Nar↓ Almaz↑), şəkil, şikayət+blok, bloklanan yaza bilmir', async () => {
    const m = await makeUser({ gender: 'MALE', name: `Rauf${stamp}` });
    const h = await makeHost(`Nigar${stamp}`);
    await fundUser(m);
    const M = await newCtx(browser, m);
    const H = await newCtx(browser, h);
    await M.page.goto(`${WEB}/user/${h.me.id}`);
    await seeText(M.page, new RegExp(`Nigar${stamp}`));
    await clickIcon(M.page, 'chat');
    await M.page.waitForURL(/\/chat\//);
    const convId = new URL(M.page.url()).pathname.split('/chat/')[1];
    assert.ok(convId && convId.length > 10, `söhbət id: ${M.page.url()}`);
    await H.page.goto(`${WEB}/chat/${convId}`);
    await seeText(M.page, /İlk mesaj pulsuzdur/);
    const box = () => M.page.locator('textarea:visible').last();
    const c0 = (await meOf(m)).coins;
    await box().fill('Salam!');
    await clickIcon(M.page, 'arrowUp');
    await seeText(H.page, /Salam!/);
    assert.equal((await meOf(m)).coins, c0, 'ilk mesaj pulsuz');
    await seeText(M.page, /Mesaj: \d+ Nar/);
    const price = Number((await M.page.getByText(/Mesaj: \d+ Nar/).first().innerText()).match(/\d+/)[0]);
    const d0 = (await meOf(h)).diamonds;
    await box().fill('Necəsən?');
    await clickIcon(M.page, 'arrowUp');
    await seeText(H.page, /Necəsən\?/);
    await sleep(500);
    const m1 = await meOf(m);
    assert.equal(m1.coins, c0 - price, 'ödənişli mesaj Nar çıxır');
    const h1 = await meOf(h);
    assert.ok(h1.diamonds > d0, `host Almaz qazanmalıdır (${d0} → ${h1.diamonds})`);
    await shot(M.page, '3-paid');
    // şəkil: qarşılıqlı izləmə olmadan icazə yoxdur → xəta mesajı
    let fc = M.page.waitForEvent('filechooser');
    await clickIcon(M.page, 'image', 0);
    await (await fc).setFiles(PNG);
    await seeText(M.page, /izlə/i, 8000).catch(async () => { await shot(M.page, '3-image-nofollow'); throw new Error('qarşılıqlı izləmə xətası göstərilmədi'); });
    await shot(M.page, '3-image-nofollow');
    await api('POST', `/users/${h.me.id}/follow`, m.accessToken, {});
    await api('POST', `/users/${m.me.id}/follow`, h.accessToken, {});
    await sleep(3500);
    fc = M.page.waitForEvent('filechooser');
    await clickIcon(M.page, 'image', 0);
    await (await fc).setFiles(PNG);
    await sleep(2500);
    const msgs = await api('GET', `/conversations/${convId}/messages`, m.accessToken);
    assert.ok(msgs.data.items.some((x) => x.type === 'IMAGE'), 'şəkil mesajı göndərilməlidir');
    await H.page.locator('img').filter({ visible: true }).nth(1).waitFor({ timeout: 8000 });
    await shot(H.page, '3-host-image');
    // host şikayət edir və bloklayır (söhbətdən)
    await clickIcon(H.page, 'dots');
    await H.page.getByText(/^Spam$/).filter({ visible: true }).first().click();
    await seeText(H.page, /bloklamaq istəyirsən/);
    await H.page.getByText(/^Blokla$/).filter({ visible: true }).first().click();
    await sleep(1200);
    await shot(H.page, '3-host-blocked');
    assert.equal((await H.page.locator('textarea:visible').count()), 0, 'bloklayandan sonra yazma sahəsi gizlənməlidir');
    // bloklanan kişi yaza bilmir
    const c2 = (await meOf(m)).coins;
    await box().fill('Niyə cavab vermirsən?');
    await clickIcon(M.page, 'arrowUp');
    await seeText(M.page, /əlçatan deyil/);
    await sleep(800);
    await shot(M.page, '3-man-blocked');
    assert.equal((await meOf(m)).coins, c2, 'bloklanmış mesaj üçün Nar çıxılmır');
    assert.equal((await M.page.locator('textarea:visible').count()), 0, 'bloklanan tərəfdə də yazma sahəsi gizlənməlidir');
    const reps = await sql(`SELECT reason FROM "Report" WHERE "reporterId"=$1`, [h.me.id]);
    assert.equal(reps[0]?.reason, 'SPAM');
    await M.ctx.close(); await H.ctx.close();
  });

  // ───────────── 4. Pul kisəsi: test hesabının demo alışı ─────────────
  if (want(4)) await R.run('4. Pul kisəsi: test hesabı demo alış → balans başlıqda, Profildə, hədiyyə vərəqində yenilənir (səhifə yenilənmədən)', async () => {
    const tk = await login('+994990000002');
    const meId = (await api('GET', '/me', tk.accessToken)).data.id;
    // 1M-lik balans "1M" kimi qısaldılır — fərq görünsün deyə 600 000-ə endiririk (yenidən doldurma həddi 500 000)
    await sql(`UPDATE "User" SET coins=600000, "promoCoins"=600000 WHERE id=$1`, [meId]);
    const M = await newCtx(browser, tk);
    await M.page.goto(WEB + '/');
    await seeText(M.page, /^600,000$/);
    await M.page.getByText(/^600,000$/).first().click();
    await M.page.waitForURL(/wallet/);
    await seeText(M.page, /49\.99 ₼/);
    await shot(M.page, '4-wallet-before');
    await M.page.getByText(/49\.99 ₼/).first().click();
    await seeText(M.page, /3,850/).catch(() => {}); // uğur bildirişi
    await seeText(M.page, /^603,850$/);
    await shot(M.page, '4-wallet-after');
    assert.equal((await api('GET', '/me', tk.accessToken)).data.coins, 603850);
    await M.page.mouse.wheel(0, -5000);
    await sleep(500);
    await clickIcon(M.page, 'back');
    await seeText(M.page, /^603,850$/);
    await M.page.getByText(/^Profil$/).first().click();
    await seeText(M.page, /^604K$/);
    await shot(M.page, '4-me');
    // hədiyyə vərəqi: Kəşf → kartdakı hədiyyə düyməsi → profil (?gift=1)
    await M.page.getByText(/^Ana$/).first().click();
    await M.page.getByText(/^Kəşf et$/).first().click();
    await sleep(2000);
    await clickIcon(M.page, 'gift', -1);
    await M.page.waitForURL(/\/user\//);
    await seeText(M.page, /^603,850$/);
    await shot(M.page, '4-giftsheet');
    await M.ctx.close();
  });

  // ───────────── 5. Hədiyyələr ─────────────
  if (want(5)) await R.run('5. Hədiyyələr: kiçik/orta/lüks profildən və söhbətdən; balans və host qazancı; balans çatmayanda', async () => {
    const m = await makeUser({ gender: 'MALE', name: `Tural${stamp}` });
    const h = await makeHost(`Sevda${stamp}`);
    await fundUser(m, 'coins_1300'); // 1400 real Nar
    const M = await newCtx(browser, m);
    await M.page.goto(`${WEB}/user/${h.me.id}`);
    await seeText(M.page, new RegExp(`Sevda${stamp}`));
    const sendGift = async (cat, name) => {
      await clickIcon(M.page, 'gift', -1);
      await seeText(M.page, /Kimə/);
      await M.page.getByText(new RegExp(`^${cat}$`)).filter({ visible: true }).first().click();
      await M.page.getByText(new RegExp(`^${name}$`)).filter({ visible: true }).first().click();
      await M.page.getByText(/^Göndər$/).filter({ visible: true }).first().click();
      await sleep(1500);
    };
    let c = (await meOf(m)).coins;
    const d0 = (await meOf(h)).diamonds;
    for (const [cat, name, price] of [['Romantik', 'Qızılgül', 1], ['Romantik', 'Gül dəstəsi', 99], ['Lüks', 'Tac', 999]]) {
      await sendGift(cat, name);
      const now = (await meOf(m)).coins;
      assert.equal(now, c - price, `${name}: ${c} → ${now}`);
      c = now;
    }
    await shot(M.page, '5-after-gifts');
    const earned = await sql(`SELECT COALESCE(SUM(diamonds),0)::int AS d FROM "GiftTransaction" WHERE "receiverId"=$1`, [h.me.id]);
    const h1 = await meOf(h);
    assert.equal(h1.diamonds - d0, earned[0].d, 'host Almazı = hədiyyə qazancı');
    assert.ok(earned[0].d > 0, 'host Almaz qazanmalıdır');
    const he = await sql(`SELECT count(*)::int AS n FROM "HostEarning" WHERE "hostId"=$1 AND source='GIFT'`, [h.me.id]);
    // Qızılgül (1 Nar): host payı aşağı yuvarlaqlaşdırılır → 0 Almaz, qazanc qeydi yaranmır
    assert.equal(he[0].n, 2);
    // söhbətdən sürətli hədiyyə (qızılgül)
    const conv = (await api('POST', `/conversations/with/${h.me.id}`, m.accessToken, {})).data.id;
    await M.page.goto(`${WEB}/chat/${conv}`);
    await seeText(M.page, /Qızılgül|Gül dəstəsi|Tac/);
    await M.page.locator('[aria-label="rose"]').filter({ visible: true }).first().click();
    await sleep(1500);
    assert.equal((await meOf(m)).coins, c - 1, 'söhbətdən qızılgül');
    c -= 1;
    // balans çatmır: lüks hədiyyə (Yaxta 9999)
    await M.page.goto(`${WEB}/user/${h.me.id}`);
    await seeText(M.page, new RegExp(`Sevda${stamp}`));
    await clickIcon(M.page, 'gift', -1);
    await M.page.getByText(/^Lüks$/).filter({ visible: true }).first().click();
    await M.page.getByText(/^Yaxta$/).filter({ visible: true }).first().click();
    await seeText(M.page, /çatmır/);
    await shot(M.page, '5-insufficient');
    await M.page.getByText(/^Artır$/).filter({ visible: true }).last().click();
    await M.page.waitForURL(/wallet/);
    assert.equal((await meOf(m)).coins, c, 'balans dəyişməməlidir');
    await M.ctx.close();
  });

  // ───────────── 6. Host yolu: tələblər → KYC → kodla agentliyə qoşulma → sahib təsdiqi → qazanc ─────────────
  if (want(6)) await R.run('6. Host: tələblər, KYC göndərişi, dəvət kodu ilə agentliyə qoşulma, sahib təsdiqləyir, qazanc ekranı', async () => {
    const adm = await admin();
    // Agentlik sahibi: KYC (admin təsdiqi) → Agentlik müqaviləsi → müraciət → admin aktivləşdirir
    const owner = await makeUser({ gender: 'FEMALE', name: `Sahib${stamp}` });
    const ov = await submitKyc(owner);
    assert.equal((await api('POST', `/admin/kyc/${ov}`, adm.accessToken, { status: 'APPROVED' })).status, 200);
    await consent(owner, 'AGENCY_AGREEMENT');
    const ag = await api('POST', '/agencies', owner.accessToken, { name: `Ulduz ${stamp}`, city: 'Bakı', contactName: 'Sahib Test', contactPhone: '+994501112233', expectedHosts: 5 });
    assert.equal(ag.status, 200, JSON.stringify(ag.data));
    const act = await api('POST', `/admin/agencies/${ag.data.agency.id}`, adm.accessToken, { status: 'ACTIVE' });
    assert.equal(act.status, 200, JSON.stringify(act.data));
    const code = ag.data.agency.code;

    // Gələcək host: tələblərin bir hissəsi hazır (hesab yaşı, söhbətlər, profil), qalanını UI-da edir
    const f = await makeUser({ gender: 'FEMALE', name: `Gunel${stamp}` });
    const F = await newCtx(browser, f);
    await F.page.goto(`${WEB}/host-tasks`);
    await seeText(F.page, /0\s*\/\s*5|1\s*\/\s*5/);
    await shot(F.page, '6-tasks-start');
    await sql(`UPDATE "User" SET "createdAt" = now() - interval '4 days', bio='Salam, mən Günəl. Söhbət etməyi sevirəm.' WHERE id=$1`, [f.me.id]);
    const ph = await uploadPng(f.accessToken);
    for (let i = 0; i < 3; i++) await sql(`INSERT INTO "Photo" (id, "userId", url, "order") VALUES ('qa' || md5(random()::text), $1, $2, $3)`, [f.me.id, ph, i]).catch(async () => {
      await sql(`INSERT INTO "Photo" (id, "userId", url) VALUES ('qa' || md5(random()::text), $1, $2)`, [f.me.id, ph]);
    });
    for (let i = 0; i < 10; i++) {
      const p = await makeUser({ gender: 'MALE', name: `Dost${i}` });
      const c = (await api('POST', `/conversations/with/${p.me.id}`, f.accessToken, {})).data.id;
      await api('POST', `/conversations/${c}/messages`, f.accessToken, { text: 'Salam' });
    }
    await api('POST', '/videos', f.accessToken, { url: ph, mediaType: 'PHOTO', caption: 'İlk post' });
    // KYC — UI ilə
    await F.page.goto(`${WEB}/verify`);
    await seeText(F.page, /Göndər|təsdiq/i);
    const ins = F.page.locator('input:visible');
    await ins.nth(0).fill('Günəl');
    await ins.nth(1).fill('Məmmədova');
    await ins.nth(2).fill('10041996');
    for (const label of [/Ön tərəf|Ön üz|Sənədin ön/i, /Selfi/i]) {
      const fc = F.page.waitForEvent('filechooser');
      await F.page.getByText(label).filter({ visible: true }).first().click();
      await (await fc).setFiles(PNG);
      await sleep(1500);
    }
    await shot(F.page, '6-kyc-filled');
    await F.page.getByText(/^Təsdiqə göndər$|^Göndər$/).filter({ visible: true }).first().click();
    await sleep(1500);
    assert.equal((await meOf(f)).kycStatus, 'PENDING', 'KYC göndərilməlidir');
    await F.page.goto(`${WEB}/host-tasks`);
    await seeText(F.page, /5\s*\/\s*5|hazırsan|Hazırsan/i);
    await shot(F.page, '6-tasks-done');
    // Dəvət kodu ilə qoşulma (Host müqaviləsi dialoqu qəbul olunur)
    F.page.on('dialog', (d) => void d.accept());
    await F.page.goto(`${WEB}/agency?code=${code}`);
    await seeText(F.page, new RegExp(`Ulduz ${stamp}`));
    await F.page.getByText(/Sorğu göndər|Müraciət göndər|Qoşul/).filter({ visible: true }).last().click();
    await sleep(2000);
    await shot(F.page, '6-join-sent');
    const req = await sql(`SELECT id, status FROM "AgencyJoinRequest" WHERE "userId"=$1`, [f.me.id]);
    assert.equal(req[0]?.status, 'PENDING', 'qoşulma sorğusu yaranmalıdır');
    // Sahib təsdiqləyir (UI)
    const O = await newCtx(browser, owner);
    await O.page.goto(`${WEB}/agency`);
    await seeText(O.page, new RegExp(`Gunel${stamp}`));
    await shot(O.page, '6-owner-requests');
    await O.page.getByText(/^Qəbul et$|^Təsdiqlə$/).filter({ visible: true }).first().click();
    await sleep(1500);
    const fm = await meOf(f);
    assert.equal(fm.hostStatus, 'APPROVED');
    // Kişi hədiyyə göndərir → hostun qazanc ekranı
    const m = await makeUser({ gender: 'MALE', name: `Orxan${stamp}` });
    await fundUser(m, 'coins_1300');
    const g = await api('POST', '/gifts/send', m.accessToken, { giftId: 'crown', receiverId: f.me.id, count: 1, context: 'PROFILE' });
    assert.equal(g.status, 200, JSON.stringify(g.data));
    const fd = (await meOf(f)).diamonds;
    assert.ok(fd > 0, 'host Almaz qazanmalıdır');
    await F.page.goto(`${WEB}/earnings`);
    await sleep(2500);
    await shot(F.page, '6-earnings');
    const texts = (await visibleTexts(F.page)).join(' | ');
    const shown = (fd / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
    assert.ok(texts.includes(shown) || texts.includes(String(fd / 10)), `qazanc ekranında ${shown} Almaz görünməlidir: ${texts.slice(0, 400)}`);
    await F.ctx.close(); await O.ctx.close();
  });

  // ───────────── 7. Canlı yayın (səsli otaq — vebdə kamera/Agora yoxdur) ─────────────
  if (want(7)) await R.run('7. Canlı: host yayına çıxır, izləyici qoşulur, şərh, bəyənmə, hədiyyə, izləyici siyahısı, host bitirir', async () => {
    const h = await makeHost(`Aysu${stamp}`);
    const m = await makeUser({ gender: 'MALE', name: `Emil${stamp}` });
    await fundUser(m, 'coins_600');
    const H = await newCtx(browser, h);
    const M = await newCtx(browser, m);
    await H.page.goto(`${WEB}/live/start`);
    await H.page.getByText(/^Səsli otaq$/).filter({ visible: true }).first().click().catch(() => {});
    await H.page.locator('input:visible').first().fill('QA axşam söhbəti');
    await H.page.getByText(/^Başla$/).filter({ visible: true }).first().click();
    await H.page.waitForURL(/\/live\/(?!start)/, { timeout: 15000 });
    const roomId = new URL(H.page.url()).pathname.split('/live/')[1];
    await sleep(1500);
    await shot(H.page, '7-host-live');
    const lives = await api('GET', '/live', m.accessToken);
    assert.ok(JSON.stringify(lives.data).includes(roomId), 'yayın siyahıda görünməlidir');
    await M.page.goto(`${WEB}/live/${roomId}`);
    await seeText(M.page, /QA axşam söhbəti/);
    await sleep(1500);
    const viewers = await api('GET', `/live/${roomId}/viewers`, h.accessToken);
    assert.ok(JSON.stringify(viewers.data).includes(m.me.id), `izləyici siyahısında olmalıdır: ${JSON.stringify(viewers.data).slice(0, 200)}`);
    // şərh
    const box = M.page.getByPlaceholder(/Şərh|şərh|Yaz/).filter({ visible: true }).first();
    await box.fill('Salam hamıya!');
    await box.press('Enter');
    await seeText(H.page, /Salam hamıya!/);
    // bəyənmə (toplu göndərilir)
    for (let i = 0; i < 3; i++) await clickIcon(M.page, 'heart', 0, { pick: 'largest' });
    await sleep(2500);
    // hədiyyə
    const c0 = (await meOf(m)).coins;
    await clickIcon(M.page, 'gift', 0, { pick: 'largest' });
    await M.page.getByText(/^Romantik$/).filter({ visible: true }).first().click();
    await M.page.getByText(/^Gül dəstəsi$/).filter({ visible: true }).first().click();
    await M.page.getByText(/^Göndər$/).filter({ visible: true }).first().click();
    await sleep(2000);
    assert.equal((await meOf(m)).coins, c0 - 99, 'yayında hədiyyə');
    await shot(M.page, '7-viewer');
    await shot(H.page, '7-host-after-gift');
    // host bitirir (vebdə Alert.alert işləmir — API ilə; telefonda əl ilə yoxlanılmalıdır)
    const end = await api('POST', `/live/${roomId}/end`, h.accessToken, {});
    assert.equal(end.status, 200);
    assert.ok(end.data.summary.giftsCoins >= 99, JSON.stringify(end.data.summary));
    assert.ok(end.data.summary.likes >= 1, `bəyənmələr sayılmalıdır: ${JSON.stringify(end.data.summary)}`);
    await seeText(M.page, /Yayın bitdi/);
    await shot(M.page, '7-viewer-ended');
    await H.ctx.close(); await M.ctx.close();
  });

  await browser.close();
  await closeSql();
  srv.close();
  process.exit(R.summary() ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
