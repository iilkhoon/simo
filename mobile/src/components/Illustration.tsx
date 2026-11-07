/**
 * Simo spot illüstrasiyaları — əl ilə çəkilmiş qradiyentli SVG-lər (boş vəziyyətlər, promo blokları).
 *
 * Vahid dil: yumşaq dairəvi fon (radial qradiyent) + əsas obyekt (iki tonlu qradiyent, yuxarı-sol parıltı)
 * + yerdə yumşaq kölgə + 2–4 dekorativ "parıltı" (4 guşəli ulduz) və kiçik dairələr.
 * Bütün rənglər `palette`-dən gəlir. Ölçü — `size` (kvadrat), viewBox 160×160.
 */
import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { palette } from '../theme';
import { Float } from './motion';

export type IllustrationName =
  | 'heart' | 'chat' | 'bell' | 'eye' | 'bookmark' | 'shield' | 'search' | 'trophy' | 'ticket'
  | 'mic' | 'video' | 'pin' | 'call' | 'people' | 'camera' | 'gift' | 'spark' | 'crown';

type Tone = { bg: [string, string]; a: [string, string]; b: [string, string] };
const T = {
  nar: { bg: ['#FFE3E8', '#FFF6F7'], a: ['#FF6B83', '#E3214A'], b: ['#FFD07A', '#FFB21E'] },
  gold: { bg: ['#FFF0CC', '#FFFAEE'], a: ['#FFD978', '#F39200'], b: ['#FF6B83', '#E3214A'] },
  blue: { bg: ['#E0E9FF', '#F5F8FF'], a: ['#7EA6FF', '#2F6BFF'], b: ['#FF6B83', '#E3214A'] },
  lilac: { bg: ['#EFE8FF', '#FAF7FF'], a: ['#B49BFF', '#6D4AFF'], b: ['#FF6B83', '#E3214A'] },
  mint: { bg: ['#D5F5E6', '#F3FCF8'], a: ['#4FD9A0', '#11A066'], b: ['#FFD07A', '#FFB21E'] },
} satisfies Record<string, Tone>;

const TONE: Record<IllustrationName, Tone> = {
  heart: T.nar, chat: T.lilac, bell: T.gold, eye: T.blue, bookmark: T.nar, shield: T.mint, search: T.blue, trophy: T.gold,
  ticket: T.gold, mic: T.lilac, video: T.nar, pin: T.nar, call: T.mint, people: T.lilac, camera: T.nar, gift: T.nar, spark: T.gold, crown: T.gold,
};

/** 4 guşəli parıltı */
function Sparkle({ x, y, s = 8, c = palette.saffron }: { x: number; y: number; s?: number; c?: string }) {
  const d = `M${x} ${y - s} C${x + s * 0.18} ${y - s * 0.18} ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} C${x + s * 0.18} ${y + s * 0.18} ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} C${x - s * 0.18} ${y + s * 0.18} ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} C${x - s * 0.18} ${y - s * 0.18} ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`;
  return <Path d={d} fill={c} />;
}

const HEART = (cx: number, cy: number, s: number) => {
  // ürək: mərkəz (cx, cy), en ≈ 2s
  const p = (x: number, y: number) => `${(cx + x * s).toFixed(2)} ${(cy + y * s).toFixed(2)}`;
  return `M${p(0, 0.95)} C${p(-0.55, 0.6)} ${p(-1, 0.25)} ${p(-1, -0.2)} C${p(-1, -0.6)} ${p(-0.7, -0.85)} ${p(-0.4, -0.85)} C${p(-0.2, -0.85)} ${p(-0.06, -0.75)} ${p(0, -0.6)} C${p(0.06, -0.75)} ${p(0.2, -0.85)} ${p(0.4, -0.85)} C${p(0.7, -0.85)} ${p(1, -0.6)} ${p(1, -0.2)} C${p(1, 0.25)} ${p(0.55, 0.6)} ${p(0, 0.95)}Z`;
};

