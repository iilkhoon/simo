// Simo hədiyyə ikonları — orijinal SVG (viewBox 0 0 64 64). `node design/gifts.mjs` mobil və veb üçün faylları yaradır.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const lg = (id, stops, x2 = '0', y2 = '1') =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const shine = (cx, cy, rx = 5, ry = 3) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".45" transform="rotate(-30 ${cx} ${cy})"/>`;

export const GIFTS = {
  rose: `<defs>${lg('ro_p', [[0, '#FF7AA8'], [1, '#E0115F']])}${lg('ro_l', [[0, '#7EE08A'], [1, '#2E9E4F']])}</defs>
<path d="M31 34c0 10 1 18 2 26" stroke="#2E9E4F" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M32 46c-8-6-14-4-16-1 5 3 11 3 16 1z" fill="url(#ro_l)"/><path d="M33 52c7-6 13-5 15-2-5 3-10 4-15 2z" fill="url(#ro_l)"/>
<path d="M32 36c-11 0-16-8-15-17 3 3 6 4 8 4-1-6 2-12 7-15 5 3 8 9 7 15 2 0 5-1 8-4 1 9-4 17-15 17z" fill="url(#ro_p)"/>
<path d="M32 13c-3 4-3 10 0 14 3-4 3-10 0-14z" fill="#B00848" opacity=".55"/>${shine(24, 20)}`,

  heart: `<defs>${lg('he_g', [[0, '#FF8FB8'], [.55, '#FF3D7F'], [1, '#C8106A']])}</defs>
<path d="M32 56S6 40 6 22c0-8 6-14 13-14 6 0 10 3 13 8 3-5 7-8 13-8 7 0 13 6 13 14 0 18-26 34-26 34z" fill="url(#he_g)"/>${shine(18, 18, 6, 3.5)}`,

  kiss: `<defs>${lg('ki_g', [[0, '#FF6B9A'], [1, '#D3124F']])}</defs>
<path d="M6 30c6-9 14-13 20-10 3 1 4 3 6 3s3-2 6-3c6-3 14 1 20 10-6 2-10 3-14 3H20c-4 0-8-1-14-3z" fill="url(#ki_g)"/>
<path d="M6 30c8 6 16 14 26 14s18-8 26-14c-6 2-10 3-14 3H20c-4 0-8-1-14-3z" fill="#B30D45"/>
<path d="M14 30c6 1 12 1 18 1s12 0 18-1" stroke="#7A0730" stroke-width="1.5" fill="none" opacity=".6"/>${shine(20, 25, 5, 2)}`,

  tea: `<defs>${lg('te_g', [[0, '#FFFFFF'], [1, '#E8E2F5']], '1', '0')}${lg('te_t', [[0, '#E0482E'], [1, '#8F1D0D']])}</defs>
<ellipse cx="32" cy="56" rx="20" ry="4" fill="#C9A227"/><ellipse cx="32" cy="55" rx="16" ry="2.6" fill="#F2D06B"/>
<path d="M22 14h20c0 6-4 10-4 16s6 10 6 16c0 6-6 9-12 9s-12-3-12-9c0-6 6-10 6-16s-4-10-4-16z" fill="url(#te_g)" opacity=".9"/>
<path d="M24.5 30c1 4 5 7 5 9h5c0-2 4-5 5-9 1 6 4 8 4 11 0 5-5 8-11.5 8S21 46 21 41c0-3 3-5 3.5-11z" fill="url(#te_t)"/>
<path d="M22 14h20" stroke="#C9A227" stroke-width="2.5" stroke-linecap="round"/>
<path d="M28 9c-2-2 0-4 0-6M34 9c-2-2 0-4 0-6" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7" stroke-linecap="round"/>${shine(26, 22, 2, 5)}`,

  pomegranate: `<defs>${lg('po_g', [[0, '#FF5470'], [1, '#9E0B2B']])}</defs>
<path d="M26 12l2-6 4 4 4-4 2 6z" fill="#B0122F"/>
<circle cx="32" cy="36" r="22" fill="url(#po_g)"/>
<path d="M32 22c10 0 16 6 16 14 0 9-7 15-16 15s-16-6-16-15" fill="#7D0A21" opacity=".25"/>
${[[26, 34], [32, 32], [38, 34], [29, 40], [35, 40], [32, 46], [24, 41], [40, 41]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.4" ry="3" fill="#FFB3C1"/>`).join('')}${shine(22, 26, 5, 3)}`,

  chocolate: `<defs>${lg('ch_g', [[0, '#8B4A2B'], [1, '#4A2312']])}${lg('ch_w', [[0, '#FF6FA4'], [1, '#C8106A']])}</defs>
