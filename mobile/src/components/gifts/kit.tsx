/**
 * Effekt dəsti: hər animasiya bir "saat" (0→1) ilə idarə olunur, qatlar (Layer) açar kadrlarla
 * (keyframes) və sinus rəqsləri (osc) ilə hərəkət edir. Hamısı react-native-reanimated ilə UI axınında işləyir.
 */
import React, { createContext, memo, useContext, useEffect, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, Extrapolation, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

export type Prop = 'x' | 'y' | 's' | 'sx' | 'sy' | 'r' | 'o' | 'skx';
export type KF = [number, number][];
export interface Osc { p: Prop; a: number; f: number; ph?: number }
export interface Spec {
  x: number; y: number; w: number; h: number;
  k?: Partial<Record<Prop, KF>>;
  osc?: Osc[];
  z?: number;
}

const Clock = createContext<SharedValue<number> | null>(null);

/** Effekt saatı: mount olanda 0→1 xətti işləyir */
export function useFxClock(ms: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: ms, easing: Easing.linear });
    return () => cancelAnimation(t);
  }, [ms, t]);
  return t;
}

export function ClockProvider({ t, children }: { t: SharedValue<number>; children: React.ReactNode }) {
  return <Clock.Provider value={t}>{children}</Clock.Provider>;
}

/** Açar kadrlar: zamanları sıralayır, təkrarlananları azca sürüşdürür (interpolate ciddi artan giriş istəyir) */
export function kf(...pairs: [number, number][]): KF {
  const out: KF = [];
  for (const [tt, v] of pairs) {
    let t = Math.min(1, Math.max(0, tt));
    const prev = out[out.length - 1];
    if (prev && t <= prev[0]) t = prev[0] + 0.0005;
    out.push([t, v]);
  }
  if (out.length === 1) out.push([Math.min(1, out[0][0] + 0.001), out[0][1]]);
  return out;
}

/** Görünmə: t0-da açılır, t1-də sönür */
export const showFrom = (t0: number, t1 = 1, fin = 0.04, fout = 0.08): KF =>
  kf([0, 0], [t0, 0], [t0 + fin, 1], [Math.max(t0 + fin, t1 - fout), 1], [t1, 0]);

type Comp = { ins: number[]; outs: number[] };
const PROPS: Prop[] = ['x', 'y', 's', 'sx', 'sy', 'r', 'o', 'skx'];

function ev(tv: number, c: Comp, d: number, osc: Osc[], p: Prop) {
  'worklet';
  let v = c.ins.length > 1 ? interpolate(tv, c.ins, c.outs, Extrapolation.CLAMP) : d;
  for (let i = 0; i < osc.length; i++) {
    const o = osc[i];
    if (o.p === p) v += o.a * Math.sin((tv * o.f + (o.ph ?? 0)) * 2 * Math.PI);
  }
  return v;
}

const NO_OSC: Osc[] = [];

/** Animasiya qatı: (x, y) — mərkəz nöqtəsi, w×h — ölçü */
export const Layer = memo(function Layer({ x, y, w, h, k, osc, z, children, style }: Spec & { children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useContext(Clock)!;
  const c = useMemo(() => {
    const out = {} as Record<Prop, Comp>;
    for (const p of PROPS) {
      const f = k?.[p];
      out[p] = f ? { ins: f.map((q) => q[0]), outs: f.map((q) => q[1]) } : { ins: [], outs: [] };
    }
    return out;
  }, [k]);
  const os = osc ?? NO_OSC;
  const st = useAnimatedStyle(() => {
    const tv = t.value;
    return {
      opacity: Math.max(0, Math.min(1, ev(tv, c.o, 1, os, 'o'))),
      transform: [
        { translateX: ev(tv, c.x, 0, os, 'x') },
        { translateY: ev(tv, c.y, 0, os, 'y') },
        { rotate: `${ev(tv, c.r, 0, os, 'r')}deg` },
        { scale: ev(tv, c.s, 1, os, 's') },
        { scaleX: ev(tv, c.sx, 1, os, 'sx') },
        { scaleY: ev(tv, c.sy, 1, os, 'sy') },
        { skewX: `${ev(tv, c.skx, 0, os, 'skx')}deg` },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, zIndex: z }, style, st]}>
      {children}
    </Animated.View>
  );
});

export const Sprite = memo(function Sprite({ xml, w, h }: { xml: string; w: number; h?: number }) {
  return <SvgXml xml={xml} width={w} height={h ?? w} />;
});

/** Dairəvi işıq nöqtəsi (qığılcım, köpük, toz) */
export const Dot = memo(function Dot({ size, color, glow, ring }: { size: number; color: string; glow?: boolean; ring?: boolean }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: ring ? 'transparent' : color,
        borderWidth: ring ? Math.max(1.5, size * 0.08) : 0, borderColor: color,
        ...(glow ? { boxShadow: `0 0 ${Math.round(size * 0.9)}px ${color}` } : null),
      }}
    />
  );
});

/** Konfetti zolağı */
export const Chip = memo(function Chip({ w, h, color }: { w: number; h: number; color: string }) {
  return <View style={{ width: w, height: h, borderRadius: 2, backgroundColor: color }} />;
});

export type Rand = () => number;
export const between = (r: Rand, a: number, b: number) => a + (b - a) * r();
export const pick = <T,>(r: Rand, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
