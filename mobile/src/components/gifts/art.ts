/**
 * Simo hədiyyə rəsmləri — çoxqatlı qradiyent, parıltı və kölgəli orijinal SVG-lər (kətan 128×128).
 * Animasiyalarda ayrıca hərəkət edən hissələr (təkər, alov, gövdə, dalğa…) PART-da ayrıca verilir.
 */
import { GOLD, HEART, SILVER, halo, lg, miniHeart, rg, rgu, rng, shadow, sparkle, svg } from './svg';

/* ───────── Qızılgül ───────── */
const rose = `<defs>
${rg('ro_o', [[0, '#FF7F98'], [0.5, '#E3173F'], [1, '#7E0519']], 0.45, 0.3, 0.75)}
${lg('ro_l', [[0, '#F7476A'], [1, '#93081F']], 0, 0, 1, 1)}
${lg('ro_r', [[0, '#D61A3E'], [1, '#6E0418']], 1, 0, 0, 1)}
${lg('ro_f', [[0, '#FF6383'], [1, '#B00C2E']])}
${lg('ro_d', [[0, '#B30D2E'], [1, '#4E0310']])}
${lg('ro_i', [[0, '#FF9AB0'], [1, '#C8133A']])}
${lg('ro_st', [[0, '#6FE08C'], [1, '#1D6E39']], 0, 0, 1, 0)}
${lg('ro_lf', [[0, '#8BEA9F'], [0.5, '#34A853'], [1, '#14592A']], 0, 0, 1, 1)}
</defs>
${halo('ro', '#FF4D7A', 64, 50, 58, 0.4)}
<path d="M64 74C60 88 68 100 63 122" stroke="url(#ro_st)" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M63 92l-6-1 5 5z" fill="#1D6E39"/><path d="M64 108l6-2-4 6z" fill="#1D6E39"/>
<path d="M62 101C50 89 34 91 27 99 38 109 52 109 62 101Z" fill="url(#ro_lf)"/>
<path d="M60 101C50 99 40 99 30 99" stroke="#0F4A22" stroke-width="1.3" fill="none" opacity=".6"/>
<path d="M65 88C74 76 90 76 97 82 89 94 75 95 65 88Z" fill="url(#ro_lf)"/>
<path d="M67 87C76 84 85 82 94 82" stroke="#0F4A22" stroke-width="1.3" fill="none" opacity=".6"/>
<path d="M48 70C53 79 59 81 64 77 69 81 75 79 80 70 73 74 69 72 64 70 59 72 55 74 48 70Z" fill="#2E9E4F"/>
<path d="M36 46C34 28 50 16 64 22 78 16 94 28 92 46 90 62 78 74 64 74 50 74 38 62 36 46Z" fill="url(#ro_o)"/>
<path d="M46 36C50 26 60 24 64 28 68 24 78 26 82 36 76 32 70 34 64 38 58 34 52 32 46 36Z" fill="url(#ro_d)"/>
<path d="M56 36C58 30 66 28 70 32 72 36 68 40 64 38 62 37 62 34 65 34" stroke="#6A0416" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M48 40C48 52 56 58 64 58 72 58 80 52 80 40 74 48 54 48 48 40Z" fill="url(#ro_i)"/>
<path d="M34 44C30 60 42 76 62 77 52 68 46 56 48 42 43 40 37 41 34 44Z" fill="url(#ro_l)"/>
<path d="M94 44C98 60 86 76 66 77 76 68 82 56 80 42 85 40 91 41 94 44Z" fill="url(#ro_r)"/>
<path d="M46 56C50 70 58 77 64 77 70 77 78 70 82 56 74 64 54 64 46 56Z" fill="url(#ro_f)"/>
<path d="M39 47C39 39 43 33 50 29" stroke="#fff" stroke-opacity=".6" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M52 63C56 67 60 69 65 69" stroke="#FFC2CF" stroke-opacity=".7" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M84 50C85 56 83 61 80 65" stroke="#FF9AB0" stroke-opacity=".5" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<circle cx="78" cy="52" r="2.8" fill="#fff" opacity=".55"/><circle cx="77.2" cy="51.2" r="1" fill="#fff"/>
${sparkle(100, 22, 6, '#FFE08A')}${sparkle(25, 28, 4)}${sparkle(104, 62, 3, '#FFD1DC')}`;

/* ───────── Ürək ───────── */
const heartBody = (p: string, c: [string, string, string, string], rim: string) => `<defs>
${rg(`${p}_b`, [[0, c[0]], [0.35, c[1]], [0.8, c[2]], [1, c[3]]], 0.35, 0.3, 0.8)}
${lg(`${p}_s`, [[0.35, '#000', 0], [1, c[3], 0.6]])}
${lg(`${p}_h`, [[0, '#fff', 0.95], [1, '#fff', 0]], 0, 0, 1, 1)}
</defs>
<path d="${HEART}" fill="url(#${p}_b)"/><path d="${HEART}" fill="url(#${p}_s)"/>
<path d="${HEART}" fill="none" stroke="${rim}" stroke-opacity=".55" stroke-width="1.6"/>
<path d="M26 41C26 29 36 23 46 25 38 29 32 37 32 49 29 48 26 45 26 41Z" fill="url(#${p}_h)"/>
<ellipse cx="86" cy="31" rx="9" ry="4" transform="rotate(22 86 31)" fill="#fff" opacity=".45"/>
<circle cx="39" cy="56" r="2.2" fill="#fff" opacity=".6"/>
<path d="M95 66C90 78 81 87 72 94" stroke="${rim}" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const heart = `${halo('he', '#FF3D7F', 64, 62, 62, 0.4)}${shadow('he', 64, 120, 30, 5)}${heartBody('he', ['#FFC2D3', '#FF4D7E', '#D3124F', '#7E0530'], '#FFD1DE')}
${sparkle(108, 18, 7, '#FFE08A')}${sparkle(18, 20, 4)}${sparkle(112, 92, 3.5)}`;

/* ───────── Öpüş ───────── */
const kiss = `<defs>
${lg('ki_u', [[0, '#FF6A95'], [0.5, '#E3114F'], [1, '#A10838']])}
${rg('ki_l', [[0, '#FF86AA'], [0.5, '#E3134F'], [1, '#860630']], 0.5, 0.25, 0.75)}
</defs>
${halo('ki', '#FF3D7F', 64, 66, 60, 0.35)}
<path d="M14 62C24 44 38 36 50 40 56 42 60 47 64 47 68 47 72 42 78 40 90 36 104 44 114 62 98 60 82 62 64 65 46 62 30 60 14 62Z" fill="url(#ki_u)"/>
<path d="M14 62C30 66 46 68 64 68 82 68 98 66 114 62 106 82 88 95 64 95 40 95 22 82 14 62Z" fill="url(#ki_l)"/>
<path d="M14 62C34 64 50 68 64 67 78 68 94 64 114 62" stroke="#5E0320" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M30 52C37 45 45 43 52 45" stroke="#fff" stroke-opacity=".65" stroke-width="3" fill="none" stroke-linecap="round"/>
<path d="M78 45C84 43 90 44 95 48" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>
<ellipse cx="58" cy="81" rx="17" ry="5" fill="#fff" opacity=".55"/><ellipse cx="85" cy="77" rx="5" ry="2" fill="#fff" opacity=".45"/>
<path d="M30 74C36 82 46 88 56 90" stroke="#FFB3C8" stroke-opacity=".4" stroke-width="2" fill="none" stroke-linecap="round"/>
${miniHeart(102, 24, 1.3, '#FF4D7E')}${miniHeart(116, 40, 0.8, '#FF8FB0')}${miniHeart(22, 26, 0.9, '#FF6A95', 0.9)}
${sparkle(92, 12, 4, '#FFE08A')}`;

/* ───────── Armudu çay ───────── */
const TEA_GLASS = 'M42 30H86C86 40 76 50 75 62 74 70 88 78 88 90 88 100 78 104 64 104 50 104 40 100 40 90 40 78 54 70 53 62 52 50 42 40 42 30Z';
const tea = `<defs>
${lg('te_t', [[0, '#F06A2A', 0.95], [0.45, '#A4300C'], [1, '#430B03']])}
${lg('te_g', [[0, '#fff', 0.55], [0.4, '#fff', 0.1], [0.8, '#fff', 0.05], [1, '#fff', 0.4]], 0, 0, 1, 0)}
${rg('te_s', [[0, '#F0454E'], [0.7, '#B3121E'], [1, '#7A0A13']], 0.5, 0.35, 0.7)}
${lg('te_au', GOLD)}
<clipPath id="te_c"><path d="${TEA_GLASS}"/></clipPath>
</defs>
${halo('te', '#FFB347', 64, 66, 60, 0.35)}
<ellipse cx="64" cy="109" rx="48" ry="12" fill="url(#te_s)"/>
<ellipse cx="64" cy="107" rx="39" ry="8.5" fill="none" stroke="url(#te_au)" stroke-width="1.8" stroke-dasharray="3 2.4"/>
<ellipse cx="64" cy="109" rx="48" ry="12" fill="none" stroke="url(#te_au)" stroke-width="2"/>
<ellipse cx="64" cy="105" rx="24" ry="5" fill="#5E0710" opacity=".5"/>
<g clip-path="url(#te_c)"><rect x="30" y="44" width="70" height="66" fill="url(#te_t)"/>
<ellipse cx="64" cy="45" rx="16" ry="2.6" fill="#FF9A5C" opacity=".85"/></g>
<path d="${TEA_GLASS}" fill="url(#te_g)"/>
<path d="${TEA_GLASS}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.4"/>
<path d="M42 30H86" stroke="url(#te_au)" stroke-width="4.5" stroke-linecap="round"/>
<path d="M47 35C50 43 56 51 57 61" stroke="#fff" stroke-opacity=".8" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M46 82C45 90 48 96 54 99" stroke="#fff" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M54 24C50 18 58 14 54 6M64 22C60 14 68 10 64 2M74 24C70 18 78 14 74 8" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>
<rect x="94" y="88" width="14" height="12" rx="2.5" fill="#fff" opacity=".95"/><path d="M94 91h14" stroke="#E5E7EB" stroke-width="1"/>
${sparkle(106, 80, 3, '#FFE08A')}`;

/* ───────── Nar ───────── */
const POM_SEEDS: [number, number, number][] = [[78, 58, -20], [87, 62, 10], [94, 70, 30], [80, 67, -5], [89, 73, 15], [96, 80, 35], [79, 77, 0], [88, 83, 20], [78, 86, -10], [95, 88, 40]];
const seed = (x: number, y: number, r: number, g: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="4.5" transform="rotate(${r} ${x} ${y})" fill="url(#${g})"/><circle cx="${x - 1.2}" cy="${y - 1.7}" r="1.1" fill="#fff" opacity=".85"/>`;
const pomDefs = (p: string) => `<defs>
${rg(`${p}_b`, [[0, '#FF8590'], [0.45, '#E3203F'], [0.85, '#9A0B26'], [1, '#600515']], 0.38, 0.35, 0.75)}
${lg(`${p}_c`, [[0, '#D02B45'], [1, '#5E0716']])}
${rg(`${p}_p`, [[0, '#FFF4E4'], [1, '#F2C094']])}
${rg(`${p}_sd`, [[0, '#FFA3B5'], [0.5, '#E3173F'], [1, '#860522']], 0.35, 0.3, 0.7)}
${lg(`${p}_lf`, [[0, '#8BEA9F'], [0.5, '#34A853'], [1, '#14592A']], 0, 0, 1, 1)}
</defs>`;
const pomegranate = `${pomDefs('po')}${halo('po', '#FF4060', 64, 70, 62, 0.35)}${shadow('po', 64, 118, 32, 5)}
<path d="M70 26C80 13 96 13 103 19 95 29 81 31 70 26Z" fill="url(#po_lf)"/><path d="M72 25C82 21 91 19 100 19" stroke="#0F4A22" stroke-width="1.2" fill="none" opacity=".6"/>
<path d="M50 36L46 16 56 24 64 11 72 24 82 16 78 36Z" fill="url(#po_c)"/>
<ellipse cx="64" cy="35" rx="14" ry="4" fill="#3E030D"/>
<circle cx="64" cy="72" r="42" fill="url(#po_b)"/>
<path d="M68 46C84 46 102 58 104 76 98 90 84 96 72 92 66 80 64 60 68 46Z" fill="url(#po_p)"/>
<path d="M72 52C84 54 96 64 98 76 94 86 84 90 76 88 71 78 70 62 72 52Z" fill="#6E0A1E"/>
${POM_SEEDS.map(([x, y, r]) => seed(x, y, r, 'po_sd')).join('')}
<path d="M68 46C64 60 66 80 72 92" stroke="#FBE2C4" stroke-width="2.2" fill="none"/>
<ellipse cx="44" cy="54" rx="11" ry="6" transform="rotate(-35 44 54)" fill="#fff" opacity=".45"/>
<circle cx="36" cy="68" r="2.4" fill="#fff" opacity=".5"/>
<path d="M30 86C36 98 46 106 58 110" stroke="#FF8590" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>
${sparkle(108, 46, 4.5, '#FFE08A')}${sparkle(20, 34, 3.5)}`;

