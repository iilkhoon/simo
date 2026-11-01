/**
 * Simo rəng sistemi — "Gecə Bakısı romantikası":
 * dərin gavalı-gecə fonu, qızılgül-çəhrayı → orxideya → bənövşəyi qradiyent,
 * coin üçün qızılı, almaz üçün buz-mavi.
 */
export const colors = {
  bg: '#12071F',
  bgElevated: '#1A0C2C',
  surface: '#221238',
  surface2: '#2D1A47',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#FFFFFF',
  textMuted: '#B9A8D6',
  textDim: '#7E6C9C',
  rose: '#FF4D8D',
  orchid: '#C850C0',
  violet: '#7B5CFF',
  peach: '#FFB199',
  gold: '#FFC857',
  goldDeep: '#F2A100',
  diamond: '#6FE3FF',
  online: '#3DDC97',
  danger: '#FF5A5F',
  success: '#3DDC97',
  overlay: 'rgba(10,4,20,0.72)',
};

export const gradients = {
  primary: ['#FF5E8E', '#C850C0', '#7B5CFF'] as const,
  warm: ['#FFB199', '#FF4D8D'] as const,
  gold: ['#FFE58F', '#F2A100'] as const,
  diamond: ['#B8F3FF', '#7B5CFF'] as const,
  night: ['#2B1055', '#12071F'] as const,
  card: ['transparent', 'rgba(18,7,31,0.55)', 'rgba(18,7,31,0.95)'] as const,
  vipSilver: ['#E6E9F0', '#9AA3B5'] as const,
  vipGold: ['#FFE58F', '#E0A100'] as const,
  vipDiamond: ['#B8F3FF', '#C850C0'] as const,
};

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 };
export const space = (n: number) => n * 4;

export const font = {
  h1: { fontSize: 30, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '800' as const, color: colors.text },
  h3: { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.textMuted },
  tiny: { fontSize: 11, color: colors.textMuted },
};

export const vipGradient = (tier: string) =>
  tier === 'DIAMOND' ? gradients.vipDiamond : tier === 'GOLD' ? gradients.vipGold : gradients.vipSilver;
