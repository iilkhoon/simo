/**
 * Uyğunluq bayramı (Tinder "It's a Match" tipli):
 * qradiyentli fon, iki foto kartı yanlardan uçaraq gəlir, ortada ürək sıçrayışla görünür və nəbz vurur,
 * arxadan ürək "konfetti"si yuxarı uçur. Hamısı reanimated ilə UI thread-də.
 */
import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colors, fonts, gradients, tintFor } from '../theme';
import { Icon } from './Icon';
import { PopIn, Pulse } from './motion';

const { width: SW, height: SH } = Dimensions.get('window');

function Card({ uri, name, side }: { uri?: string | null; name?: string; side: -1 | 1 }) {
  const x = useSharedValue(side * SW * 0.7);
  const r = useSharedValue(side * 30);
  useEffect(() => {
    x.value = withDelay(120, withSpring(0, { damping: 14, stiffness: 120 }));
    r.value = withDelay(120, withSpring(side * 8, { damping: 12, stiffness: 120 }));
  }, [x, r, side]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[styles.card, { backgroundColor: tintFor(name), marginLeft: side === 1 ? -26 : 0, marginTop: side === 1 ? 22 : 0 }, a]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
        <Text style={styles.initial}>{(name ?? '?').slice(0, 1).toUpperCase()}</Text>
      )}
    </Animated.View>
  );
}

/** Yuxarı uçan kiçik ürək */
function Particle({ x, delay, size, color }: { x: number; delay: number; size: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 3200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [t, delay]);
  const a = useAnimatedStyle(() => ({
    opacity: t.value < 0.1 ? t.value * 8 : 0.8 * (1 - t.value),
    transform: [{ translateY: -t.value * SH * 0.7 }, { translateX: Math.sin(t.value * 6 + x) * 14 }, { scale: 0.6 + t.value * 0.6 }],
  }));
  return <Animated.View style={[{ position: 'absolute', bottom: 40, left: x }, a]}><Icon name="heart" size={size} color={color} /></Animated.View>;
}

export function MatchCelebration({ me, other, title, sub, children }: {
  me: { avatarUrl?: string | null; name?: string }; other: { avatarUrl?: string | null; name?: string };
  title: string; sub: string; children?: React.ReactNode;
}) {
  const parts = useMemo(() => Array.from({ length: 14 }).map((_, i) => ({
    x: (SW / 14) * i + ((i * 37) % 20), delay: (i * 230) % 2400, size: 12 + ((i * 7) % 16), color: ['rgba(255,255,255,0.9)', '#FFD978', '#FFB3C1'][i % 3],
  })), []);
  const beat = useSharedValue(1);
  useEffect(() => {
    beat.value = withDelay(700, withRepeat(withSequence(withTiming(1.15, { duration: 180 }), withTiming(1, { duration: 180 }), withTiming(1.1, { duration: 160 }), withTiming(1, { duration: 700 })), -1, false));
  }, [beat]);
  const hb = useAnimatedStyle(() => ({ transform: [{ scale: beat.value }] }));
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={gradients.celebrate} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {parts.map((p, i) => <Particle key={i} {...p} />)}
      <View style={{ zIndex: 1, alignItems: 'center', width: '100%' }}>
        <PopIn delay={60}><Text style={styles.title}>{title.replace(/\s*\p{Extended_Pictographic}️?/gu, '')}</Text></PopIn>
        <PopIn delay={220}><Text style={styles.sub}>{sub}</Text></PopIn>
        <View style={{ flexDirection: 'row', marginVertical: 36 }}>
          <Card uri={me.avatarUrl} name={me.name} side={-1} />
          <Card uri={other.avatarUrl} name={other.name} side={1} />
          <View style={styles.heartWrap}>
            <PopIn delay={520}>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Pulse size={64} color="rgba(255,255,255,0.7)" />
                <Animated.View style={[styles.heart, hb]}><Icon name="heart" size={32} color={colors.brand} /></Animated.View>
              </View>
            </PopIn>
          </View>
        </View>
        <PopIn delay={700} style={{ width: '100%' }}>{children}</PopIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, overflow: 'hidden' },
  title: { color: colors.white, fontSize: 44, lineHeight: 48, fontFamily: fonts.displayBlack, letterSpacing: -1.8, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.92)', fontSize: 16, marginTop: 10, fontFamily: fonts.semibold, textAlign: 'center' },
  card: { width: 136, height: 176, borderRadius: 28, borderWidth: 4, borderColor: colors.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  initial: { fontFamily: fonts.displayBlack, fontSize: 60, color: 'rgba(26,21,18,0.2)' },
  heartWrap: { position: 'absolute', left: 0, right: 0, top: 64, alignItems: 'center' },
  heart: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#7B1FA2', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
});

