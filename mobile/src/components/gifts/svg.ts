/**
 * SVG köməkçiləri — hədiyyə rəsmləri və effekt hissələri üçün.
 * Hər rəsm öz prefiksli id-ləri ilə yazılır (vebdə eyni səhifədə bir neçə SVG olanda id toqquşmasın).
 */
export type Stop = [offset: number, color: string, opacity?: number];

const stops = (s: Stop[]) => s.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');

/** Xətti qradiyent (objectBoundingBox koordinatlarında) */
export const lg = (id: string, s: Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;

/** Radial qradiyent; fx/fy — işıq nöqtəsi */
export const rg = (id: string, s: Stop[], cx = 0.5, cy = 0.5, r = 0.5, fx = cx, fy = cy) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stops(s)}</radialGradient>`;

/** İstifadəçi koordinatlarında radial qradiyent (bir neçə formaya eyni işıq) */
export const rgu = (id: string, s: Stop[], cx: number, cy: number, r: number) =>
  `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(s)}</radialGradient>`;

export const svg = (body: string, vb = '0 0 128 128', extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${body.replace(/\n\s*/g, '')}</svg>`;

/** Yerə düşən yumşaq kölgə */
export const shadow = (p: string, cx = 64, cy = 118, rx = 36, ry = 6, op = 0.32) =>
  `<defs>${rg(`${p}_shd`, [[0, '#000', op], [1, '#000', 0]])}</defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${p}_shd)"/>`;

/** Arxa parıltı halosu */
export const halo = (p: string, color: string, cx = 64, cy = 60, r = 60, op = 0.45) =>
  `<defs>${rg(`${p}_hal`, [[0, color, op], [0.6, color, op * 0.35], [1, color, 0]])}</defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${p}_hal)"/>`;

/** 4 guşəli parıltı ulduzu */
export const sparkle = (x: number, y: number, s: number, color = '#FFFFFF', op = 1) =>
  `<path d="M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z" fill="${color}" opacity="${op}"/>`;

/** Kiçik ürək (mərkəz x,y; s ≈ ölçü/16) */
export const miniHeart = (x: number, y: number, s: number, fill: string, op = 1) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-6 2-8-2-6-5-4-8-1-7 0-4 1-7 4-8 6-5 8-2 6 2 0 6Z" fill="${fill}" opacity="${op}"/>`;

/** Ürək forması (0..128 kətan) */
export const HEART = 'M64 112C60 109 14 82 14 46 14 28 28 16 43 16 53 16 60 21 64 30 68 21 75 16 85 16 100 16 114 28 114 46 114 82 68 109 64 112Z';

/** Təkrarlanan təsadüfi ədədlər (eyni rəsm hər dəfə eyni görünsün) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GOLD: Stop[] = [[0, '#FFF6C2'], [0.35, '#FFD54A'], [0.7, '#E39A12'], [1, '#9A5A04']];
export const SILVER: Stop[] = [[0, '#FFFFFF'], [0.4, '#DCE3EC'], [0.75, '#9AA7B8'], [1, '#5E6A7C']];