/* ───────── Şokolad qutusu ───────── */
const truffle = (x: number, y: number, drizzle: string) =>
  `<circle cx="${x}" cy="${y + 1.5}" r="9" fill="#1E0A03" opacity=".5"/><circle cx="${x}" cy="${y}" r="8.6" fill="url(#ch_b)"/>
<path d="M${x - 6} ${y - 2}l3 2.5 3-3 3 3 3-2.5" stroke="${drizzle}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<ellipse cx="${x - 3}" cy="${y - 4}" rx="2.6" ry="1.5" fill="#fff" opacity=".45"/>`;
const chocolate = `<defs>
${lg('ch_l', [[0, '#FF5C86'], [0.5, '#D3134A'], [1, '#7E0628']], 0, 0, 1, 1)}
${lg('ch_t', [[0, '#5A2A14'], [1, '#26100A']])}
${rg('ch_b', [[0, '#C0855A'], [0.5, '#6B3519'], [1, '#2A1005']], 0.35, 0.3, 0.75)}
${lg('ch_au', GOLD)}
</defs>
${halo('ch', '#FF4D7E', 64, 64, 60, 0.3)}${shadow('ch', 64, 118, 40, 5)}
<g transform="translate(66 44) rotate(-14) scale(.78) translate(-64 -64)"><path d="${HEART}" fill="url(#ch_l)"/>
<path d="M26 41C26 29 36 23 46 25 38 29 32 37 32 49 29 48 26 45 26 41Z" fill="#fff" opacity=".45"/></g>
<g transform="translate(64 82) scale(.86 .66) translate(-64 -64)"><path d="${HEART}" fill="url(#ch_l)"/></g>
<g transform="translate(64 80) scale(.76 .56) translate(-64 -64)"><path d="${HEART}" fill="url(#ch_t)"/></g>
${truffle(47, 70, '#F7D7B5')}${truffle(64, 69, '#FF9AB8')}${truffle(81, 70, '#F7D7B5')}${truffle(55, 84, '#FF9AB8')}${truffle(73, 84, '#F7D7B5')}${truffle(64, 98, '#FFE08A')}
<path d="M24 28C14 18 10 30 18 34 22 36 26 32 28 30Z" fill="url(#ch_au)"/><path d="M30 28C34 14 44 22 38 30 35 34 31 32 30 30Z" fill="url(#ch_au)"/>
<circle cx="28" cy="30" r="4" fill="url(#ch_au)"/><path d="M27 33L22 44 26 43 27 47Z" fill="#E39A12"/>
${sparkle(104, 24, 5, '#FFE08A')}${sparkle(110, 100, 3)}`;