<rect x="12" y="10" width="40" height="44" rx="5" fill="url(#ch_g)"/>
${[0, 1, 2].map((r) => [0, 1].map((c) => `<rect x="${16 + c * 17}" y="${14 + r * 13}" width="15" height="11" rx="2" fill="#6B3519" stroke="#A9653E" stroke-width="1"/>`).join('')).join('')}
<path d="M12 36h40v14a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z" fill="url(#ch_w)"/>
<path d="M32 40c-3-3-7-1-6 2 1 3 6 6 6 6s5-3 6-6c1-3-3-5-6-2z" fill="#fff"/>`,

  teddy: `<defs>${lg('td_g', [[0, '#E8A87C'], [1, '#B86B3D']])}</defs>
<circle cx="18" cy="16" r="7" fill="url(#td_g)"/><circle cx="46" cy="16" r="7" fill="url(#td_g)"/>
<circle cx="18" cy="16" r="3.5" fill="#F6CBA6"/><circle cx="46" cy="16" r="3.5" fill="#F6CBA6"/>
<ellipse cx="32" cy="46" rx="16" ry="14" fill="url(#td_g)"/>
<circle cx="32" cy="26" r="15" fill="url(#td_g)"/>
<ellipse cx="32" cy="31" rx="7" ry="5" fill="#F6CBA6"/><ellipse cx="32" cy="29" rx="2.6" ry="2" fill="#3A1F12"/>
<circle cx="26" cy="23" r="2" fill="#3A1F12"/><circle cx="38" cy="23" r="2" fill="#3A1F12"/>
<path d="M32 50c-3-3-7-1-6 2 1 3 6 6 6 6s5-3 6-6c1-3-3-5-6-2z" fill="#FF3D7F"/>`,

  bouquet: `<defs>${lg('bq_w', [[0, '#C9B8FF'], [1, '#7B5CFF']])}${lg('bq_r', [[0, '#FF7AA8'], [1, '#E0115F']])}</defs>