function Art({ name, id }: { name: IllustrationName; id: string }) {
  const A = `url(#${id}a)`;
  const B = `url(#${id}b)`;
  const W = 'rgba(255,255,255,0.55)';
  switch (name) {
    case 'heart':
      return (
        <G>
          <Path d={HEART(112, 50, 16)} fill={B} transform="rotate(14 112 50)" />
          <Path d={HEART(78, 86, 44)} fill={A} transform="rotate(-8 78 86)" />
          <Path d="M52 68 C54 58 62 52 70 52" stroke={W} strokeWidth={7} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'chat':
      return (
        <G>
          <Path d="M92 34 h34 a20 20 0 0 1 20 20 v14 a20 20 0 0 1 -20 20 h-4 l2 12 l-16 -12 h-16 a20 20 0 0 1 -20 -20 v-14 a20 20 0 0 1 20 -20Z" fill={B} />
          <Path d="M36 58 h52 a22 22 0 0 1 22 22 v18 a22 22 0 0 1 -22 22 h-30 l-20 16 l4 -16 a22 22 0 0 1 -28 -22 v-18 a22 22 0 0 1 22 -22Z" fill={A} />
          <Circle cx={50} cy={89} r={6} fill="#fff" />
          <Circle cx={68} cy={89} r={6} fill="#fff" opacity={0.85} />
          <Circle cx={86} cy={89} r={6} fill="#fff" opacity={0.7} />
          <Path d="M30 76 C31 69 36 65 42 64" stroke={W} strokeWidth={5} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'bell':
      return (
        <G>
          <Circle cx={80} cy={119} r={11} fill={B} />
          <Path d="M80 30 c-26 0 -40 20 -40 44 v22 l-12 16 h104 l-12 -16 v-22 c0 -24 -14 -44 -40 -44Z" fill={A} />
          <Rect x={74} y={22} width={12} height={12} rx={6} fill={A} />
          <Path d="M52 70 C52 56 60 46 70 43" stroke={W} strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d="M124 40 a26 26 0 0 1 10 22 M134 30 a40 40 0 0 1 14 34" stroke={palette.saffron} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.7} />
        </G>
      );
    case 'eye':
      return (
        <G>
          <Path d="M18 82 C38 48 62 36 80 36 C98 36 122 48 142 82 C122 116 98 128 80 128 C62 128 38 116 18 82Z" fill="#fff" />
          <Circle cx={80} cy={82} r={30} fill={A} />
          <Circle cx={80} cy={82} r={13} fill={palette.ink} />
          <Circle cx={70} cy={72} r={7} fill="#fff" />
          <Path d={HEART(124, 38, 11)} fill={B} transform="rotate(12 124 38)" />
        </G>
      );
    case 'bookmark':
      return (
        <G>
          <Rect x={34} y={34} width={72} height={92} rx={18} fill="#fff" transform="rotate(-8 70 80)" />
          <Rect x={46} y={46} width={48} height={38} rx={10} fill={B} transform="rotate(-8 70 80)" opacity={0.9} />
          <Path d="M88 40 h40 a8 8 0 0 1 8 8 v80 l-28 -18 l-28 18 v-80 a8 8 0 0 1 8 -8Z" fill={A} />
          <Path d="M96 54 v26" stroke={W} strokeWidth={6} strokeLinecap="round" />
        </G>
      );
    case 'shield':
      return (
        <G>
          <Path d="M80 26 l46 16 v32 c0 30 -20 52 -46 62 c-26 -10 -46 -32 -46 -62 v-32Z" fill={A} />
          <Path d="M80 40 l32 11 v24 c0 22 -14 38 -32 46Z" fill="rgba(255,255,255,0.18)" />
          <Path d="M62 80 l12 12 l24 -26" stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
      );
    case 'search':
      return (
        <G>
          <Rect x={22} y={44} width={50} height={64} rx={14} fill="#fff" transform="rotate(-10 47 76)" />
          <Circle cx={45} cy={66} r={10} fill={B} transform="rotate(-10 47 76)" />
          <Rect x={33} y={84} width={26} height={6} rx={3} fill="#E9E1D8" transform="rotate(-10 47 76)" />
          <Rect x={110} y={102} width={16} height={40} rx={8} fill={palette.ink} transform="rotate(-42 118 122)" />
          <Circle cx={92} cy={74} r={36} fill={A} />
          <Circle cx={92} cy={74} r={25} fill="rgba(255,255,255,0.9)" />
          <Path d="M78 64 C80 58 85 54 91 53" stroke={A} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.6} />
        </G>
      );
    case 'trophy':
      return (
        <G>
          <Rect x={52} y={118} width={56} height={16} rx={6} fill={palette.ink} />
          <Rect x={72} y={96} width={16} height={26} fill={A} />
          <Path d="M46 38 h68 v24 c0 22 -16 40 -34 40 c-18 0 -34 -18 -34 -40Z" fill={A} />
          <Path d="M46 46 h-12 c0 18 8 28 18 30 M114 46 h12 c0 18 -8 28 -18 30" stroke={A} strokeWidth={8} fill="none" strokeLinecap="round" />
          <Path d="M80 50 l5 10 l11 2 l-8 8 l2 11 l-10 -5 l-10 5 l2 -11 l-8 -8 l11 -2Z" fill="#fff" />
          <Path d="M56 46 v14 c0 8 3 14 7 18" stroke={W} strokeWidth={5} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'ticket':
      return (
        <G>
          <Path d="M30 52 h100 a8 8 0 0 1 8 8 v10 a12 12 0 0 0 0 24 v10 a8 8 0 0 1 -8 8 h-100 a8 8 0 0 1 -8 -8 v-10 a12 12 0 0 0 0 -24 v-10 a8 8 0 0 1 8 -8Z" fill={A} transform="rotate(-8 80 82)" />
          <Path d="M100 56 v52" stroke="rgba(255,255,255,0.7)" strokeWidth={3} strokeDasharray="5 6" transform="rotate(-8 80 82)" />
          <Path d={HEART(62, 80, 14)} fill="#fff" transform="rotate(-8 80 82)" />
          <Circle cx={118} cy={80} r={8} fill={B} transform="rotate(-8 80 82)" />
        </G>
      );
    case 'mic':
      return (
        <G>
          <Path d="M50 76 a30 30 0 0 0 60 0" stroke={palette.ink} strokeWidth={8} fill="none" strokeLinecap="round" />
          <Rect x={76} y={104} width={8} height={18} fill={palette.ink} />
          <Rect x={60} y={120} width={40} height={8} rx={4} fill={palette.ink} />
          <Rect x={60} y={26} width={40} height={72} rx={20} fill={A} />
          <Path d="M70 40 v22" stroke={W} strokeWidth={6} strokeLinecap="round" />
          <Path d="M124 54 a24 24 0 0 1 0 34 M134 44 a38 38 0 0 1 0 54" stroke={B} strokeWidth={5} strokeLinecap="round" fill="none" />
          <Path d="M36 54 a24 24 0 0 0 0 34 M26 44 a38 38 0 0 0 0 54" stroke={B} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.6} />
        </G>
      );
    case 'video':
      return (
        <G>
          <Rect x={46} y={22} width={68} height={116} rx={18} fill={palette.ink} />
          <Rect x={52} y={30} width={56} height={100} rx={13} fill={A} />
          <Path d="M72 64 v32 l28 -16Z" fill="#fff" strokeLinejoin="round" stroke="#fff" strokeWidth={4} />
          <Path d={HEART(126, 52, 13)} fill={B} transform="rotate(12 126 52)" />
          <Path d={HEART(130, 86, 8)} fill={B} opacity={0.7} />
        </G>
      );
    case 'pin':
      return (
        <G>
          <Ellipse cx={80} cy={122} rx={44} ry={12} fill="none" stroke={A} strokeWidth={3} opacity={0.35} />
          <Ellipse cx={80} cy={122} rx={24} ry={6} fill={A} opacity={0.25} />
          <Path d="M80 122 c-4 -10 -38 -36 -38 -64 a38 38 0 0 1 76 0 c0 28 -34 54 -38 64Z" fill={A} />
          <Circle cx={80} cy={58} r={15} fill="#fff" />
          <Path d="M56 50 C58 40 64 33 72 30" stroke={W} strokeWidth={6} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'call':
      return (
        <G>
          <Circle cx={80} cy={80} r={46} fill={A} />
          <Path d="M64 58 c4 -4 9 -3 11 1 l5 10 c2 4 0 7 -3 9 l-3 2 c3 7 9 13 16 16 l2 -3 c2 -3 5 -5 9 -3 l10 5 c4 2 5 7 1 11 l-6 6 c-5 5 -14 4 -26 -4 c-10 -7 -18 -15 -24 -24 c-8 -12 -8 -21 -3 -26Z" fill="#fff" />
          <Path d="M118 34 a30 30 0 0 1 10 14" stroke={B} strokeWidth={5} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'people':
      return (
        <G>
          <Circle cx={104} cy={62} r={20} fill={B} />
          <Path d="M72 122 c0 -22 14 -36 32 -36 s32 14 32 36Z" fill={B} />
          <Circle cx={64} cy={58} r={24} fill={A} />
          <Path d="M24 126 c0 -26 18 -42 40 -42 s40 16 40 42Z" fill={A} />
          <Path d="M50 48 C52 42 56 38 62 37" stroke={W} strokeWidth={5} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'camera':
      return (
        <G>
          <Rect x={58} y={36} width={36} height={18} rx={8} fill={palette.ink} />
          <Rect x={28} y={46} width={104} height={76} rx={22} fill={A} />
          <Circle cx={80} cy={84} r={26} fill="#fff" />
          <Circle cx={80} cy={84} r={17} fill={palette.ink} />
          <Circle cx={74} cy={78} r={5} fill="#fff" opacity={0.8} />
          <Circle cx={116} cy={62} r={5} fill={B} />
        </G>
      );
    case 'gift':
      return (
        <G>
          <Rect x={36} y={68} width={88} height={60} rx={12} fill={A} />
          <Rect x={30} y={52} width={100} height={24} rx={10} fill={A} />
          <Rect x={72} y={52} width={16} height={76} fill={B} />
          <Path d="M80 52 c-10 -22 -34 -22 -30 -6 c2 8 16 8 30 6Z M80 52 c10 -22 34 -22 30 -6 c-2 8 -16 8 -30 6Z" fill={B} />
          <Path d="M44 86 v26" stroke={W} strokeWidth={6} strokeLinecap="round" />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Path d="M26 62 l30 26 l24 -46 l24 46 l30 -26 l-10 62 a8 8 0 0 1 -8 7 h-72 a8 8 0 0 1 -8 -7Z" fill={A} strokeLinejoin="round" stroke={A} strokeWidth={6} />
          <Circle cx={26} cy={58} r={9} fill={A} />
          <Circle cx={80} cy={36} r={10} fill={A} />
          <Circle cx={134} cy={58} r={9} fill={A} />
          <Rect x={40} y={112} width={80} height={10} rx={5} fill="rgba(255,255,255,0.35)" />
          <Path d={HEART(80, 94, 11)} fill={B} />
          <Circle cx={52} cy={100} r={5} fill="#fff" opacity={0.9} />
          <Circle cx={108} cy={100} r={5} fill="#fff" opacity={0.9} />
          <Path d="M44 78 l10 8" stroke="rgba(255,255,255,0.6)" strokeWidth={5} strokeLinecap="round" />
        </G>
      );
    case 'spark':
    default:
      return (
        <G>
          <Sparkle x={80} y={80} s={46} c={A} />
          <Sparkle x={120} y={44} s={14} c={B} />
        </G>
      );
  }
}

/** `bare` — fon dairəsi və kölgəsiz (qradiyentli kartların üstündə) */
export function Illustration({ name, size = 160, float = true, bare }: { name: IllustrationName; size?: number; float?: boolean; bare?: boolean }) {
  const t = TONE[name] ?? T.nar;
  const id = `il-${name}-${bare ? 'x' : ''}`;
  if (bare) {
    const svg = (
      <Svg width={size} height={size} viewBox="0 0 160 160">
        <Defs>
          <LinearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={t.a[0]} /><Stop offset="1" stopColor={t.a[1]} /></LinearGradient>
          <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={t.b[0]} /><Stop offset="1" stopColor={t.b[1]} /></LinearGradient>
        </Defs>
        <Art name={name} id={id} />
      </Svg>
    );
    return float ? <Float amp={4}>{svg}</Float> : svg;
  }
  const svg = (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        <RadialGradient id={`${id}bg`} cx="50%" cy="45%" r="50%">
          <Stop offset="0" stopColor={t.bg[1]} />
          <Stop offset="1" stopColor={t.bg[0]} />
        </RadialGradient>
        <LinearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={t.a[0]} />
          <Stop offset="1" stopColor={t.a[1]} />
        </LinearGradient>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={t.b[0]} />
          <Stop offset="1" stopColor={t.b[1]} />
        </LinearGradient>
      </Defs>
      <Circle cx={80} cy={80} r={72} fill={`url(#${id}bg)`} />
      <Ellipse cx={80} cy={142} rx={40} ry={5} fill="rgba(26,21,18,0.07)" />
      <Art name={name} id={id} />
      <Sparkle x={24} y={40} s={7} c={t.a[1]} />
      <Sparkle x={140} y={118} s={6} c={palette.saffron} />
      <Circle cx={138} cy={26} r={3.5} fill={t.a[0]} opacity={0.6} />
      <Circle cx={20} cy={112} r={3} fill={palette.saffron} opacity={0.7} />
    </Svg>
  );
  return float ? <Float amp={5}>{svg}</Float> : svg;
}
