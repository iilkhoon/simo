/**
 * Statik i18n yoxlaması (az/ru/en):
 *  1) bir dildə olub digərində olmayan açarlar (fallback az olduğu üçün RU/EN ekranda qarışıq dil görünür)
 *  2) mobil koddakı t('...') açarlarından lüğətdə olmayanlar (ekranda xam açar görünür)
 *  3) backend xəta kodlarından errors.<KOD> tərcüməsi olmayanlar (istifadəçi "Xəta baş verdi" görür)
 *  4) ru/en dəyəri az ilə eyni olan (ehtimal tərcümə olunmayıb) uzun mətnlər — yalnız xəbərdarlıq
 *
 *   cd backend && npx tsx ../scripts/qa/i18n-check.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import az from '../../mobile/src/i18n/az';
import ru from '../../mobile/src/i18n/ru';
import en from '../../mobile/src/i18n/en';
import { extra } from '../../mobile/src/i18n/extra';
import { callLive } from '../../mobile/src/i18n/callLive';
import { agencyText } from '../../mobile/src/i18n/agencyText';
import { safetyI18n } from '../../mobile/src/i18n/safety';
import { uiText } from '../../mobile/src/i18n/uiText';
import { qaText } from '../../mobile/src/i18n/qaText';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
type D = Record<string, unknown>;

// index.ts-dəki PACKS siyahısı avtomatik oxunur ki, yeni paket əlavə olunanda da yoxlansın
const indexSrc = fs.readFileSync(path.join(ROOT, 'mobile/src/i18n/index.ts'), 'utf8');
const known: Record<string, { az: D; ru: D; en: D }> = { extra, callLive, agencyText, safetyI18n, uiText, qaText } as never;
const packNames = (indexSrc.match(/const PACKS = \[([^\]]*)\]/)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const missingPacks = packNames.filter((n) => !known[n]);

function merge(a: D, b: D): D {
  const out: D = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur && typeof cur === 'object' && !Array.isArray(cur) && v && typeof v === 'object' && !Array.isArray(v) ? merge(cur as D, v as D) : v;
  }
  return out;
}
const packs = packNames.filter((n) => known[n]).map((n) => known[n]);
const dict = {
  az: packs.reduce((acc, p) => merge(acc, p.az), az as unknown as D),
  ru: packs.reduce((acc, p) => merge(acc, p.ru), ru as unknown as D),
  en: packs.reduce((acc, p) => merge(acc, p.en), en as unknown as D),
};

function flat(d: D, pre = '', out = new Map<string, unknown>()) {
  for (const [k, v] of Object.entries(d)) {
    const key = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v as D, key, out);
    else out.set(key, v);
  }
  return out;
}
const F = { az: flat(dict.az), ru: flat(dict.ru), en: flat(dict.en) };
const has = (lang: 'az' | 'ru' | 'en', key: string) => F[lang].has(key) || F[lang].has(`${key}_one`) || F[lang].has(`${key}_other`) || [...F[lang].keys()].some((k) => k.startsWith(key + '.'));

let problems = 0;
const report = (title: string, items: string[]) => {
  if (!items.length) return;
  problems += items.length;
  console.log(`\n✗ ${title} (${items.length})`);
  items.slice(0, 200).forEach((i) => console.log('   ' + i));
};

if (missingPacks.length) report('PACKS siyahısında yoxlayıcının tanımadığı paket (i18n-check.ts-ə əlavə edin)', missingPacks);

for (const l of ['ru', 'en'] as const) {
  report(`az-da olan, ${l}-da olmayan açarlar`, [...F.az.keys()].filter((k) => !F[l].has(k)));
  report(`${l}-da olan, az-da olmayan açarlar`, [...F[l].keys()].filter((k) => !F.az.has(k)));
}

// Mobil kodda istifadə olunan statik açarlar
function walk(dir: string, out: string[] = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f === 'node_modules' || f === 'i18n') continue;
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(f)) out.push(p);
  }
  return out;
}
const used = new Map<string, string>();
for (const f of [...walk(path.join(ROOT, 'mobile/app')), ...walk(path.join(ROOT, 'mobile/src'))]) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z][\w]*\.[\w.]+)'/g)) used.set(m[1], path.relative(ROOT, f));
  for (const m of src.matchAll(/i18n\.t\(\s*'([a-zA-Z][\w]*\.[\w.]+)'/g)) used.set(m[1], path.relative(ROOT, f));
}
for (const l of ['az', 'ru', 'en'] as const) {
  report(`kodda istifadə olunan, ${l} lüğətində olmayan açarlar`, [...used].filter(([k]) => !has(l, k)).map(([k, f]) => `${k}  (${f})`));
}

// Backend xəta kodları
const codes = new Set<string>();
for (const f of walk(path.join(ROOT, 'backend/src'))) {
  if (f.includes('generated')) continue;
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/err\.(?:badRequest|forbidden|notFound|unauthorized)\(\s*'([A-Z_0-9]+)'/g)) codes.add(m[1]);
  for (const m of src.matchAll(/new AppError\(\s*'([A-Z_0-9]+)'/g)) codes.add(m[1]);
  for (const m of src.matchAll(/throw new Error\(\s*'([A-Z_0-9]{4,})'\)/g)) codes.add(m[1]);
}
codes.delete('RETRY');
for (const l of ['az', 'ru', 'en'] as const) {
  report(`backend xəta kodu, ${l}-da errors.<KOD> yoxdur`, [...codes].filter((c) => !F[l].has(`errors.${c}`)).sort());
}

// Tərcümə olunmamış ehtimalı (yalnız məlumat)
const same = [...F.az].filter(([k, v]) => typeof v === 'string' && v.length > 12 && /[əğıöüşçƏĞİÖÜŞÇ]/.test(v) && (F.ru.get(k) === v || F.en.get(k) === v)).map(([k]) => k);
if (same.length) console.log(`\n! ru/en dəyəri az ilə eynidir (ehtimal tərcümə olunmayıb): ${same.length}\n   ${same.slice(0, 50).join('\n   ')}`);

console.log(problems ? `\n${problems} problem` : '\n✓ i18n təmizdir');
process.exit(problems ? 1 : 0);
