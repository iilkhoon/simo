/**
 * Hərəkət primitivləri (reanimated 4) — bütün ekranlar eyni ritmdə hərəkət edir.
 *
 * - `Appear`      — elementin yumşaq girişi (aşağıdan + şəffaflıq), `i` ilə pilləli (stagger)
 * - `Pressable3`  — toxunanda yaylı kiçilmə (UI thread-də, 60fps)
 * - `Skeleton*`   — spinner əvəzinə parıltılı (shimmer) yer tutucular
 * - `Pulse`       — canlı nöqtə / diqqət halqası
 * - `PopIn`       — bayram anları üçün sıçrayışlı böyümə
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, motion, radius } from '../theme';

/* ───────────── Giriş ───────────── */
export function Appear({ children, i = 0, style, from = 'down', delay = 0 }: { children: React.ReactNode; i?: number; style?: StyleProp<ViewStyle>; from?: 'down' | 'fade'; delay?: number }) {
  const reduce = useReducedMotion();
  const d = delay + Math.min(i, 12) * motion.stagger;
  const entering = reduce
    ? undefined
    : from === 'fade'
      ? FadeIn.delay(d).duration(motion.base)
      : FadeInDown.delay(d).springify().damping(motion.enter.damping).stiffness(motion.enter.stiffness).mass(motion.enter.mass);
  return <Animated.View entering={entering} style={style}>{children}</Animated.View>;
}

/* ───────────── Toxunuş ───────────── */
const APressable = Animated.createAnimatedComponent(Pressable);

/** Pressable + yaylı kiçilmə. `scaleTo` — basılı vəziyyətdə ölçü. */
export function Pressable3({ children, style, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number; children?: React.ReactNode }) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => { s.value = withSpring(scaleTo, motion.press); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withSpring(1, motion.press); onPressOut?.(e); }}
      style={[style, a]}
    >
      {children}
    </APressable>
  );
}

/* ───────────── Skelet (shimmer) ───────────── */
function Shimmer({ night }: { night?: boolean }) {
  const x = useSharedValue(-1);
  const w = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), -1, false);
  }, [x]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * w.value * 1.2 }] }));
  return (
    <Animated.View pointerEvents="none" onLayout={(e) => { w.value = e.nativeEvent.layout.width; }} style={[StyleSheet.absoluteFill, a]}>
      <LinearGradient
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        colors={night ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function Skeleton({ w, h, r = 12, style, night }: { w?: number | `${number}%`; h: number; r?: number; style?: StyleProp<ViewStyle>; night?: boolean }) {
  return (
    <View style={[{ width: w ?? '100%', height: h, borderRadius: r, overflow: 'hidden', backgroundColor: night ? colors.night3 : '#ECE3D9' }, style]}>
      <Shimmer night={night} />
    </View>
  );
}

/** Siyahı skeleti: avatar + iki sətir (söhbətlər, bildirişlər, liderlər) */
export function SkeletonList({ n = 6, avatar = 52, night, card = true }: { n?: number; avatar?: number; night?: boolean; card?: boolean }) {
  return (
    <View style={{ gap: 10, paddingTop: 4 }}>
      {Array.from({ length: n }).map((_, i) => (
        <Appear key={i} i={i} from="fade">
          <View style={[sk.row, card && { backgroundColor: night ? colors.night2 : colors.card }]}>
            <Skeleton w={avatar} h={avatar} r={avatar / 2} night={night} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton w="55%" h={13} r={7} night={night} />
              <Skeleton w="80%" h={11} r={6} night={night} />
            </View>
          </View>
        </Appear>
      ))}
    </View>
  );
}

/** Şəbəkə skeleti: 2 sütunlu foto kartlar */
export function SkeletonGrid({ n = 4, ratio = 1.32, gap = 12, night, width }: { n?: number; ratio?: number; gap?: number; night?: boolean; width: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
      {Array.from({ length: n }).map((_, i) => (
        <Appear key={i} i={i} from="fade">
          <Skeleton w={width} h={width * ratio} r={radius.lg} night={night} />
        </Appear>
      ))}
    </View>
  );
}

/* ───────────── Nəbz / sıçrayış ───────────── */
/** Ətrafında genişlənən halqa (canlı, axtarış, zəng) */
export function Pulse({ size, color = colors.brand, style, duration = 1600 }: { size: number; color?: string; style?: StyleProp<ViewStyle>; duration?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false);
  }, [t, duration]);
  const a = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - t.value), transform: [{ scale: 1 + t.value * 0.9 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, a, style]} />;
}

/** Sıçrayışla görünən blok (uyğunluq, mükafat) */
export function PopIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(0.4);
  const o = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withSpring(1, motion.bouncy));
    o.value = withDelay(delay, withTiming(1, { duration: 180 }));
  }, [s, o, delay]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

/** Yavaş "üzmə" (illüstrasiyalar, maskot) */
export function Float({ children, amp = 6, duration = 2200, style }: { children: React.ReactNode; amp?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    y.value = withRepeat(withSequence(withTiming(-amp, { duration, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })), -1, false);
  }, [y, amp, duration, reduce]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[a, style]}>{children}</Animated.View>;
}

const sk = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg },
});
