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
import { api, chromium, login, newCtx, OUT, rawKeys, Results, seeText, serveWeb, shot, sleep, testPng, visibleTexts, WEB } from './lib.mjs';

const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean).map(Number);
const want = (n) => !only.length || only.includes(n);
const stamp = Date.now().toString().slice(-6);
let phoneSeq = 0;
const newPhone = () => `+99455${stamp}${String(phoneSeq++).padStart(1, '0')}`.slice(0, 13);
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

  await browser.close();
  srv.close();
  process.exit(R.summary() ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