/* ───────── Şəkərbura ───────── */
const shekerbura = (() => {
  // Yuxarıdan baxış: yarımay, düz kənar yuxarıda, əyri kənar "çimdikli", üstü "küləkli" naxış
  const cx = 64, cy = 44, R = 50, K = 0.86;
  const pt = (a: number, r: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r * K] as const;
  const r = rng(7);
  const bumps: string[] = [];
  for (let i = 0; i <= 22; i++) {
    const [x, y] = pt((i / 22) * Math.PI, R - 2);
    bumps.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="url(#sb_e)"/>`);
  }
  const hb: string[] = [];
  for (const [rad, n] of [[38, 13], [28, 10], [18, 7]] as const) {
    for (let i = 1; i < n; i++) {
      const a = (i / n) * Math.PI;
      const [x, y] = pt(a, rad);
      const t = a + Math.PI / 2;
      const dx = Math.cos(t) * 3.4, dy = Math.sin(t) * 3.4 * K;
      const nx = Math.cos(a) * 3.2, ny = Math.sin(a) * 3.2 * K;
      hb.push(`M${(x - dx - nx).toFixed(1)} ${(y - dy - ny).toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}L${(x + dx - nx).toFixed(1)} ${(y + dy - ny).toFixed(1)}`);
    }
  }
  const sugar = Array.from({ length: 26 }, () => {
    const [x, y] = pt(r() * Math.PI, r() * 44);
    return `<circle cx="${x.toFixed(1)}" cy="${(y + 2).toFixed(1)}" r="${(0.6 + r() * 1).toFixed(1)}" fill="#fff" opacity="${(0.6 + r() * 0.4).toFixed(2)}"/>`;
  }).join('');
  const D = `M${cx - R} ${cy}H${cx + R}A${R} ${R * K} 0 0 1 ${cx - R} ${cy}Z`;
  return `<defs>
${rg('sb_b', [[0, '#FFF1CC'], [0.55, '#F2C477'], [1, '#C07A33']], 0.5, 0.15, 0.95)}
${rg('sb_e', [[0, '#F7D38E'], [1, '#B06A27']], 0.4, 0.35, 0.7)}
${rg('sb_pl', [[0, '#FFFFFF'], [0.8, '#EEF2F8'], [1, '#C9D4E4']])}
</defs>
${halo('sb', '#FFC966', 64, 64, 60, 0.35)}
<ellipse cx="64" cy="96" rx="58" ry="22" fill="url(#sb_pl)"/>
<ellipse cx="64" cy="96" rx="49" ry="17" fill="none" stroke="#2F6BFF" stroke-width="1.8" stroke-dasharray=".1 5" stroke-linecap="round"/>
<ellipse cx="64" cy="96" rx="58" ry="22" fill="none" stroke="#9FB2CC" stroke-width="1.4"/>
<g transform="translate(0 30)">
<path d="${D}" transform="translate(0 5)" fill="#8A4E1C" opacity=".35"/>
${bumps.join('')}
<path d="${D}" fill="url(#sb_b)"/>
<path d="M${cx - R + 2} ${cy}H${cx + R - 2}" stroke="#B06A27" stroke-width="2.2" stroke-linecap="round"/>
<path d="${hb.join('')}" stroke="#A35F22" stroke-opacity=".85" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 48C30 62 44 70 60 72" stroke="#FFF8E0" stroke-opacity=".7" stroke-width="3.5" fill="none" stroke-linecap="round"/>
${sugar}</g>
${sparkle(108, 30, 5, '#FFE08A')}${sparkle(20, 40, 3.5)}`;
})();

/* ───────── Buta ───────── */
const BUTA = 'M60 118C32 118 16 98 18 74 20 50 40 36 62 32 80 29 92 20 96 6 106 22 106 42 98 54 110 70 106 98 88 110 80 115 70 118 60 118Z';
const butaBody = (p: string, outer: [string, string, string], mid: [string, string]) => `<defs>
${rg(`${p}_o`, [[0, outer[0]], [0.6, outer[1]], [1, outer[2]]], 0.4, 0.62, 0.7)}
${lg(`${p}_g`, GOLD, 0, 0, 1, 1)}
${rg(`${p}_m`, [[0, mid[0]], [1, mid[1]]], 0.4, 0.6, 0.7)}
${rg(`${p}_c`, [[0, '#FFF2B8'], [1, '#E09A1C']])}
</defs>
<path d="${BUTA}" fill="url(#${p}_o)"/>
<path d="${BUTA}" fill="none" stroke="url(#${p}_g)" stroke-width="4.5" stroke-linejoin="round"/>
<path d="${BUTA}" transform="translate(62 80) scale(.76) translate(-62 -78)" fill="none" stroke="#FFE08A" stroke-width="3" stroke-dasharray=".1 6" stroke-linecap="round"/>
<path d="${BUTA}" transform="translate(62 82) scale(.52) translate(-62 -78)" fill="url(#${p}_m)" stroke="url(#${p}_g)" stroke-width="4"/>
<path d="${BUTA}" transform="translate(62 84) scale(.28) translate(-62 -78)" fill="url(#${p}_c)"/>
${[[38, 98], [86, 96], [34, 62], [98, 70]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="2" fill="#FFE08A"/><path d="M0-6Q2-2 0 0Q-2-2 0-6ZM0 6Q2 2 0 0Q-2 2 0 6ZM-6 0Q-2 2 0 0Q-2-2-6 0ZM6 0Q2 2 0 0Q2-2 6 0Z" fill="#FFD54A"/></g>`).join('')}
<path d="M96 6C101 1 108 4 105 11 103 15 97 13 99 9" stroke="url(#${p}_g)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M29 72C31 57 41 47 54 42" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const buta = `${halo('bu', '#FF5A6E', 62, 74, 60, 0.35)}${butaBody('bu', ['#FF6B7E', '#D61F45', '#6E0920'], ['#4FD6D2', '#0B5D78'])}${sparkle(112, 30, 5, '#FFE08A')}${sparkle(16, 40, 3.5)}`;

/* ───────── Ayıcıq ───────── */
const teddy = `<defs>
${rg('td_f', [[0, '#F0C092'], [0.5, '#C47E46'], [1, '#844A22']], 0.4, 0.35, 0.75)}
${rg('td_m', [[0, '#FFF0DE'], [1, '#E7B98C']], 0.45, 0.35, 0.7)}
${rg('td_e', [[0, '#6B4A38'], [1, '#0E0603']], 0.35, 0.3, 0.7)}
${rg('td_h', [[0, '#FF9DB8'], [0.5, '#F2344F'], [1, '#900A28']], 0.35, 0.3, 0.8)}
</defs>
${halo('td', '#FFB37A', 64, 66, 60, 0.3)}${shadow('td', 64, 120, 40, 5)}
<circle cx="36" cy="26" r="13" fill="url(#td_f)"/><circle cx="36" cy="26" r="7" fill="url(#td_m)"/>
<circle cx="92" cy="26" r="13" fill="url(#td_f)"/><circle cx="92" cy="26" r="7" fill="url(#td_m)"/>
<ellipse cx="64" cy="88" rx="32" ry="28" fill="url(#td_f)"/>
<ellipse cx="42" cy="110" rx="13" ry="9" fill="url(#td_f)"/><ellipse cx="86" cy="110" rx="13" ry="9" fill="url(#td_f)"/>
<ellipse cx="42" cy="111" rx="7" ry="5" fill="url(#td_m)"/><ellipse cx="86" cy="111" rx="7" ry="5" fill="url(#td_m)"/>
<ellipse cx="38" cy="82" rx="10" ry="16" transform="rotate(32 38 82)" fill="url(#td_f)"/><ellipse cx="90" cy="82" rx="10" ry="16" transform="rotate(-32 90 82)" fill="url(#td_f)"/>
<g transform="translate(64 94) scale(.34) translate(-64 -64)"><path d="${HEART}" fill="url(#td_h)"/><path d="M26 41C26 29 36 23 46 25 38 29 32 37 32 49 29 48 26 45 26 41Z" fill="#fff" opacity=".7"/></g>
<circle cx="47" cy="94" r="8" fill="url(#td_f)"/><circle cx="81" cy="94" r="8" fill="url(#td_f)"/>
<path d="M54 72L64 77 54 82ZM74 72L64 77 74 82Z" fill="#F2344F"/><circle cx="64" cy="77" r="3" fill="#C8203B"/>
<circle cx="64" cy="46" r="28" fill="url(#td_f)"/>
<ellipse cx="64" cy="57" rx="13" ry="10" fill="url(#td_m)"/>
<ellipse cx="64" cy="51.5" rx="5.2" ry="3.8" fill="#3A2418"/><ellipse cx="62.5" cy="50.4" rx="1.6" ry=".9" fill="#fff" opacity=".7"/>
<path d="M64 55v3.5M64 58.5C61 61.5 58 60.5 57 58.5M64 58.5C67 61.5 70 60.5 71 58.5" stroke="#3A2418" stroke-width="1.7" fill="none" stroke-linecap="round"/>
<circle cx="52" cy="42" r="4.2" fill="url(#td_e)"/><circle cx="76" cy="42" r="4.2" fill="url(#td_e)"/>
<circle cx="50.6" cy="40.6" r="1.4" fill="#fff"/><circle cx="74.6" cy="40.6" r="1.4" fill="#fff"/>
<ellipse cx="46" cy="54" rx="5" ry="3" fill="#FF8FA3" opacity=".45"/><ellipse cx="82" cy="54" rx="5" ry="3" fill="#FF8FA3" opacity=".45"/>
<path d="M46 26C52 21 58 19 64 19" stroke="#FFE2C4" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/>
${sparkle(112, 52, 4, '#FFE08A')}${miniHeart(112, 18, 1, '#FF4D7E')}`;

/* ───────── Gül dəstəsi ───────── */
const roseHead = (x: number, y: number, r: number, g: string, dk: string) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g})"/>
<path d="M${x - r * 0.55} ${y + r * 0.05}C${x - r * 0.55} ${y - r * 0.6} ${x + r * 0.5} ${y - r * 0.65} ${x + r * 0.45} ${y}C${x + r * 0.35} ${y + r * 0.45} ${x - r * 0.25} ${y + r * 0.4} ${x - r * 0.2} ${y - r * 0.1}C${x - r * 0.1} ${y - r * 0.35} ${x + r * 0.2} ${y - r * 0.25} ${x + r * 0.15} ${y}" stroke="${dk}" stroke-width="${(r * 0.13).toFixed(1)}" fill="none" stroke-linecap="round" opacity=".8"/>
<path d="M${x - r * 0.75} ${y - r * 0.2}C${x - r * 0.6} ${y - r * 0.7} ${x - r * 0.2} ${y - r * 0.85} ${x + r * 0.1} ${y - r * 0.85}" stroke="#fff" stroke-opacity=".55" stroke-width="${(r * 0.14).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
const bouquet = `<defs>
${lg('bq_p', [[0, '#FFE0EA'], [0.5, '#F7A6C2'], [1, '#D35E89']], 0, 0, 1, 0)}
${lg('bq_q', [[0, '#FFF6F9'], [1, '#F6C2D4']])}
${rg('bq_r', [[0, '#FF95AC'], [0.6, '#E3164B'], [1, '#7E0627']], 0.4, 0.35, 0.7)}
${rg('bq_k', [[0, '#FFE3EA'], [0.6, '#FF86A6'], [1, '#C2335C']], 0.4, 0.35, 0.7)}
${lg('bq_lf', [[0, '#8BEA9F'], [0.5, '#34A853'], [1, '#14592A']], 0, 0, 1, 1)}
${lg('bq_rb', GOLD)}
</defs>
${halo('bq', '#FF6A95', 64, 46, 60, 0.35)}${shadow('bq', 64, 122, 18, 4)}
<path d="M40 54C26 42 22 26 26 18 36 28 42 40 44 52Z" fill="url(#bq_lf)"/><path d="M88 54C102 42 106 26 102 18 92 28 86 40 84 52Z" fill="url(#bq_lf)"/>
<path d="M60 40C54 26 56 12 62 6 66 18 66 30 64 40Z" fill="url(#bq_lf)"/>
<path d="M30 52L64 120 98 52C86 60 42 60 30 52Z" fill="url(#bq_q)"/>
${roseHead(42, 40, 13, 'bq_r', '#6A0418')}${roseHead(86, 40, 13, 'bq_r', '#6A0418')}${roseHead(64, 28, 14, 'bq_k', '#A3254B')}
${roseHead(53, 54, 12, 'bq_k', '#A3254B')}${roseHead(75, 54, 12, 'bq_r', '#6A0418')}
${[[30, 30], [98, 28], [64, 46], [36, 56], [92, 56], [76, 16], [50, 18]].map(([x, y]) => `<g fill="#fff"><circle cx="${x}" cy="${y}" r="2.2"/><circle cx="${x + 3}" cy="${y + 2}" r="1.6"/><circle cx="${x - 2}" cy="${y + 3}" r="1.4"/></g>`).join('')}
<path d="M22 58C40 66 52 64 64 70 76 64 88 66 106 58L70 122C66 124 62 124 58 122Z" fill="url(#bq_p)"/>
<path d="M64 70L64 120M42 64L60 118M86 64L68 118" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none"/>
<path d="M64 92C52 80 40 86 46 96 50 100 58 96 64 92ZM64 92C76 80 88 86 82 96 78 100 70 96 64 92Z" fill="url(#bq_rb)"/>
<path d="M62 94L55 112 60 110 63 116ZM66 94L73 112 68 110 65 116Z" fill="#E39A12"/><circle cx="64" cy="92" r="4.2" fill="url(#bq_rb)"/>
${sparkle(110, 14, 5, '#FFE08A')}${sparkle(16, 40, 3.5)}`;

/* ───────── Tar ───────── */
const tar = `<defs>
${rg('ta_w', [[0, '#F2A866'], [0.55, '#B5601F'], [1, '#5E2A0B']], 0.38, 0.35, 0.75)}
${rg('ta_m', [[0, '#FFF9EE'], [1, '#E3C99F']], 0.4, 0.35, 0.7)}
${lg('ta_n', [[0, '#8A4A1C'], [0.5, '#5A2A0D'], [1, '#2E1405']], 0, 0, 1, 0)}
${lg('ta_au', GOLD)}
</defs>
${halo('ta', '#FFB347', 64, 66, 60, 0.35)}
<g transform="rotate(-32 64 64) translate(0 6)">
<ellipse cx="66" cy="114" rx="22" ry="4" fill="#000" opacity=".18"/>
<rect x="60.5" y="4" width="7" height="44" rx="2" fill="url(#ta_n)"/>
${Array.from({ length: 10 }, (_, i) => `<path d="M60.5 ${10 + i * 3.6}h7" stroke="#F1CF84" stroke-width=".8"/>`).join('')}
<rect x="57" y="-6" width="14" height="12" rx="3.5" fill="url(#ta_n)"/>
${[[54, -3], [74, -3], [54, 3], [74, 3]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="url(#ta_au)"/>`).join('')}
<path d="M64 44C76 44 82 54 78 64 76 68 74 70 76 72 90 74 88 112 64 112 40 112 38 74 52 72 54 70 52 68 50 64 46 54 52 44 64 44Z" fill="url(#ta_w)"/>
<ellipse cx="64" cy="93" rx="16" ry="14" fill="url(#ta_m)"/><ellipse cx="64" cy="61" rx="9" ry="8" fill="url(#ta_m)" opacity=".92"/>
${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<circle cx="${(64 + Math.cos(a) * 19).toFixed(1)}" cy="${(93 + Math.sin(a) * 17).toFixed(1)}" r="1.3" fill="#E6F4FF"/>`; }).join('')}
<rect x="56" y="98" width="16" height="3.2" rx="1" fill="#5A2C0E"/>
<path d="M62 -2V100M64 -2V100M66 -2V100" stroke="#FFF7E2" stroke-width=".6"/>
<path d="M45 84C46 76 50 73 54 72" stroke="#fff" stroke-opacity=".4" stroke-width="2.4" fill="none" stroke-linecap="round"/>
</g>
<g fill="url(#ta_au)"><ellipse cx="100" cy="40" rx="5" ry="3.6" transform="rotate(-20 100 40)"/><rect x="103.6" y="16" width="2" height="23"/><path d="M104 16C110 18 114 22 112 30 110 24 107 22 104 22Z"/>
<ellipse cx="112" cy="74" rx="4" ry="3" transform="rotate(-20 112 74)"/><rect x="114.8" y="56" width="1.6" height="17"/></g>
${sparkle(22, 24, 4, '#FFE08A')}`;

/* ───────── Ətir ───────── */
const perfume = `<defs>
${lg('pf_g', [[0, '#FFE2F0', 0.95], [0.5, '#F56FB0', 0.9], [1, '#8E1048', 0.95]], 0, 0, 1, 1)}
${lg('pf_l', [[0, '#FF8DC2'], [1, '#B3154F']])}
${lg('pf_c', [[0, '#FFE6F3'], [0.5, '#F49AC6'], [1, '#B8306E']], 0, 0, 1, 1)}
${lg('pf_au', GOLD)}
${rg('pf_b', [[0, '#FFC2DD'], [1, '#C02B6C']], 0.4, 0.35, 0.7)}
</defs>
${halo('pf', '#FF6FB0', 64, 70, 60, 0.35)}${shadow('pf', 64, 118, 32, 5)}
<path d="M34 58C34 50 40 46 48 46H80C88 46 94 50 94 58V100C94 110 88 114 80 114H48C40 114 34 110 34 100Z" fill="url(#pf_g)"/>
<path d="M38 70H90V100C90 107 86 110 80 110H48C42 110 38 107 38 100Z" fill="url(#pf_l)" opacity=".9"/>
<path d="M38 70H90" stroke="#FFD1E6" stroke-width="1.4" opacity=".8"/>
<path d="M48 46L40 58V100M80 46L88 58V100M40 58H88" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/>
<path d="M41 55C41 51 44 50 46 50V106C42 104 41 102 41 98Z" fill="#fff" opacity=".45"/>
<rect x="52" y="80" width="24" height="15" rx="3" fill="url(#pf_au)"/><rect x="55" y="83" width="18" height="9" rx="2" fill="none" stroke="#8A5206" stroke-width=".9"/>
<path d="M61 88.5h6" stroke="#8A5206" stroke-width="1.4" stroke-linecap="round"/>
<rect x="54" y="36" width="20" height="12" rx="2" fill="url(#pf_au)"/><path d="M54 40h20" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>
<path d="M50 36L56 16H72L78 36Z" fill="url(#pf_c)"/><path d="M56 16L60 36M72 16L68 36M64 16V36M50 36L64 26 78 36" stroke="#fff" stroke-opacity=".55" stroke-width=".9" fill="none"/>
<path d="M74 41C90 41 96 33 100 27" stroke="url(#pf_au)" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<ellipse cx="106" cy="22" rx="9" ry="11" fill="url(#pf_b)"/><path d="M99 18C103 22 109 22 113 18M98 25C103 29 109 29 114 25" stroke="#FFD1E6" stroke-opacity=".6" stroke-width="1" fill="none"/>
<path d="M106 33V44M103 33L100 44M109 33L112 44" stroke="url(#pf_au)" stroke-width="1.4" stroke-linecap="round"/>
${sparkle(24, 32, 5, '#FFE08A')}${sparkle(16, 50, 3)}${sparkle(30, 18, 2.5)}`;

/* ───────── Şampan ───────── */
const champagne = `<defs>
${lg('cp_b', [[0, '#0A2E22'], [0.35, '#1F7A55'], [0.6, '#145A3E'], [1, '#06201A']], 0, 0, 1, 0)}
${lg('cp_au', GOLD, 0, 0, 1, 1)}
${lg('cp_lb', [[0, '#FFF8E6'], [1, '#EBD9AE']])}
${lg('cp_w', [[0, '#FFF0B8'], [1, '#F2B93B']])}
</defs>
${halo('cp', '#FFD54A', 64, 50, 62, 0.35)}${shadow('cp', 64, 120, 42, 5)}
<g transform="rotate(-24 58 76)">
<path d="M44 120V62C44 52 52 46 54 38V14H62V38C64 46 72 52 72 62V120C72 124 44 124 44 120Z" fill="url(#cp_b)"/>
<path d="M53 10H63V40C64 46 68 50 70 54H46C48 50 52 46 53 40Z" fill="url(#cp_au)"/>
<path d="M54 18l8 3M54 26l8-2M54 33l8 3" stroke="#9A5A04" stroke-opacity=".5" stroke-width="1"/>
<rect x="46" y="78" width="24" height="22" rx="2" fill="url(#cp_lb)"/><rect x="48" y="80" width="20" height="18" rx="1.5" fill="none" stroke="#C99A2E" stroke-width="1"/>
<path d="M58 84l2 4 4 .5-3 2.5 1 4-4-2-4 2 1-4-3-2.5 4-.5z" fill="#C99A2E"/>
<path d="M48 60V118" stroke="#fff" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round"/>
</g>
${[[30, 14, 2.6], [22, 24, 2], [38, 6, 1.8], [16, 12, 1.6], [28, 30, 1.4], [44, 18, 1.6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF0B8"/>`).join('')}
<path d="M34 24C28 18 26 10 28 4M38 26C36 18 38 10 42 4" stroke="#FFF0B8" stroke-opacity=".7" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<path d="M90 40H114C114 62 110 75 102 77 94 75 90 62 90 40Z" fill="#fff" opacity=".22"/>
<path d="M91 50H113C112 64 108 73 102 75 96 73 92 64 91 50Z" fill="url(#cp_w)" opacity=".92"/>
<path d="M90 40H114C114 62 110 75 102 77 94 75 90 62 90 40Z" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.3"/>
<path d="M102 77V108" stroke="#fff" stroke-opacity=".85" stroke-width="2.2"/><ellipse cx="102" cy="110" rx="11" ry="2.8" fill="#fff" opacity=".7"/>
<path d="M94 46C94 56 96 64 99 70" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${[[100, 66], [105, 60], [98, 57], [106, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#fff" opacity=".9"/>`).join('')}
${sparkle(118, 30, 4, '#FFE08A')}`;

/* ───────── Nişan üzüyü ───────── */
const diamondGem = (p: string, cx: number, cy: number, s: number, tint: [string, string, string]) => `<defs>
${lg(`${p}_d1`, [[0, '#FFFFFF'], [0.5, tint[0]], [1, tint[1]]], 0, 0, 1, 1)}
${lg(`${p}_d2`, [[0, tint[0]], [1, tint[2]]])}
</defs>
<g transform="translate(${cx} ${cy}) scale(${s})">
<path d="M-14 -4L-8 -12H8L14 -4Z" fill="url(#${p}_d1)"/>
<path d="M-14 -4H14L0 16Z" fill="url(#${p}_d2)"/>
<path d="M-14 -4L-6 -4 0 16ZM6 -4H14L0 16Z" fill="#fff" opacity=".25"/>
<path d="M-8 -12L-4 -4 0 -12 4 -4 8 -12M-14 -4H14M-6 -4L0 16 6 -4M-4 -4L0 -12" stroke="#fff" stroke-opacity=".85" stroke-width=".7" fill="none" stroke-linejoin="round"/>
</g>`;
const ring = `<defs>
${lg('rg_bx', [[0, '#E8325A'], [1, '#7E0924']])}
${lg('rg_ld', [[0, '#C21843'], [1, '#5E0619']])}
${lg('rg_st', [[0, '#FFF6F9'], [1, '#F0BFCD']])}
${lg('rg_au', GOLD, 0, 0, 1, 1)}
</defs>
${halo('rg', '#FFD54A', 64, 50, 60, 0.4)}${shadow('rg', 64, 120, 46, 5)}
<path d="M26 30H102C106 30 108 33 108 37V70H20V37C20 33 22 30 26 30Z" fill="url(#rg_ld)"/>
<rect x="26" y="36" width="76" height="28" rx="5" fill="url(#rg_st)"/><path d="M30 42C50 38 78 38 98 42" stroke="#fff" stroke-width="2" opacity=".8" fill="none"/>
<path d="M22 80H106V108C106 113 102 116 97 116H31C26 116 22 113 22 108Z" fill="url(#rg_bx)"/>
<path d="M22 80H106V86H22Z" fill="#fff" opacity=".18"/>
<ellipse cx="64" cy="82" rx="38" ry="7" fill="#4A0413"/>
<circle cx="64" cy="66" r="17" fill="none" stroke="url(#rg_au)" stroke-width="5.5"/>
<path d="M50 58C52 54 56 51 60 50" stroke="#fff" stroke-opacity=".7" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M24 82C40 92 88 92 104 82V90H24Z" fill="#7A0A22"/>
<path d="M56 50L60 46H68L72 50Z" fill="url(#rg_au)"/>
${diamondGem('rg', 64, 38, 1.05, ['#CDEBFF', '#5AA9F0', '#2A6FD6'])}
${sparkle(84, 24, 7)}${sparkle(42, 22, 4, '#FFE08A')}${sparkle(98, 52, 3)}`;

/* ───────── Atəşfəşanlıq ───────── */
const burstSvg = (cx: number, cy: number, r: number, a: string, b: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const ang = (i / n) * Math.PI * 2;
    const x1 = cx + Math.cos(ang) * r * 0.28, y1 = cy + Math.sin(ang) * r * 0.28;
    const x2 = cx + Math.cos(ang) * r, y2 = cy + Math.sin(ang) * r;
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${a}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${(cx + Math.cos(ang) * (r + 4)).toFixed(1)}" cy="${(cy + Math.sin(ang) * (r + 4)).toFixed(1)}" r="1.9" fill="${b}"/>`;
  }).join('') + `<circle cx="${cx}" cy="${cy}" r="${r * 0.2}" fill="#fff" opacity=".9"/>`;
const fireworks = `<defs>${rgu('fw_n', [[0, '#3B2A8A', 0.85], [1, '#120C2E', 0]], 64, 60, 64)}</defs>
<circle cx="64" cy="60" r="64" fill="url(#fw_n)"/>
<path d="M44 120C44 96 44 70 44 46M88 120C88 90 88 60 88 38M82 120C82 104 82 92 82 82" stroke="#FFE08A" stroke-opacity=".35" stroke-width="1.6" stroke-dasharray="2 4"/>
${burstSvg(44, 46, 30, '#FFD166', '#FF8FA3', 14)}${burstSvg(90, 36, 23, '#7DD3FC', '#C4B5FD', 12)}${burstSvg(84, 84, 20, '#F472B6', '#FDE68A', 12)}
${sparkle(18, 90, 4, '#FFE08A')}${sparkle(110, 104, 3)}${sparkle(116, 64, 3.5, '#C4B5FD')}${sparkle(20, 16, 3)}`;

/* ───────── Tac (qızıl və almaz) ───────── */
const crownBody = (p: string, metal: typeof GOLD, gem: [string, string, string], gem2: [string, string, string], velvet: [string, string]) => `<defs>
${lg(`${p}_m`, metal)}
${lg(`${p}_m2`, metal, 0, 0, 1, 0)}
${rg(`${p}_v`, [[0, velvet[0]], [1, velvet[1]]], 0.5, 0.8, 0.8)}
${rg(`${p}_g`, [[0, gem[0]], [0.5, gem[1]], [1, gem[2]]], 0.35, 0.3, 0.7)}
${rg(`${p}_g2`, [[0, gem2[0]], [0.5, gem2[1]], [1, gem2[2]]], 0.35, 0.3, 0.7)}
${rg(`${p}_pr`, [[0, '#FFFFFF'], [0.7, '#F1EADF'], [1, '#BFB3A2']], 0.35, 0.3, 0.7)}
${lg(`${p}_sh`, [[0, '#fff', 0.55], [0.5, '#fff', 0]], 0, 0, 1, 1)}
</defs>
<path d="M30 74C30 46 46 36 64 36 82 36 98 46 98 74Z" fill="url(#${p}_v)"/>
<path d="M18 46L30 76 41 30 52 68 64 22 76 68 87 30 98 76 110 46 102 96H26Z" fill="url(#${p}_m)"/>
<path d="M18 46L30 76 41 30 52 68 64 22 76 68 87 30 98 76 110 46 102 96H26Z" fill="url(#${p}_sh)"/>
<path d="M18 46L30 76 41 30 52 68 64 22 76 68 87 30 98 76 110 46" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
<rect x="22" y="90" width="84" height="18" rx="5" fill="url(#${p}_m2)"/>
<path d="M24 94H104" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>
<ellipse cx="64" cy="99" rx="8" ry="5.4" fill="url(#${p}_g)"/>
<circle cx="42" cy="99" r="4.4" fill="url(#${p}_g2)"/><circle cx="86" cy="99" r="4.4" fill="url(#${p}_g2)"/>
<circle cx="29" cy="99" r="2.6" fill="url(#${p}_pr)"/><circle cx="99" cy="99" r="2.6" fill="url(#${p}_pr)"/>
<path d="M64 44C70 50 70 58 64 62 58 58 58 50 64 44Z" fill="url(#${p}_g)"/>
<circle cx="41" cy="56" r="3.6" fill="url(#${p}_g2)"/><circle cx="87" cy="56" r="3.6" fill="url(#${p}_g2)"/>
${[[18, 44], [41, 28], [64, 20], [87, 28], [110, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2" fill="url(#${p}_pr)"/><circle cx="${x - 1.6}" cy="${y - 1.8}" r="1.4" fill="#fff"/>`).join('')}
<ellipse cx="61.5" cy="97.5" rx="2.4" ry="1.3" fill="#fff" opacity=".7"/>`;
const crown = `${halo('cr', '#FFD54A', 64, 60, 62, 0.45)}${shadow('cr', 64, 118, 44, 5)}${crownBody('cr', GOLD, ['#FFB3BF', '#E3173F', '#6E0418'], ['#CFE3FF', '#2F6BFF', '#0B2C8A'], ['#D41E4D', '#5E0619'])}
${sparkle(112, 18, 6)}${sparkle(14, 24, 4, '#FFE08A')}${sparkle(118, 70, 3)}`;

/* ───────── Xəzər / Bulvar ───────── */
const caspian = `<defs>
<clipPath id="cs_c"><circle cx="64" cy="64" r="56"/></clipPath>
${lg('cs_sky', [[0, '#2B1B5A'], [0.45, '#C2417A'], [0.75, '#FF8A4C'], [1, '#FFD27A']])}
${rg('cs_sun', [[0, '#FFF8D6'], [0.5, '#FFC24A'], [1, '#FF8A3D', 0]])}
${lg('cs_sea', [[0, '#2A7DB8'], [1, '#0A2F57']])}
${lg('cs_ft', [[0, '#FFB347'], [1, '#C2264F']])}
${lg('cs_au', GOLD, 0, 0, 1, 1)}
${lg('cs_gl', [[0, '#fff', 0.5], [0.5, '#fff', 0]], 0, 0, 1, 1)}
</defs>
${halo('cs', '#FF8A4C', 64, 64, 64, 0.35)}
<g clip-path="url(#cs_c)">
<rect x="0" y="0" width="128" height="80" fill="url(#cs_sky)"/>
<circle cx="70" cy="76" r="20" fill="url(#cs_sun)"/>
<path d="M20 74C20 64 22 56 26 48 28 56 30 64 30 74ZM30 74C30 60 33 48 38 38 42 50 43 62 42 74ZM42 74C42 66 44 60 48 54 50 62 50 68 50 74Z" fill="url(#cs_ft)"/>
<path d="M14 76C24 70 40 70 56 76Z" fill="#2A1640"/>
<rect x="0" y="76" width="128" height="52" fill="url(#cs_sea)"/>
${[[80, 12, 0.7], [84, 9, 0.6], [87, 7, 0.5], [91, 5, 0.4]].map(([y, rx, o]) => `<ellipse cx="70" cy="${y}" rx="${rx}" ry="1.4" fill="#FFD27A" opacity="${o}"/>`).join('')}
<path d="M8 88C16 85 22 91 30 88M40 96C48 93 54 99 62 96M84 92C92 89 98 95 106 92M20 104C28 101 34 107 42 104" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<path d="M0 108H128V128H0Z" fill="#2A1A30"/><path d="M0 108H128" stroke="url(#cs_au)" stroke-width="2"/>
${[94, 112].map((x) => `<path d="M${x} 108V86" stroke="#1A0F1E" stroke-width="2.4"/><path d="M${x - 4} 86H${x + 4}" stroke="#1A0F1E" stroke-width="2"/><circle cx="${x}" cy="84" r="3.2" fill="#FFE8A3"/><circle cx="${x}" cy="84" r="7" fill="#FFE8A3" opacity=".25"/>`).join('')}
<path d="M84 34q4-4 8 0q4-4 8 0M100 24q3-3 6 0q3-3 6 0" stroke="#2A1640" stroke-width="1.8" fill="none" stroke-linecap="round"/>
</g>
<circle cx="64" cy="64" r="56" fill="none" stroke="url(#cs_au)" stroke-width="4.5"/>
<path d="M20 40C28 22 46 12 64 12" stroke="url(#cs_gl)" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
${sparkle(114, 18, 5, '#FFE08A')}${sparkle(12, 104, 3.5)}`;

/* ───────── Qız Qalası ───────── */
const maidenBody = (p: string) => `<defs>
${lg(`${p}_s`, [[0, '#FBEBCB'], [0.35, '#E8C995'], [0.75, '#B48A55'], [1, '#7E5A30']], 0, 0, 1, 0)}
${lg(`${p}_b`, [[0, '#C9A46E'], [1, '#76552E']], 0, 0, 1, 0)}
${lg(`${p}_w`, [[0, '#D9BD8A'], [1, '#9C7A4A']])}
</defs>
<rect x="64" y="2" width="1.6" height="24" fill="#6B5A44"/>
<rect x="65.6" y="3" width="20" height="4.4" fill="#00B5E2"/><rect x="65.6" y="7.4" width="20" height="4.4" fill="#EF3340"/><rect x="65.6" y="11.8" width="20" height="4.4" fill="#509E2F"/>
<circle cx="75" cy="9.6" r="1.6" fill="#fff"/><circle cx="75.6" cy="9.6" r="1.3" fill="#EF3340"/>
<path d="M42 116V30C42 26 86 26 86 30V116Z" fill="url(#${p}_s)"/>
<path d="M84 116V42C84 40 99 41 99 46V116Z" fill="url(#${p}_b)"/>
<rect x="40" y="24" width="48" height="9" rx="1.5" fill="url(#${p}_s)"/>
${[42, 50, 58, 66, 74, 82].map((x) => `<rect x="${x}" y="19" width="5" height="6" fill="url(#${p}_s)"/>`).join('')}
${Array.from({ length: 13 }, (_, i) => `<path d="M42 ${40 + i * 6}H99" stroke="#7E5A30" stroke-opacity=".28" stroke-width=".8"/>`).join('')}
${Array.from({ length: 13 }, (_, i) => `<path d="M${48 + (i % 2) * 8} ${40 + i * 6}v6M${68 + (i % 2) * 8} ${40 + i * 6}v6" stroke="#7E5A30" stroke-opacity=".2" stroke-width=".7"/>`).join('')}
<path d="M54 52a2.5 2.5 0 0 1 5 0v8h-5zM70 72a2.5 2.5 0 0 1 5 0v8h-5zM56 90a2.5 2.5 0 0 1 5 0v8h-5z" fill="#3B2A1A"/>
<path d="M57 116V106a7 7 0 0 1 14 0v10z" fill="#3B2A1A"/>
<path d="M46 34V112" stroke="#fff" stroke-opacity=".35" stroke-width="2.4"/>`;
const maiden_tower = `<defs>${rgu('mt_n', [[0, '#FFB25A', 0.55], [1, '#FF6A3D', 0]], 64, 66, 64)}</defs>
<circle cx="64" cy="66" r="62" fill="url(#mt_n)"/>
<path d="M108 14a10 10 0 1 0 8 16 8 8 0 1 1-8-16z" fill="#FFE8A3"/>
${maidenBody('mt')}
<path d="M4 116H124V126H4Z" fill="#B48A55"/>${[4, 16, 28, 92, 104, 116].map((x) => `<rect x="${x}" y="110" width="7" height="7" fill="#C9A46E"/>`).join('')}
<path d="M4 116H124" stroke="#7E5A30" stroke-opacity=".4"/>
${sparkle(20, 30, 3.5)}${sparkle(30, 12, 2.5)}${sparkle(112, 52, 3, '#FFE08A')}`;

/* ───────── Alov Qüllələri ───────── */
const FT = [
  'M16 116C14 94 18 72 30 52 34 46 38 42 40 36 46 52 50 68 50 84 50 94 48 106 48 116Z',
  'M44 116C42 86 46 58 58 34 62 26 64 18 64 8 74 28 82 48 84 72 85 88 84 102 84 116Z',
  'M80 116C80 98 82 82 90 68 94 62 98 56 100 48 108 64 112 80 112 94 112 102 110 108 110 116Z',
];
const flameTowersBody = (p: string) => `<defs>
${lg(`${p}_f`, [[0, '#FFE27A'], [0.35, '#FFA62B'], [0.7, '#FF5A1F'], [1, '#C81D3D']])}
${lg(`${p}_gl`, [[0, '#fff', 0.4], [0.45, '#fff', 0], [1, '#000', 0.28]], 0, 0, 1, 0)}
${FT.map((d, i) => `<clipPath id="${p}_c${i}"><path d="${d}"/></clipPath>`).join('')}
</defs>
${FT.map((d, i) => `<path d="${d}" fill="url(#${p}_f)"/><g clip-path="url(#${p}_c${i})">${Array.from({ length: 22 }, (_, j) => `<path d="M0 ${12 + j * 5}H128" stroke="#7A1E0E" stroke-opacity=".32" stroke-width=".7"/>`).join('')}<path d="M0 0H128V128H0Z" fill="url(#${p}_gl)"/></g><path d="${d}" fill="none" stroke="#FFE7A0" stroke-opacity=".75" stroke-width="1.1"/>`).join('')}
<path d="M64 14C70 34 76 56 76 84M35 46C40 60 44 76 44 100M100 56C104 70 106 84 106 104" stroke="#FFF6C8" stroke-opacity=".55" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
const flame_towers = `<defs>${rgu('ft_n', [[0, '#3A2A8E', 0.7], [1, '#120C2E', 0]], 64, 70, 64)}${rgu('ft_o', [[0, '#FF8A3D', 0.6], [1, '#FF8A3D', 0]], 64, 112, 50)}</defs>
<circle cx="64" cy="66" r="62" fill="url(#ft_n)"/><ellipse cx="64" cy="112" rx="56" ry="22" fill="url(#ft_o)"/>
${flameTowersBody('ft')}
<path d="M0 116C30 108 98 108 128 116V126H0Z" fill="#1B1033"/>
${sparkle(20, 24, 3.5)}${sparkle(112, 20, 4, '#FFE08A')}${sparkle(100, 34, 2.5)}`;

/* ───────── İdman avtomobili ───────── */
const carBody = `<defs>
${lg('sc_b', [[0, '#FF7A7A'], [0.4, '#E11D2E'], [1, '#7A0712']])}
${lg('sc_g', [[0, '#B5E3FF'], [1, '#1B3A5E']], 0, 0, 1, 1)}
</defs>
<circle cx="34" cy="92" r="15.5" fill="#26030A"/><circle cx="98" cy="92" r="15.5" fill="#26030A"/>
<path d="M8 86C8 78 14 74 24 72L46 68C54 58 66 52 80 52 92 52 100 58 106 66L116 70C122 72 124 78 122 86L120 92H113A15 15 0 0 0 83 92H49A15 15 0 0 0 19 92H8Z" fill="url(#sc_b)"/>
<path d="M52 68C58 60 68 56 80 56 88 56 94 60 98 66V68Z" fill="url(#sc_g)"/>
<path d="M78 56V68" stroke="#7A0712" stroke-width="2"/>
<path d="M58 64C62 60 68 58 74 58" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<path d="M18 76C48 70 88 66 116 72" stroke="#fff" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M112 72L121 75 119 78 110 76Z" fill="#FFF6C8"/><rect x="8" y="76" width="6" height="4" rx="1" fill="#FF2A2A"/>
<path d="M60 80C70 78 80 78 88 80L84 85C76 84 68 84 62 85Z" fill="#3A0408"/>
<path d="M8 70L22 67V72L11 73Z" fill="#3A0408"/>
<path d="M50 88H82" stroke="#3A0408" stroke-opacity=".5" stroke-width="2"/>`;
const wheel = (x: number, y: number) => `<g transform="translate(${x} ${y})"><circle r="13" fill="#121212"/><circle r="9" fill="url(#wh_r)"/>
${[0, 72, 144, 216, 288].map((a) => `<path d="M0 0L${(Math.cos((a * Math.PI) / 180) * 8.5).toFixed(2)} ${(Math.sin((a * Math.PI) / 180) * 8.5).toFixed(2)}" stroke="#4B5563" stroke-width="2.2" stroke-linecap="round"/>`).join('')}
<circle r="2.6" fill="#D1D5DB"/><path d="M-6-5A8 8 0 0 1 2-8" stroke="#FFC23D" stroke-width="2" fill="none"/></g>`;
const wheelDefs = `<defs>${rg('wh_r', [[0, '#FFFFFF'], [0.6, '#B8C0CC'], [1, '#5B6573']], 0.4, 0.35, 0.7)}</defs>`;
const sports_car = `${halo('sc', '#FF4D4D', 64, 76, 60, 0.3)}${shadow('sc', 66, 106, 58, 5, 0.45)}${carBody}${wheelDefs}${wheel(34, 92)}${wheel(98, 92)}
<path d="M2 62H18M0 70H12M4 54H14" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>${sparkle(108, 40, 4, '#FFE08A')}`;

/* ───────── Raket ───────── */
const rocketBody = `<defs>
${lg('rk_b', [[0, '#FFFFFF'], [0.5, '#E6ECF5'], [1, '#8E9BB0']], 0, 0, 1, 0)}
${lg('rk_r', [[0, '#FF7070'], [1, '#B3121F']], 0, 0, 1, 0)}
${rg('rk_w', [[0, '#D6F4FF'], [0.5, '#2B7BD6'], [1, '#0B2A5E']], 0.35, 0.3, 0.7)}
${lg('rk_s', SILVER, 0, 0, 1, 1)}
</defs>
<path d="M46 72L24 96 28 108 48 94Z" fill="url(#rk_r)"/><path d="M82 72L104 96 100 108 80 94Z" fill="url(#rk_r)"/>
<path d="M64 8C80 22 86 46 84 76L80 96H48L44 76C42 46 48 22 64 8Z" fill="url(#rk_b)"/>
<path d="M64 8C74 17 79 28 81 38H47C49 28 54 17 64 8Z" fill="url(#rk_r)"/>
<path d="M45 66H83V71H45Z" fill="url(#rk_r)"/>
<circle cx="64" cy="54" r="10.5" fill="url(#rk_s)"/><circle cx="64" cy="54" r="7.4" fill="url(#rk_w)"/><ellipse cx="61.5" cy="51.5" rx="2.6" ry="1.6" fill="#fff" opacity=".8"/>
<rect x="61" y="84" width="6" height="22" rx="2" fill="url(#rk_r)"/>
<path d="M50 96H78L74 104H54Z" fill="#4B5563"/>
<path d="M52 30C50 42 49 56 50 74" stroke="#fff" stroke-opacity=".8" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
const rocketFlameBody = `<defs>${lg('rf_o', [[0, '#FFF6B0'], [0.4, '#FFB020'], [1, '#FF4D1F', 0]])}${lg('rf_i', [[0, '#FFFFFF'], [1, '#FFE27A', 0]])}</defs>
<path d="M52 104C48 116 56 128 64 136 72 128 80 116 76 104Z" fill="url(#rf_o)"/><path d="M57 104C55 112 60 120 64 126 68 120 73 112 71 104Z" fill="url(#rf_i)"/>`;
const rocket = `${halo('rk', '#7DB4FF', 64, 64, 62, 0.35)}<g transform="rotate(35 64 64) translate(0 -6) scale(.92) translate(5 5)">${rocketFlameBody}${rocketBody}</g>
<g opacity=".8"><circle cx="22" cy="108" r="10" fill="#E5E7EB"/><circle cx="34" cy="116" r="8" fill="#F3F4F6"/><circle cx="12" cy="118" r="7" fill="#D1D5DB"/></g>
${sparkle(104, 20, 4)}${sparkle(20, 30, 3, '#FFE08A')}${sparkle(112, 60, 2.5)}`;

/* ───────── Yaxta ───────── */
const yachtBoat = `<defs>
${lg('ya_h', [[0, '#FFFFFF'], [0.6, '#E2E8F0'], [1, '#8E9BB0']])}
${lg('ya_g', [[0, '#5EC3FF'], [1, '#0B2A5E']])}
${lg('ya_au', GOLD, 0, 0, 1, 0)}
</defs>
<path d="M74 54V36" stroke="#94A3B8" stroke-width="2"/><circle cx="74" cy="35" r="3.2" fill="#E2E8F0"/><path d="M68 42H80" stroke="#94A3B8" stroke-width="1.6"/>
<path d="M46 66L52 54H88L92 66Z" fill="url(#ya_h)"/><path d="M56 57H86L88 62H54Z" fill="url(#ya_g)"/>
<path d="M28 80L36 66H100L108 80Z" fill="url(#ya_h)"/><path d="M40 70H98L102 76H38Z" fill="url(#ya_g)"/>
<path d="M36 66H100" stroke="url(#ya_au)" stroke-width="1.6"/>
<path d="M10 80H118C114 92 104 100 90 102H30C20 100 14 92 10 80Z" fill="url(#ya_h)"/>
<path d="M14 88H114" stroke="#1E3A8A" stroke-width="3.2"/><path d="M16 84H112" stroke="url(#ya_au)" stroke-width="1.2"/>
${[30, 40, 50].map((x) => `<circle cx="${x + 50}" cy="94" r="1.6" fill="#1E3A8A"/>`).join('')}
<path d="M14 82C40 81 80 81 116 81" stroke="#fff" stroke-width="1.4" opacity=".9"/>
<path d="M30 72L36 66" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/>
<path d="M24 76V62L14 66Z" fill="#EF3340"/>`;
const waveBody = `<defs>${lg('wv_g', [[0, '#5FD0FF'], [0.5, '#1C8FD6'], [1, '#0A4D8C']])}</defs>
<path d="M0 12C16 4 32 4 48 12S80 20 96 12 128 4 144 12 176 20 192 12 224 4 256 12V64H0Z" fill="url(#wv_g)"/>
<path d="M0 12C16 4 32 4 48 12S80 20 96 12 128 4 144 12 176 20 192 12 224 4 256 12" stroke="#fff" stroke-opacity=".8" stroke-width="2.4" fill="none"/>
<path d="M20 30C30 26 40 26 50 30M100 36C110 32 120 32 130 36M170 28C180 24 190 24 200 28" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
const yacht = `${halo('ya', '#5EC3FF', 64, 72, 60, 0.35)}${yachtBoat}
<g transform="translate(0 96) scale(.5 .5)">${waveBody}</g>
${sparkle(106, 30, 5, '#FFE08A')}${sparkle(22, 44, 3.5)}`;

/* ───────── Saray ───────── */
const palaceBody = (p: string) => `<defs>
${lg(`${p}_w`, [[0, '#FFF7E8'], [0.6, '#F3D9B1'], [1, '#CFA46C']], 0, 0, 1, 0)}
${lg(`${p}_r`, [[0, '#FF9CBD'], [0.5, '#E2336B'], [1, '#8E1342']], 0, 0, 1, 0)}
${lg(`${p}_au`, GOLD, 0, 0, 1, 1)}
${lg(`${p}_gl`, [[0, '#FFF1B8'], [1, '#FFB547']])}
</defs>
<rect x="22" y="60" width="16" height="56" fill="url(#${p}_w)"/><rect x="90" y="60" width="16" height="56" fill="url(#${p}_w)"/>
<path d="M19 62L30 34 41 62Z" fill="url(#${p}_r)"/><path d="M87 62L98 34 109 62Z" fill="url(#${p}_r)"/>
<rect x="38" y="70" width="52" height="46" fill="url(#${p}_w)"/>
${[38, 46, 54, 62, 70, 78, 84].map((x) => `<rect x="${x}" y="65" width="6" height="6" fill="url(#${p}_w)"/>`).join('')}
<rect x="52" y="34" width="24" height="40" fill="url(#${p}_w)"/>
<path d="M49 36L64 6 79 36Z" fill="url(#${p}_r)"/>
<path d="M49 36H79M19 62H41M87 62H109M38 71H90" stroke="url(#${p}_au)" stroke-width="2.2"/>
<path d="M64 6V-2" stroke="#9A5A04" stroke-width="1.4"/><path d="M64 -2L73 1 64 4Z" fill="#EF3340"/>
<path d="M30 34V27M98 34V27" stroke="#9A5A04" stroke-width="1.2"/><path d="M30 27L37 29.5 30 32ZM98 27L105 29.5 98 32Z" fill="#EF3340"/>
<circle cx="64" cy="48" r="6" fill="url(#${p}_gl)"/><circle cx="64" cy="48" r="6" fill="none" stroke="url(#${p}_au)" stroke-width="1.6"/>
${[[27, 76], [27, 92], [95, 76], [95, 92], [44, 82], [78, 82]].map(([x, y]) => `<path d="M${x} ${y + 9}V${y + 3}a3 3 0 0 1 6 0v6z" fill="url(#${p}_gl)"/>`).join('')}
<path d="M55 116V100a9 9 0 0 1 18 0v16z" fill="#7A3E12"/><path d="M55 116V100a9 9 0 0 1 18 0v16" fill="none" stroke="url(#${p}_au)" stroke-width="1.8"/>
<path d="M25 64V114M55 38V72" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/>`;
const palace = `${halo('pl', '#FFC24A', 64, 60, 64, 0.45)}${shadow('pl', 64, 120, 54, 5)}${palaceBody('pl')}
<path d="M10 116C40 110 88 110 118 116V120H10Z" fill="#34A853" opacity=".85"/>
${sparkle(112, 16, 5)}${sparkle(14, 22, 4, '#FFE08A')}${sparkle(118, 50, 2.5)}`;

/* ───────── Sevgi planeti ───────── */
const planetBody = (p: string) => `<defs>
${rg(`${p}_p`, [[0, '#FFE0EF'], [0.3, '#FF7DB5'], [0.7, '#C21C76'], [1, '#4E0838']], 0.35, 0.3, 0.75)}
${lg(`${p}_rg`, [[0, '#FFE08A'], [0.5, '#FF8FB8'], [1, '#C4B5FD']], 0, 0, 1, 0)}
<clipPath id="${p}_cl"><circle cx="64" cy="64" r="34"/></clipPath>
</defs>
<g transform="rotate(-18 64 64)"><path d="M8 64A56 15 0 0 1 120 64" stroke="url(#${p}_rg)" stroke-width="5" fill="none" opacity=".7"/></g>
<circle cx="64" cy="64" r="34" fill="url(#${p}_p)"/>
<g clip-path="url(#${p}_cl)" opacity=".35"><path d="M20 52C40 46 80 46 110 54M22 70C46 64 82 66 108 74M30 86C50 82 78 84 100 90" stroke="#FFD1E6" stroke-width="4" fill="none"/></g>
<ellipse cx="50" cy="48" rx="11" ry="6" transform="rotate(-35 50 48)" fill="#fff" opacity=".5"/>
<g transform="rotate(-18 64 64)"><path d="M8 64A56 15 0 0 0 120 64" stroke="url(#${p}_rg)" stroke-width="5" fill="none"/></g>
${miniHeart(16, 84, 1.3, '#FF4D7E')}${miniHeart(108, 50, 1.1, '#FFD54A')}${miniHeart(64, 92, 0.9, '#fff')}`;
const love_planet = `${halo('lp', '#FF5FA2', 64, 64, 64, 0.45)}${planetBody('lp')}${sparkle(110, 18, 5)}${sparkle(18, 28, 4, '#FFE08A')}${sparkle(104, 106, 3)}${sparkle(30, 110, 2.5)}`;

/* ───────── Almaz hədiyyələri ───────── */
const diamond_heart = `${halo('dh', '#4FA8FF', 64, 62, 62, 0.45)}${shadow('dh', 64, 120, 30, 5)}<defs>${lg('dh_b', [[0, '#E6F4FF'], [0.4, '#7CC4FF'], [0.75, '#2F6BFF'], [1, '#14318A']], 0, 0, 1, 1)}</defs>
<path d="${HEART}" fill="url(#dh_b)"/>
<path d="M14 46C14 28 28 16 43 16 53 16 60 21 64 30L44 44Z" fill="#DDF0FF" opacity=".75"/>
<path d="M64 30C68 21 75 16 85 16 100 16 114 28 114 46L84 44Z" fill="#5AA9F0" opacity=".55"/>
<path d="M44 44L64 30 84 44Z" fill="#fff" opacity=".6"/>
<path d="M14 46L44 44 64 112C60 109 14 82 14 46Z" fill="#2F6BFF" opacity=".45"/>
<path d="M114 46C114 82 68 109 64 112L84 44Z" fill="#0E2A80" opacity=".55"/>
<path d="M44 44H84L64 112Z" fill="#8FD0FF" opacity=".5"/>
<path d="M14 46L44 44 64 30 84 44 114 46M44 44L64 112 84 44M43 16L44 44M85 16L84 44" stroke="#fff" stroke-opacity=".75" stroke-width="1.1" fill="none" stroke-linejoin="round"/>
<path d="${HEART}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/>
${sparkle(40, 30, 6)}${sparkle(108, 18, 5)}${sparkle(90, 80, 3.5)}${sparkle(16, 90, 3, '#BFE3FF')}`;

const diamond_ring = `${halo('dr', '#4FA8FF', 64, 56, 62, 0.45)}${shadow('dr', 64, 120, 30, 5)}<defs>${lg('dr_m', SILVER, 0, 0, 1, 1)}</defs>
<circle cx="64" cy="82" r="28" fill="none" stroke="#5E6A7C" stroke-width="9"/>
<circle cx="64" cy="82" r="28" fill="none" stroke="url(#dr_m)" stroke-width="7"/>
<path d="M42 70C46 62 54 56 62 55" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>
<path d="M52 58L56 52H72L76 58Z" fill="url(#dr_m)"/>
${diamondGem('dr', 64, 36, 2, ['#E6F4FF', '#7CC4FF', '#2F6BFF'])}
${sparkle(96, 18, 8)}${sparkle(30, 26, 5, '#BFE3FF')}${sparkle(104, 66, 3.5)}`;

const silk_carpet = (() => {
  const C = 'M12 52C42 40 72 46 104 34L118 86C88 98 58 90 26 102Z';
  return `${shadow('ca', 66, 118, 50, 6, 0.35)}<defs>
${rg('ca_b', [[0, '#E2364B'], [0.7, '#A1122A'], [1, '#6A0818']], 0.5, 0.5, 0.7)}
${lg('ca_au', GOLD, 0, 0, 1, 1)}
${lg('ca_nv', [[0, '#2A4FB8'], [1, '#0E1F5C']])}
<clipPath id="ca_cl"><path d="${C}"/></clipPath>
</defs>
<path d="${C}" fill="url(#ca_b)"/>
<g clip-path="url(#ca_cl)">
<path d="M18 56C46 46 74 51 102 40L114 82C86 93 58 86 30 97Z" fill="none" stroke="#0E1F5C" stroke-width="6"/>
<path d="M18 56C46 46 74 51 102 40L114 82C86 93 58 86 30 97Z" fill="none" stroke="url(#ca_au)" stroke-width="1.6" stroke-dasharray="3 2"/>
<path d="M65 46L86 66 67 88 46 68Z" fill="url(#ca_nv)"/><path d="M65 54L78 66 67 80 54 68Z" fill="url(#ca_au)"/><path d="M65 60L71 66 67 73 60 68Z" fill="#C2123A"/>
${[[36, 64], [96, 52], [40, 88], [100, 78]].map(([x, y]) => `<path d="M${x} ${y - 6}l6 6-6 6-6-6z" fill="url(#ca_au)"/><circle cx="${x}" cy="${y}" r="1.8" fill="#0E1F5C"/>`).join('')}
<path d="M30 76c4-4 8 4 12 0M84 54c4-4 8 4 12 0M86 90c4-4 8 4 12 0" stroke="#FFE08A" stroke-width="1.4" fill="none"/>
</g>
${Array.from({ length: 9 }, (_, i) => { const x = 12 + i * 1.6, y = 52 + i * 6.2; return `<path d="M${x} ${y}l-6 2" stroke="#FFF1D6" stroke-width="1.4" stroke-linecap="round"/>`; }).join('')}
${Array.from({ length: 9 }, (_, i) => { const x = 104 + i * 1.6, y = 34 + i * 6.2; return `<path d="M${x} ${y}l6-2" stroke="#FFF1D6" stroke-width="1.4" stroke-linecap="round"/>`; }).join('')}
<path d="M14 54C42 43 72 48 102 37" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none"/>
${sparkle(112, 18, 5, '#FFE08A')}${sparkle(20, 24, 3.5)}`;
})();

const diamond_crown = `${halo('dc', '#4FA8FF', 64, 60, 62, 0.45)}${shadow('dc', 64, 118, 44, 5)}${crownBody('dc', SILVER, ['#E6F4FF', '#4FA8FF', '#1A3FA8'], ['#FFFFFF', '#BFE3FF', '#5AA9F0'], ['#2F4FB8', '#0B1A4E'])}
${sparkle(112, 18, 6)}${sparkle(14, 24, 4, '#BFE3FF')}${sparkle(118, 70, 3)}`;

const jetBody = `<defs>
${lg('pj_f', [[0, '#FFFFFF'], [0.55, '#E5EAF2'], [1, '#8E9BB0']])}
${lg('pj_w', SILVER, 0, 0, 1, 1)}
${lg('pj_t', [[0, '#5B8CFF'], [1, '#1A3FA8']])}
${lg('pj_au', GOLD, 0, 0, 1, 0)}
</defs>
<path d="M62 62L74 40H82L76 60Z" fill="#7C8798"/>
<path d="M14 78L8 48H18L32 74Z" fill="url(#pj_t)"/>
<path d="M10 76C30 70 70 62 104 52 114 49 122 50 122 54 122 58 112 62 100 66 70 76 40 84 18 86 10 86 6 80 10 76Z" fill="url(#pj_f)"/>
<path d="M12 80C40 76 76 66 116 56" stroke="#2F6BFF" stroke-width="2.6" fill="none"/><path d="M14 83C42 79 76 69 112 60" stroke="url(#pj_au)" stroke-width="1" fill="none"/>
${[44, 52, 60, 68, 76, 84].map((x, i) => `<ellipse cx="${x}" cy="${(71 - i * 2.6).toFixed(1)}" rx="2.2" ry="1.6" transform="rotate(-16 ${x} ${(71 - i * 2.6).toFixed(1)})" fill="#1B3A5E"/>`).join('')}
<path d="M106 52C111 50 116 50 118 52 114 54 110 55 106 55Z" fill="#1B3A5E"/>
<ellipse cx="34" cy="72" rx="10" ry="5" transform="rotate(-14 34 72)" fill="url(#pj_w)"/><ellipse cx="25" cy="74.4" rx="2" ry="4" transform="rotate(-14 25 74.4)" fill="#3F4856"/>
<path d="M54 72L80 100H90L74 66Z" fill="url(#pj_w)"/>
<path d="M20 78C40 73 70 66 100 57" stroke="#fff" stroke-width="1.4" fill="none" opacity=".9"/>`;
const private_jet = `${halo('pj', '#7DB4FF', 64, 64, 62, 0.4)}<g opacity=".95"><circle cx="22" cy="106" r="8" fill="#fff"/><circle cx="32" cy="102" r="10" fill="#fff"/><circle cx="44" cy="107" r="7" fill="#F1F5FB"/><circle cx="96" cy="112" r="7" fill="#fff"/><circle cx="106" cy="108" r="9" fill="#fff"/><circle cx="116" cy="113" r="6" fill="#E9EFF8"/></g>${jetBody}
${sparkle(110, 24, 5)}${sparkle(24, 30, 3.5, '#BFE3FF')}`;

const BODIES: Record<string, string> = {
  rose, heart, kiss, tea, pomegranate, chocolate, shekerbura, buta, teddy, bouquet, tar, perfume, champagne, ring, fireworks,
  crown, caspian, maiden_tower, flame_towers, sports_car, rocket, yacht, palace, love_planet,
  diamond_heart, diamond_ring, silk_carpet, diamond_crown, private_jet,
};

/** Tam hədiyyə ikonları (SvgXml üçün) */
export const GIFT_ART: Record<string, string> = Object.fromEntries(Object.entries(BODIES).map(([k, v]) => [k, svg(v, '-4 -4 136 136')]));

/* ───────── Animasiya hissələri ───────── */
const petal = (p: string, a: string, b: string) => svg(`<defs>${rg(`${p}_g`, [[0, a], [1, b]], 0.4, 0.3, 0.8)}</defs>
<path d="M20 2C32 8 37 22 29 34 25 38 15 38 11 34 3 22 8 8 20 2Z" fill="url(#${p}_g)"/>
<path d="M20 6C18 16 18 26 20 34" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none"/>
<path d="M12 14C11 18 11 22 12 25" stroke="#fff" stroke-opacity=".5" stroke-width="2" fill="none" stroke-linecap="round"/>`, '0 0 40 40');
const heartPart = (p: string, c: [string, string, string, string]) => svg(`<defs>${rg(`${p}_b`, [[0, c[0]], [0.35, c[1]], [0.8, c[2]], [1, c[3]]], 0.35, 0.3, 0.8)}</defs>
<path d="${HEART}" fill="url(#${p}_b)"/><path d="M26 41C26 29 36 23 46 25 38 29 32 37 32 49 29 48 26 45 26 41Z" fill="#fff" opacity=".75"/>
<ellipse cx="86" cy="31" rx="9" ry="4" transform="rotate(22 86 31)" fill="#fff" opacity=".4"/>`);
const flame = svg(`<defs>${lg('fl_o', [[0, '#FFF3B0'], [0.35, '#FFB020'], [0.75, '#FF4D1F'], [1, '#C81D25', 0.6]])}${lg('fl_i', [[0, '#FFFFFF'], [1, '#FFE27A', 0.3]])}</defs>
<path d="M20 58C6 54 2 40 8 28 12 20 16 16 14 4 24 10 30 18 32 28 36 24 36 18 34 14 40 24 40 46 30 54 27 57 24 58 20 58Z" fill="url(#fl_o)"/>
<path d="M20 56C13 53 11 45 14 39 16 35 19 33 19 26 24 32 28 38 28 44 28 50 25 55 20 56Z" fill="url(#fl_i)"/>`, '0 0 40 60');
const note = (p: string) => svg(`<defs>${lg(`${p}_g`, GOLD, 0, 0, 1, 1)}</defs>
<ellipse cx="9" cy="32" rx="7.5" ry="5.4" transform="rotate(-22 9 32)" fill="url(#${p}_g)"/><rect x="14" y="4" width="3" height="29" fill="url(#${p}_g)"/>
<path d="M17 4C22 8 30 10 28 22 26 16 22 14 17 13Z" fill="url(#${p}_g)"/><ellipse cx="7" cy="30" rx="2.2" ry="1.3" fill="#fff" opacity=".7"/>`, '0 0 32 40');
const smoke = svg(`<defs>${rg('sm_g', [[0, '#FFFFFF', 0.95], [0.6, '#E5E7EB', 0.8], [1, '#CBD5E1', 0]])}</defs>
<circle cx="50" cy="56" r="34" fill="url(#sm_g)"/><circle cx="30" cy="44" r="24" fill="url(#sm_g)"/><circle cx="70" cy="40" r="26" fill="url(#sm_g)"/>`, '0 0 100 100');
const pinkMist = svg(`<defs>${rg('pm_g', [[0, '#FFD1E8', 0.9], [0.6, '#FF9AC8', 0.5], [1, '#FF9AC8', 0]])}</defs><circle cx="50" cy="50" r="50" fill="url(#pm_g)"/>`, '0 0 100 100');
const rays = (p: string, color: string) => svg(`<defs>${rgu(`${p}_g`, [[0, color, 0.75], [0.5, color, 0.25], [1, color, 0]], 100, 100, 100)}</defs>
${Array.from({ length: 16 }, (_, i) => { const a1 = (i / 16) * Math.PI * 2, a2 = a1 + Math.PI / 26; return `<path d="M100 100L${(100 + Math.cos(a1) * 100).toFixed(1)} ${(100 + Math.sin(a1) * 100).toFixed(1)}L${(100 + Math.cos(a2) * 100).toFixed(1)} ${(100 + Math.sin(a2) * 100).toFixed(1)}Z" fill="url(#${p}_g)"/>`; }).join('')}`, '0 0 200 200');
const pomHalf = (side: 'l' | 'r') => {
  const L = side === 'l';
  const skin = L ? 'M64 30A42 42 0 0 0 64 114Z' : 'M64 30A42 42 0 0 1 64 114Z';
  const fx = L ? 66 : 62;
  const seeds: string[] = [];
  for (let row = 0; row < 7; row++) {
    const y = 46 + row * 9;
    const w = Math.sqrt(Math.max(0, 1 - ((y - 72) / 38) ** 2)) * 10;
    for (const dx of w > 6 ? [-w * 0.55, w * 0.55] : [0]) seeds.push(seed(fx + dx, y, L ? -8 : 8, `ph${side}_sd`));
  }
  return svg(`${pomDefs(`ph${side}`)}<path d="${skin}" fill="url(#ph${side}_b)"/>
<ellipse cx="${fx}" cy="72" rx="17" ry="41" fill="url(#ph${side}_p)"/><ellipse cx="${fx}" cy="72" rx="13.5" ry="36" fill="#7A0A20"/>
${seeds.join('')}
${L ? '<path d="M52 33L48 20 57 26 64 16 66 31Z" fill="url(#phl_c)"/><ellipse cx="38" cy="58" rx="8" ry="5" transform="rotate(-35 38 58)" fill="#fff" opacity=".4"/>' : '<path d="M76 33L80 20 71 26 64 16 62 31Z" fill="url(#phr_c)"/>'}`);
};
const seedPart = svg(`<defs>${rg('sd_g', [[0, '#FFA3B5'], [0.5, '#E3173F'], [1, '#860522']], 0.35, 0.3, 0.7)}</defs><ellipse cx="10" cy="12" rx="8" ry="10" fill="url(#sd_g)"/><circle cx="7" cy="8" r="2.4" fill="#fff" opacity=".85"/>`, '0 0 20 24');
const star5 = (p: string, a: string, b: string) => svg(`<defs>${rg(`${p}_g`, [[0, a], [1, b]], 0.4, 0.35, 0.7)}</defs><path d="M20 2L25 14 38 15 28 24 31 37 20 30 9 37 12 24 2 15 15 14Z" fill="url(#${p}_g)"/><path d="M20 6L23 15" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>`, '0 0 40 40');
const gull = svg('<path d="M2 14C8 6 14 6 20 12 26 6 32 6 38 14" stroke="#1F1633" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>', '0 0 40 20');
const moon = svg(`<defs>${rg('mo_g', [[0, '#FFF8D6'], [1, '#FFD27A']])}${rgu('mo_h', [[0, '#FFE8A3', 0.45], [1, '#FFE8A3', 0]], 50, 50, 50)}</defs><circle cx="50" cy="50" r="50" fill="url(#mo_h)"/><path d="M58 22A28 28 0 1 0 78 64 22 22 0 1 1 58 22Z" fill="url(#mo_g)"/>`, '0 0 100 100');
const cork = svg(`<defs>${lg('ck_g', [[0, '#E9C28A'], [1, '#9C6A2E']], 0, 0, 1, 0)}</defs><path d="M4 4H24L22 30H6Z" fill="url(#ck_g)"/><rect x="2" y="0" width="24" height="7" rx="2" fill="#D9A441"/>`, '0 0 28 32');
const lipPrint = svg(`<path d="M6 30C14 18 24 14 32 18 36 20 38 22 40 22S44 20 48 18C56 14 66 18 74 30 66 46 54 52 40 52S14 46 6 30Z" fill="#E3134F" opacity=".85"/><path d="M8 30C24 33 34 34 40 33 46 34 56 33 72 30" stroke="#8F0731" stroke-width="2" fill="none"/>`, '0 0 80 60');
const cloud = svg(`<defs>${lg('cl_g', [[0, '#FFFFFF'], [1, '#DCE6F5']])}</defs><path d="M30 70C14 70 6 60 10 50 14 40 26 38 32 42 34 28 50 20 62 26 72 14 94 18 98 34 112 32 122 44 118 56 116 66 106 70 96 70Z" fill="url(#cl_g)"/>`, '0 0 128 80');
const caspianSky = svg(`<defs>${lg('csk_g', [[0, '#1E1446'], [0.45, '#8E2F6E'], [0.75, '#FF7A45'], [1, '#FFC46B']])}</defs><rect width="100" height="100" fill="url(#csk_g)"/>`, '0 0 100 100', ' preserveAspectRatio="none"');
const nightSky = svg(`<defs>${lg('nsk_g', [[0, '#0B0820', 0.95], [0.7, '#24184F', 0.85], [1, '#4A2A6E', 0.6]])}</defs><rect width="100" height="100" fill="url(#nsk_g)"/>`, '0 0 100 100', ' preserveAspectRatio="none"');
const sun = svg(`<defs>${rg('sun_g', [[0, '#FFFBE6'], [0.35, '#FFD56A'], [0.7, '#FF9A3D', 0.6], [1, '#FF7A3D', 0]])}</defs><circle cx="50" cy="50" r="50" fill="url(#sun_g)"/>`, '0 0 100 100');
const towersSil = svg(`<defs>${lg('ts_g', [[0, '#FFB347'], [1, '#B3264F']])}</defs><path d="M10 100C8 80 12 62 22 46 26 56 30 72 30 100ZM30 100C30 70 34 46 44 26 52 44 56 64 54 100ZM54 100C54 82 58 70 64 60 68 70 70 84 70 100Z" fill="url(#ts_g)" opacity=".9"/><path d="M0 100C20 92 60 92 80 100V110H0Z" fill="#1F1633"/>`, '0 0 80 110');

export const PART = {
  petal: petal('pt', '#FF8FA6', '#C0102F'),
  petalPink: petal('pp', '#FFE3EA', '#FF6A95'),
  heart: heartPart('hp', ['#FFC2D3', '#FF4D7E', '#D3124F', '#7E0530']),
  heartGold: heartPart('hg', ['#FFF6C2', '#FFD54A', '#E39A12', '#9A5A04']),
  heartBlue: heartPart('hb', ['#E6F4FF', '#7CC4FF', '#2F6BFF', '#14318A']),
  heartPink: heartPart('hk', ['#FFE3EF', '#FF9AC8', '#E2468E', '#8E1350']),
  flame, note: note('nt'), smoke, pinkMist,
  raysGold: rays('rg1', '#FFD54A'), raysBlue: rays('rb1', '#8FD0FF'), raysPink: rays('rp1', '#FF9AC8'),
  pomL: pomHalf('l'), pomR: pomHalf('r'), seed: seedPart,
  starGold: star5('sg', '#FFF6C2', '#F2A516'), starBlue: star5('sb2', '#E6F4FF', '#4FA8FF'),
  gull, moon, cork, lipPrint, cloud, caspianSky, nightSky, sun, towersSil,
  carBody: svg(carBody, '-4 -4 136 136'),
  wheel: svg(`${wheelDefs}${wheel(16, 16)}`, '0 0 32 32'),
  rocket: svg(rocketBody, '0 0 128 128'),
  rocketFlame: svg(rocketFlameBody, '40 100 48 40'),
  yachtBoat: svg(yachtBoat, '-4 -4 136 136'),
  wave: svg(waveBody, '0 0 256 64', ' preserveAspectRatio="none"'),
  flameTowers: svg(`${flameTowersBody('fx')}<path d="M0 116C30 108 98 108 128 116V126H0Z" fill="#1B1033"/>`, '0 0 128 128'),
  maidenTower: svg(`${maidenBody('mx')}<path d="M4 116H124V126H4Z" fill="#B48A55"/>${[4, 16, 28, 92, 104, 116].map((x) => `<rect x="${x}" y="110" width="7" height="7" fill="#C9A46E"/>`).join('')}`, '0 -4 128 132'),
  palace: svg(`${palaceBody('px')}<path d="M10 116C40 110 88 110 118 116V120H10Z" fill="#34A853" opacity=".85"/>`, '0 -4 128 128'),
  planet: svg(planetBody('px2'), '0 0 128 128'),
  jet: svg(jetBody, '0 30 128 80'),
  carpet: GIFT_ART.silk_carpet,
};
export type PartName = keyof typeof PART;
