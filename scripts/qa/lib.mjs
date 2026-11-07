/**
 * Simo QA köməkçiləri: statik veb server (SPA fallback), API çağırışları, Playwright kontekstləri.
 * İstifadə qaydası journeys.mjs faylının başındadır.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright');

export const API = process.env.QA_API ?? 'http://localhost:4790';
export const WEB_DIR = process.env.QA_WEB_DIR;
export const WEB_PORT = Number(process.env.QA_WEB_PORT ?? 8790);
export const WEB = `http://localhost:${WEB_PORT}`;
export const OUT = process.env.QA_OUT ?? path.resolve('qa-out');

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webp': 'image/webp' };

export function serveWeb(dir = WEB_DIR, port = WEB_PORT) {
  if (!dir) throw new Error('QA_WEB_DIR env lazımdır (expo export -p web çıxışı)');
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let f = path.join(dir, u);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(port, () => r(srv)));
}

/** OTP sorğularının IP limiti (5/10 dəq) QA-nı bloklamasın deyə hər sorğu/kontekst üçün ayrı IP (backend trustProxy: true) */
let ipSeq = Math.floor(Math.random() * 200);
export const fakeIp = () => `10.77.${Math.floor(++ipSeq / 250) % 250}.${ipSeq % 250 + 1}`;

export async function api(method, p, token, body) {
  const res = await fetch(API + p, {
    method,
    headers: { 'X-Forwarded-For': fakeIp(), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

export async function login(phone) {
  const r1 = await api('POST', '/auth/otp/request', undefined, { phone });
  if (r1.status !== 200) throw new Error(`otp request ${r1.status} ${JSON.stringify(r1.data)}`);
  const code = r1.data.devCode ?? '111111';
  const r2 = await api('POST', '/auth/otp/verify', undefined, { phone, code });
  if (r2.status !== 200) throw new Error(`otp verify ${r2.status} ${JSON.stringify(r2.data)}`);
  return r2.data;
}

/** Brauzer konteksti: token localStorage-a əvvəlcədən yazılır */
export async function newCtx(browser, tokens, { locale = 'az' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale, extraHTTPHeaders: { 'X-Forwarded-For': fakeIp() } });
  if (tokens) {
    await ctx.addInitScript(([a, r]) => {
      try { if (!localStorage.getItem('simo.access')) { localStorage.setItem('simo.access', a); localStorage.setItem('simo.refresh', r); } } catch { /* */ }
    }, [tokens.accessToken, tokens.refreshToken]);
  }
  const page = await ctx.newPage();
  page.qaErrors = [];
  page.on('pageerror', (e) => page.qaErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') page.qaErrors.push('console: ' + m.text().slice(0, 300)); });
  return { ctx, page };
}

export async function shot(page, name) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Mətn görünənə qədər gözləyir */
export async function seeText(page, re, timeout = 10000) {
  await page.getByText(re).first().waitFor({ state: 'visible', timeout });
}

/** Ekrandakı bütün görünən mətnlər */
export async function visibleTexts(page) {
  return page.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const s = n.textContent.trim();
      if (!s) continue;
      const el = n.parentElement;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden') continue;
      out.push(s);
    }
    // placeholder-lər də yoxlanılır
    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach((i) => out.push(i.getAttribute('placeholder')));
    return out;
  });
}

/** Xam i18n açarları ("chat.title" kimi) */
export const RAW_KEY = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_]+)+$/;
export function rawKeys(texts) {
  return texts.filter((t) => RAW_KEY.test(t) && !/^(simo\.az|www\.)/.test(t) && !/\.(png|jpg|az|com|html|mp4)$/.test(t));
}

/** Kiçik test şəkli (PNG) */
export function testPng(file) {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8DwHwyBDCATAPmfC/V/tOvMAAAAAElFTkSuQmCC';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  return file;
}

/**
 * İkon düymələri (IconBtn) mətnsizdir — vebdə Ionicons qlif simvolu kimi render olunur.
 * Icon.tsx-dəki MAP + Ionicons glyphmap ilə ikon adına görə simvolu tapırıq.
 */
let glyphs = null;
export function glyph(name) {
  if (!glyphs) {
    const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
    const gm = JSON.parse(fs.readFileSync(path.join(root, 'mobile/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'), 'utf8'));
    const src = fs.readFileSync(path.join(root, 'mobile/src/components/Icon.tsx'), 'utf8');
    const map = {};
    for (const m of src.matchAll(/(\w+): '([a-z0-9-]+)'/g)) map[m[1]] = m[2];
    glyphs = { gm, map };
  }
  const ion = glyphs.map[name] ?? name;
  const code = glyphs.gm[ion];
  if (!code) throw new Error(`ikon tapılmadı: ${name}`);
  return String.fromCodePoint(code);
}
/** Görünən ikon düyməsini klikləyir (n — eyni ikonlu neçənci görünən element) */
export async function iconBoxes(page, name) {
  const g = glyph(name);
  return page.evaluate((g) => [...document.querySelectorAll('div,span')]
    .filter((e) => e.childElementCount === 0 && e.textContent === g)
    .map((e) => {
      const r = e.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      // yalnız üstdə görünən (başqa ekran/modal altında qalmayan) ikonlar
      const top = !!hit && (hit === e || e.contains(hit) || hit.contains(e) || hit.parentElement?.contains(e));
      return { x, y, w: r.width, top };
    })
    .filter((b) => b.w > 0 && b.top && b.y > 0 && b.y < innerHeight), g);
}
/** Görünən ikon düyməsini klikləyir. n: neçənci (mənfi — sondan), pick: 'largest' */
export async function clickIcon(page, name, n = 0, { timeout = 10000, pick } = {}) {
  const t0 = Date.now();
  for (;;) {
    const boxes = await iconBoxes(page, name);
    if (boxes.length) {
      const b = pick === 'largest' ? boxes.sort((a, c) => c.w - a.w)[0] : boxes.at(n) ?? boxes[0];
      await page.mouse.click(b.x, b.y);
      return;
    }
    if (Date.now() - t0 > timeout) throw new Error(`ikon görünmür: ${name}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

/** Birbaşa SQL (yalnız QA hazırlığı üçün: admin rolu və s.). DATABASE_URL backend-in DB-si olmalıdır. */
let pgPool = null;
export async function sql(q, params = []) {
  if (!pgPool) {
    const req = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../backend/package.json'));
    const { Pool } = req('pg');
    pgPool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://simo:simo@localhost:5432/simo_qa' });
  }
  return (await pgPool.query(q, params)).rows;
}
export async function closeSql() { await pgPool?.end(); }

export class Results {
  constructor(browser) { this.items = []; this.browser = browser; }
  async run(name, fn) {
    const t0 = Date.now();
    try {
      await fn();
      this.items.push({ name, ok: true, ms: Date.now() - t0 });
      console.log(`  ✓ ${name}`);
    } catch (e) {
      this.items.push({ name, ok: false, err: String(e?.stack ?? e).slice(0, 1500) });
      // xəta anında bütün açıq səhifələrin şəkli
      let i = 0;
      for (const c of this.browser?.contexts() ?? []) for (const p of c.pages()) await shot(p, `FAIL-${name.split('.')[0]}-${i++}`).catch(() => {});
      console.log(`  ✗ ${name}\n    ${String(e?.message ?? e).slice(0, 800)}`);
    }
  }
  summary() {
    const f = this.items.filter((i) => !i.ok);
    console.log(`\n${this.items.length - f.length}/${this.items.length} keçdi`);
    return f.length;
  }
}
