/**
 * SIMO DİZAYN SİSTEMİ — "Nar"
 *
 * Dil: yumşaq neobrutalizm. Kağız (isti krem) fon, mürəkkəb-qara 2px konturlar,
 * sərt (bulanıqsız) kölgələr, düz rəng blokları, iri qrotesk başlıqlar.
 * Qradiyent yoxdur. Brend rəngi — Azərbaycan narından götürülmüş "Nar" qırmızısı.
 * Video/yayın/zəng kimi immersiv ekranlar "Gecə" (night) rejimindədir: tünd fon, eyni stiker dili.
 *
 * Bütün ekranlar yalnız bu tokenlərdən istifadə edir. Ətraflı: /design/DESIGN_SYSTEM.md
 */

export const palette = {
  paper: '#F6F0E8',
  paper2: '#ECE3D7',
  card: '#FFFDF9',
  ink: '#17120F',
  ink2: '#5C524A',
  ink3: '#9B9087',
  nar: '#F2344F',
  narDeep: '#C21D38',
  narSoft: '#FFD9DE',
  saffron: '#FFB21E',
  saffronSoft: '#FFEDC4',
  xazar: '#2F6BFF',
  xazarSoft: '#DCE6FF',
  mint: '#14B577',
  mintSoft: '#CDF2E0',
  lime: '#DDF46B',
  lilac: '#E9DDFB',
  night: '#0F0D0C',
  night2: '#1C1917',
  white: '#FFFFFF',
} as const;

export const colors = {
  bg: palette.paper,
  bgSunken: palette.paper2,
  card: palette.card,
  ink: palette.ink,
  text: palette.ink,
  textMuted: palette.ink2,
  textDim: palette.ink3,
  line: palette.ink,
  hairline: 'rgba(23,18,15,0.12)',
  brand: palette.nar,
  brandDeep: palette.narDeep,
  brandSoft: palette.narSoft,
  coin: palette.saffron,
  coinSoft: palette.saffronSoft,
  diamond: palette.xazar,
  diamondSoft: palette.xazarSoft,
  online: palette.mint,
  onlineSoft: palette.mintSoft,
  highlight: palette.lime,
  lilac: palette.lilac,
  danger: palette.narDeep,
  white: palette.white,
  night: palette.night,
  night2: palette.night2,
  nightText: '#F6F0E8',
  nightMuted: 'rgba(246,240,232,0.68)',
  scrim: 'rgba(15,13,12,0.55)',
};

/** VIP səviyyələri — düz rəng blokları */
export const vipColors: Record<string, { bg: string; fg: string }> = {
  SILVER: { bg: '#D7DCE3', fg: palette.ink },
  GOLD: { bg: palette.saffron, fg: palette.ink },
  DIAMOND: { bg: palette.xazar, fg: palette.white },
};
export const vipColor = (tier?: string | null) => vipColors[tier ?? ''] ?? { bg: palette.paper2, fg: palette.ink };

export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 };
export const space = (n: number) => n * 4;
export const stroke = 2;
export const shadow = { sm: 2, md: 4, lg: 6 };

export const fonts = {
  display: 'Unbounded_800ExtraBold',
  displayBold: 'Unbounded_700Bold',
  displayMedium: 'Unbounded_600SemiBold',
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  black: 'Onest_800ExtraBold',
};

/** Tipoqrafiya şkalası */
export const type = {
  hero: { fontFamily: fonts.display, fontSize: 38, lineHeight: 42, letterSpacing: -1.2 },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.8 },
  h2: { fontFamily: fonts.displayBold, fontSize: 21, lineHeight: 26, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.displayMedium, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  title: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: 'uppercase' as const },
  num: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
};
export type TypeName = keyof typeof type;

/** Avatar fonu üçün sabit, ad əsasında rəng */
const AV = [palette.narSoft, palette.saffronSoft, palette.xazarSoft, palette.mintSoft, palette.lilac, palette.lime];
export const tintFor = (seed = '') => AV[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];

/** Mətn üslubları (rəng daxil) — `style={font.h3}` kimi istifadə üçün */
export const font = {
  h1: { ...type.h1, color: colors.ink },
  h2: { ...type.h2, color: colors.ink },
  h3: { ...type.h3, color: colors.ink },
  body: { ...type.body, color: colors.ink },
  small: { ...type.small, color: colors.textMuted },
  tiny: { ...type.tiny, color: colors.textMuted },
};
