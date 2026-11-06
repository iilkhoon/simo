/**
 * SIMO DİZAYN SİSTEMİ — "Nar 2"
 *
 * Dil: yumşaq, foto-birinci sosial UI (təmiz kartlar, iri radiuslar, yumşaq kölgələr)
 * + oynaq brend təbəqəsi (düz rəng blokları, çat-qabarcığı başlıqlar, stikerlər, nar maskotu).
 * Qradiyent yoxdur. Brend rəngi — Azərbaycan narından götürülmüş "Nar" qırmızısı.
 * Yayın, zəng, video lent və canlı ekranlar "Gecə" (night) premium rejimindədir.
 *
 * Bütün ekranlar yalnız bu tokenlərdən istifadə edir. Ətraflı: /design/DESIGN_SYSTEM.md
 */
import { Platform, type ViewStyle } from 'react-native';

export const palette = {
  paper: '#F7F2EC',
  paper2: '#EFE7DE',
  card: '#FFFFFF',
  ink: '#1A1512',
  ink2: '#6B6058',
  ink3: '#A89D94',
  nar: '#F2344F',
  narDeep: '#C8203B',
  narSoft: '#FFE1E5',
  saffron: '#FFB21E',
  saffronSoft: '#FFF0CC',
  xazar: '#2F6BFF',
  xazarSoft: '#E0E9FF',
  mint: '#17B978',
  mintSoft: '#D5F5E6',
  lime: '#D9F26B',
  limeSoft: '#F1FAD0',
  lilac: '#CDB8FF',
  lilacSoft: '#EFE8FF',
  sky: '#8ED1FF',
  skySoft: '#E2F3FF',
  orange: '#FF7A3D',
  orangeSoft: '#FFE6D9',
  night: '#100E0D',
  night2: '#1D1A18',
  night3: '#2A2623',
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
  line: 'rgba(26,21,18,0.08)',
  hairline: 'rgba(26,21,18,0.08)',
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
  lilac: palette.lilacSoft,
  violet: palette.lilac,
  sky: palette.sky,
  skySoft: palette.skySoft,
  orange: palette.orange,
  orangeSoft: palette.orangeSoft,
  danger: palette.narDeep,
  white: palette.white,
  night: palette.night,
  night2: palette.night2,
  night3: palette.night3,
  nightText: '#F7F2EC',
  nightMuted: 'rgba(247,242,236,0.64)',
  nightLine: 'rgba(247,242,236,0.12)',
  glass: 'rgba(16,14,13,0.42)',
  glassLight: 'rgba(255,255,255,0.22)',
  scrim: 'rgba(16,14,13,0.55)',
};

/** VIP səviyyələri — düz rəng blokları */
export const vipColors: Record<string, { bg: string; fg: string }> = {
  SILVER: { bg: '#DCE1E8', fg: palette.ink },
  GOLD: { bg: palette.saffron, fg: palette.ink },
  DIAMOND: { bg: palette.xazar, fg: palette.white },
};
export const vipColor = (tier?: string | null) => vipColors[tier ?? ''] ?? { bg: palette.paper2, fg: palette.ink };

export const radius = { xs: 10, sm: 14, md: 20, lg: 26, xl: 34, pill: 999 };
export const space = (n: number) => n * 4;
/** Kontur qalınlığı (yalnız stiker elementlərində) */
export const stroke = 1;
/** Kölgə dərinliyi (1–3) */
export const shadow = { sm: 1, md: 2, lg: 3 };

/** Yumşaq kölgə — iOS/Android/Web eyni */
export function elev(level = 2, color = '#3B2418'): ViewStyle {
  if (level <= 0) return {};
  const y = [0, 3, 8, 14][Math.min(level, 3)];
  const r = [0, 8, 18, 28][Math.min(level, 3)];
  const o = [0, 0.06, 0.08, 0.12][Math.min(level, 3)];
  return Platform.select<ViewStyle>({
    android: { elevation: [0, 2, 5, 10][Math.min(level, 3)], shadowColor: color },
    default: { shadowColor: color, shadowOpacity: o, shadowRadius: r, shadowOffset: { width: 0, height: y } },
  })!;
}
/** Rəngli "parıltı" kölgə — əsas düymələr üçün */
export const glow = (color: string): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation: 6, shadowColor: color },
    default: { shadowColor: color, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  })!;

export const fonts = {
  display: 'Geologica_800ExtraBold',
  displayBlack: 'Geologica_900Black',
  displayBold: 'Geologica_700Bold',
  displayMedium: 'Geologica_600SemiBold',
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  black: 'Onest_800ExtraBold',
};