<path d="M18 30l14 30 14-30z" fill="url(#bq_w)"/><path d="M24 44l8 4 8-4" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
${[[22, 22, '#FF7AA8'], [32, 16, '#FF3D7F'], [42, 22, '#FFB3C8'], [27, 30, '#E0115F'], [37, 30, '#FF5E8E']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${c}"/><circle cx="${x}" cy="${y}" r="3" fill="#fff" opacity=".35"/>`).join('')}
<path d="M15 26c-3-4-1-8 2-8M49 26c3-4 1-8-2-8" stroke="#3FB86A" stroke-width="3" fill="none" stroke-linecap="round"/>`,

  perfume: `<defs>${lg('pf_g', [[0, '#FFC2DA'], [1, '#C850C0']])}${lg('pf_c', [[0, '#FFE08A'], [1, '#C9A227']])}</defs>
<rect x="27" y="6" width="10" height="10" rx="2" fill="url(#pf_c)"/><rect x="29" y="15" width="6" height="5" fill="#C9A227"/>
<path d="M14 30c0-6 5-10 11-10h14c6 0 11 4 11 10v20c0 5-4 8-9 8H23c-5 0-9-3-9-8z" fill="url(#pf_g)"/>
<path d="M32 33c-3-3-8-1-7 3 1 3 7 7 7 7s6-4 7-7c1-4-4-6-7-3z" fill="#fff" opacity=".85"/>${shine(21, 30, 3, 7)}`,

  champagne: `<defs>${lg('cp_g', [[0, '#3FAE6B'], [1, '#14532D']])}${lg('cp_f', [[0, '#FFE6A1'], [1, '#F2B83B']])}</defs>
<path d="M27 4h10v12c0 3 6 7 6 14v26c0 3-2 5-5 5H26c-3 0-5-2-5-5V30c0-7 6-11 6-14z" fill="url(#cp_g)"/>
<rect x="26" y="2" width="12" height="9" rx="2" fill="url(#cp_f)"/>
<rect x="21" y="34" width="22" height="14" fill="#F2E3C0"/><path d="M27 41h10" stroke="#C9A227" stroke-width="2"/>
<circle cx="48" cy="10" r="2" fill="#FFE6A1"/><circle cx="52" cy="18" r="1.5" fill="#FFE6A1"/><circle cx="45" cy="4" r="1.2" fill="#FFE6A1"/>${shine(25, 26, 2, 6)}`,

  ring: `<defs>${lg('rg_b', [[0, '#FFE58F'], [1, '#C98A13']])}${lg('rg_d', [[0, '#E9FDFF'], [.5, '#8FE9FF'], [1, '#5AB8FF']])}</defs>
<circle cx="32" cy="40" r="17" fill="none" stroke="url(#rg_b)" stroke-width="6"/>
<path d="M22 14h20l6 7-16 14-16-14z" fill="url(#rg_d)"/><path d="M22 14l10 21 10-21M16 21h32M27 14l5 7 5-7" stroke="#fff" stroke-width="1.2" fill="none" opacity=".75"/>
<path d="M50 8l1.5 3.5L55 13l-3.5 1.5L50 18l-1.5-3.5L45 13l3.5-1.5z" fill="#fff"/>`,

  crown: `<defs>${lg('cr_g', [[0, '#FFE58F'], [1, '#D08A0E']])}</defs>
<path d="M8 22l12 10 12-18 12 18 12-10-5 28H13z" fill="url(#cr_g)"/>
<rect x="12" y="48" width="40" height="7" rx="2" fill="#C47F0B"/>
<circle cx="32" cy="38" r="4" fill="#FF3D7F"/><circle cx="20" cy="40" r="3" fill="#7B5CFF"/><circle cx="44" cy="40" r="3" fill="#6FE3FF"/>
<circle cx="8" cy="20" r="3" fill="#FFE58F"/><circle cx="32" cy="12" r="3" fill="#FFE58F"/><circle cx="56" cy="20" r="3" fill="#FFE58F"/>${shine(22, 30, 4, 2)}`,

  maiden_tower: `<defs>${lg('mt_s', [[0, '#FFB199'], [1, '#7B5CFF']])}${lg('mt_t', [[0, '#F1D9B5'], [1, '#B98E5C']], '1', '0')}</defs>
<circle cx="32" cy="32" r="30" fill="url(#mt_s)"/><circle cx="46" cy="16" r="5" fill="#FFF3C4" opacity=".9"/>
<path d="M20 58V22c0-2 1-3 3-3h18c2 0 3 1 3 3v36z" fill="url(#mt_t)"/>
<path d="M40 30h8v28h-8z" fill="#C9A06E"/>
<path d="M20 22h24M20 24h24" stroke="#8C6538" stroke-width="1.2"/>
${[28, 36, 44, 52].map((y) => `<path d="M20 ${y}h24" stroke="#A47A47" stroke-width=".8" opacity=".6"/>`).join('')}
<rect x="29" y="30" width="4" height="7" rx="2" fill="#5A3B1E"/><rect x="29" y="44" width="4" height="7" rx="2" fill="#5A3B1E"/>
<path d="M18 19h28v4H18z" fill="#D9B88A"/>
<path d="M32 6c-2-3-6-1-5 2s5 5 5 5 4-2 5-5-3-5-5-2z" fill="#FF3D7F"/>`,

  flame_towers: `<defs>${lg('ft_s', [[0, '#2B1055'], [1, '#7B5CFF']])}${lg('ft_f', [[0, '#FFE066'], [.5, '#FF7A3D'], [1, '#E0115F']])}</defs>
<circle cx="32" cy="32" r="30" fill="url(#ft_s)"/>
<path d="M12 58c0-14 4-24 9-30 2 9 3 18 3 30z" fill="url(#ft_f)"/>
<path d="M24 58c0-20 4-34 9-42 4 10 6 26 6 42z" fill="url(#ft_f)"/>
<path d="M39 58c0-14 3-24 8-30 3 8 5 18 5 30z" fill="url(#ft_f)"/>
<path d="M28 58c0-14 2-26 5-34" stroke="#fff" stroke-width="1" opacity=".5" fill="none"/>
<circle cx="12" cy="14" r="1" fill="#fff"/><circle cx="52" cy="10" r="1.2" fill="#fff"/><circle cx="46" cy="20" r=".8" fill="#fff"/>`,

  sports_car: `<defs>${lg('sc_g', [[0, '#FF5E8E'], [1, '#B0124F']], '1', '0')}</defs>
<path d="M4 40c0-4 3-6 8-7l10-8c3-2 6-3 10-3h8c4 0 7 2 10 5l4 5c4 1 6 4 6 8v4H4z" fill="url(#sc_g)"/>
<path d="M22 31l6-5h6v6H21zM37 26h4c2 0 4 1 6 4l1 2H37z" fill="#2B1745" opacity=".8"/>
<rect x="4" y="42" width="56" height="4" rx="2" fill="#7D0B37"/>
<circle cx="17" cy="46" r="7" fill="#1E1030"/><circle cx="17" cy="46" r="3" fill="#C9C2D8"/>
<circle cx="47" cy="46" r="7" fill="#1E1030"/><circle cx="47" cy="46" r="3" fill="#C9C2D8"/>
<path d="M56 38h4" stroke="#FFE066" stroke-width="2.5" stroke-linecap="round"/>${shine(30, 28, 6, 1.5)}`,

  yacht: `<defs>${lg('ya_w', [[0, '#6FE3FF'], [1, '#2A6FDB']])}${lg('ya_s', [[0, '#FFFFFF'], [1, '#D9D2F0']])}</defs>
<path d="M2 50c5 3 10 3 15 0s10-3 15 0 10 3 15 0 10-3 15 0v12H2z" fill="url(#ya_w)"/>
<path d="M8 42h50l-7 9H14z" fill="url(#ya_s)"/><path d="M14 51h37" stroke="#7B5CFF" stroke-width="2"/>
<path d="M18 42l4-8h22l6 8z" fill="#fff"/><path d="M24 36h18" stroke="#2B1745" stroke-width="2.5" stroke-linecap="round"/>
<path d="M32 34V8l16 22H32z" fill="#FF5E8E"/><path d="M30 34V12L18 30h12z" fill="#FFB199"/>`,

  palace: `<defs>${lg('pa_g', [[0, '#FFE6F0'], [1, '#D9B8FF']])}${lg('pa_r', [[0, '#FF6FA4'], [1, '#7B5CFF']])}</defs>
<path d="M6 58V34h52v24z" fill="url(#pa_g)"/>
<path d="M4 34l8-10 8 10M44 34l8-10 8 10" fill="url(#pa_r)"/>
<path d="M18 34c0-10 6-16 14-20 8 4 14 10 14 20z" fill="url(#pa_r)"/>
<path d="M32 14V4" stroke="#FFC857" stroke-width="2"/><path d="M32 4l6 2-6 2z" fill="#FFC857"/>
<path d="M26 58V46c0-4 3-6 6-6s6 2 6 6v12z" fill="#7B5CFF"/>
${[12, 52].map((x) => `<rect x="${x - 3}" y="40" width="6" height="8" rx="3" fill="#C850C0"/>`).join('')}
<circle cx="32" cy="27" r="3" fill="#FFC857"/>`,

  love_planet: `<defs>${lg('lp_g', [[0, '#FFB199'], [.5, '#FF4D8D'], [1, '#7B5CFF']])}${lg('lp_r', [[0, '#FFE58F'], [1, '#C850C0']], '1', '0')}</defs>
<circle cx="32" cy="32" r="18" fill="url(#lp_g)"/>
<ellipse cx="32" cy="34" rx="29" ry="8" fill="none" stroke="url(#lp_r)" stroke-width="3.5" transform="rotate(-18 32 34)"/>
<path d="M14 27a18 18 0 0 1 36 0" fill="url(#lp_g)"/>
<path d="M32 27c-3-3-8-1-7 3 1 3 7 7 7 7s6-4 7-7c1-4-4-6-7-3z" fill="#fff"/>
<path d="M54 8l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2zM9 48l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#FFE58F"/>`,
};

/** Simo Coin ikonu */
/** Nar (valyuta) — nar təsvirli qızıl sikkə; Ləl — qırmızı yaqut. Hazır düz SVG. */
export const NAR_COIN = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><circle cx=\"32\" cy=\"33.5\" r=\"28\" fill=\"#D98A00\"/><circle cx=\"32\" cy=\"31\" r=\"28\" fill=\"#FFC23D\"/><circle cx=\"32\" cy=\"31\" r=\"22.5\" fill=\"#FFD66B\"/><path d=\"M32 17.5c-1.6 0-2.3-2.8-2.3-2.8l-1.5 2.1-2.3-.8.9 2.7c-4.1 1.8-6.8 5.5-6.8 9.8 0 6.1 5.4 11 12 11s12-4.9 12-11c0-4.3-2.7-8-6.8-9.8l.9-2.7-2.3.8-1.5-2.1s-.7 2.8-2.3 2.8z\" fill=\"#F2344F\"/><path d=\"M32 36s-5.5-3.4-5.5-7c0-1.8 1.4-3.1 3-3.1 1.15 0 2 .6 2.5 1.5.5-.9 1.35-1.5 2.5-1.5 1.6 0 3 1.3 3 3.1C37.5 32.6 32 36 32 36z\" fill=\"#FFFFFF\"/><path d=\"M14 22c2.5-6 8-10 14.5-10.8\" stroke=\"#FFF3C4\" stroke-width=\"3\" stroke-linecap=\"round\" fill=\"none\"/></svg>";
export const LAL_RUBY = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><path d=\"M16 12h32l12 15-28 31L4 27z\" fill=\"#C8203B\"/><path d=\"M16 12h32l-6 15H22z\" fill=\"#FF5A72\"/><path d=\"M4 27h18l10 31z\" fill=\"#E02848\"/><path d=\"M60 27H42L32 58z\" fill=\"#A3152D\"/><path d=\"M22 27h20L32 58z\" fill=\"#F2344F\"/><path d=\"M16 12l6 15L4 27zM48 12l-6 15h18z\" fill=\"#E8344F\"/><path d=\"M21 15h8l-4 8z\" fill=\"#FFFFFF\" opacity=\".55\"/></svg>";

export const COIN = `<defs>${lg('co_g', [[0, '#FFE58F'], [1, '#F2A100']])}${lg('co_i', [[0, '#FFF3C4'], [1, '#F7B733']])}</defs>
<circle cx="32" cy="32" r="28" fill="url(#co_g)"/><circle cx="32" cy="32" r="22" fill="url(#co_i)" stroke="#E08E00" stroke-width="2"/>
<path d="M32 44S18 36 18 27c0-4 3-7 7-7 3 0 5 2 7 4 2-2 4-4 7-4 4 0 7 3 7 7 0 9-14 17-14 17z" fill="#E0115F" opacity=".9"/>${shine(22, 18, 6, 3)}`;

/** Simo Almaz ikonu */
export const DIAMOND = `<defs>${lg('di_g', [[0, '#E9FDFF'], [.5, '#8FE9FF'], [1, '#7B5CFF']])}</defs>
<path d="M14 14h36l10 14-28 30L4 28z" fill="url(#di_g)"/>
<path d="M4 28h56M14 14l8 14 10-14 10 14 8-14M22 28l10 30 10-30" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7"/>`;

/* ── "Nar" dizayn dili: qradiyentlər düz rənglərə çevrilir, formalara mürəkkəb kontur əlavə olunur ── */
const INK = '#17120F';
const REMAP = { '#7B5CFF': '#2F6BFF', '#C850C0': '#F2344F', '#C9B8FF': '#DCE6FF', '#E0115F': '#F2344F', '#FF4D8D': '#F2344F' };
const hex = (c) => (REMAP[c.toUpperCase()] ?? c).replace('#', '');
const avg = (cols) => {
  const rgb = cols.map((c) => { const h = hex(c); return [0, 2, 4].map((i) => parseInt(h.length === 3 ? h[i / 2].repeat(2) : h.slice(i, i + 2), 16)); });
  return '#' + [0, 1, 2].map((i) => Math.round(rgb.reduce((a, x) => a + x[i], 0) / rgb.length).toString(16).padStart(2, '0')).join('').toUpperCase();
};
export function brutalize(body) {
  const flat = {};
  for (const m of body.matchAll(/<linearGradient id="([^"]+)"[^>]*>(.*?)<\/linearGradient>/gs)) {
    flat[m[1]] = avg([...m[2].matchAll(/stop-color="([^"]+)"/g)].map((x) => x[1]));
  }
  let out = body.replace(/<defs>.*?<\/defs>/gs, '').replace(/url\(#([^)]+)\)/g, (_, id) => flat[id] ?? INK);
  out = out.replace(/#[0-9A-Fa-f]{6}\b/g, (c) => REMAP[c.toUpperCase()] ?? c);
  out = out.replace(/<(path|circle|ellipse|rect|polygon)\b([^>]*?)\/>/g, (m, tag, attrs) => {
    if (!/fill="(?!none)/.test(attrs) || /stroke=|opacity=/.test(attrs)) return m;
    return `<${tag}${attrs} stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
  });
  return out;
}

const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 70 70">${brutalize(body).replace(/\n/g, '')}</svg>`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const webDir = path.join(root, '..', 'web', 'assets', 'gifts');
  fs.mkdirSync(webDir, { recursive: true });
  const all = { ...GIFTS, coin: COIN, diamond: DIAMOND };
  for (const [id, body] of Object.entries(all)) {
    fs.writeFileSync(path.join(root, 'gifts', `${id}.svg`), wrap(body));
    fs.writeFileSync(path.join(webDir, `${id}.svg`), wrap(body));
  }
  const ts = `// AVTOMATİK YARADILIB: node design/gifts.mjs — əl ilə dəyişməyin\nexport const GIFT_SVGS: Record<string, string> = ${JSON.stringify(Object.fromEntries(Object.entries(GIFTS).map(([k, v]) => [k, wrap(v)])), null, 2)};\n\nexport const COIN_SVG = ${JSON.stringify(NAR_COIN)};\nexport const DIAMOND_SVG = ${JSON.stringify(LAL_RUBY)};\n`;
  const mobileDir = path.join(root, '..', 'mobile', 'src', 'assets');
  fs.mkdirSync(mobileDir, { recursive: true });
  fs.writeFileSync(path.join(mobileDir, 'giftSvgs.ts'), ts);
  console.log(`✓ ${Object.keys(all).length} SVG`);
}