/** Android şriftə əlavə yuxarı/aşağı boşluq qoyur — mətn həb və düymələrdə şaquli mərkəzdən sürüşür. Söndürürük. */
export const noPad = Platform.OS === 'android' ? ({ includeFontPadding: false, textAlignVertical: 'center' } as const) : ({} as const);

/** Vebdə brauzerin fokus konturunu söndürür (fokus nar kontur ilə göstərilir) */
export const webNoOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object;

/** Tipoqrafiya şkalası */
export const type = {
  hero: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 40, lineHeight: 42, letterSpacing: -1.6 },
  h1: { ...noPad, fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -1 },
  h2: { ...noPad, fontFamily: fonts.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.6 },
  h3: { ...noPad, fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  title: { ...noPad, fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },
  body: { ...noPad, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { ...noPad, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  small: { ...noPad, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  tiny: { ...noPad, fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
  label: { ...noPad, fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' as const },
  num: { ...noPad, fontFamily: fonts.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
};
export type TypeName = keyof typeof type;

/** Avatar və blok fonu üçün sabit, ad əsasında rəng */
const AV = [palette.narSoft, palette.saffronSoft, palette.xazarSoft, palette.mintSoft, palette.lilacSoft, palette.limeSoft, palette.skySoft, palette.orangeSoft];
export const tintFor = (seed = '') => AV[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];

/** Brend blokları (çat-qabarcığı başlıqlar, promo kartlar) — düz, parlaq */
export const blocks = {
  nar: { bg: palette.nar, fg: palette.white },
  saffron: { bg: palette.saffron, fg: palette.ink },
  lime: { bg: palette.lime, fg: palette.ink },
  lilac: { bg: palette.lilac, fg: palette.ink },
  sky: { bg: palette.sky, fg: palette.ink },
  orange: { bg: palette.orange, fg: palette.white },
  ink: { bg: palette.ink, fg: palette.paper },
  xazar: { bg: palette.xazar, fg: palette.white },
};
export type BlockName = keyof typeof blocks;

/** Mətn üslubları (rəng daxil) — `style={font.h3}` kimi istifadə üçün */
export const font = {
  h1: { ...type.h1, color: colors.ink },
  h2: { ...type.h2, color: colors.ink },
  h3: { ...type.h3, color: colors.ink },
  body: { ...type.body, color: colors.ink },
  small: { ...type.small, color: colors.textMuted },
  tiny: { ...type.tiny, color: colors.textMuted },
};

/* ───────────── Nar 3: premium qat (qradiyentlər, hərəkət, boşluq) ─────────────
 * Qradiyentlər yalnız "dəyər" səthlərində: əsas düymə, premium kartlar (VIP, Zadəganlıq, balans),
 * illüstrasiyalar və bayram anları (uyğunluq). Adi kartlar düz ağ qalır. */
export const gradients = {
  /** Əsas brend: nar qırmızısı → dərin nar (isti CTA) */
  nar: ['#FF5A73', '#F2344F', '#DA1F48'] as const,
  narSoft: ['#FFF0F2', '#FFDCE2'] as const,
  /** Gecə premium kartı */
  night: ['#2E2622', '#15110F'] as const,
  /** VIP / Qızıl */
  gold: ['#FFD978', '#FFB21E', '#F39200'] as const,
  /** Almaz / Xəzər */
  diamond: ['#78A3FF', '#2F6BFF', '#1B4ED4'] as const,
  /** Səsli tanışlıq — yasəmən */
  lilac: ['#EDE4FF', '#CDB8FF'] as const,
  lime: ['#F2FBC4', '#D9F26B'] as const,
  /** Bənövşəyi "Xan" */
  violet: ['#9478FF', '#6D4AFF', '#4A2ECF'] as const,
  bronze: ['#DDA067', '#B8733A', '#8A5223'] as const,
  /** Uyğunluq / bayram fonu */
  celebrate: ['#FF6A86', '#F2344F', '#7B1FA2'] as const,
  /** Foto üzərində aşağı qaraltma */
  scrim: ['rgba(16,14,13,0)', 'rgba(16,14,13,0.82)'] as const,
};
export type GradientName = keyof typeof gradients;

/** Boşluq tokenləri (4 px şəbəkə) */
export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;

/** Hərəkət tokenləri — reanimated üçün */
export const motion = {
  /** Toxunuş: sürətli, az sıçrayışlı */
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  /** Elementin görünməsi */
  enter: { damping: 18, stiffness: 180, mass: 0.9 },
  /** Bayram: daha çox sıçrayış */
  bouncy: { damping: 9, stiffness: 180, mass: 0.8 },
  stagger: 45,
  fast: 160,
  base: 260,
  slow: 420,
};
