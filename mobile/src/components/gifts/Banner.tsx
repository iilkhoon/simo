/**
 * Kombo-banner (TikTok/Bigo üslubu): soldan sürüşür, göndərənin avatarı + adı, hədiyyə ikonu və "×N" sayğacı.
 * Eyni göndərən eyni hədiyyəni təkrar göndərdikcə sayğac "döyünür".
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { GiftEvent } from '../../lib/types';
import { giftName } from '../../lib/format';
import { fonts } from '../../theme';
import { Avatar } from '../Avatar';
import { GiftIcon } from '../GiftIcon';
import { BANNER_COLORS } from './catalog';
import { gs } from './strings';

export const BANNER_W = 214;
export const BANNER_H = 48;

export const ComboBanner = memo(function ComboBanner({ ev, combo, bump, self, leaving, top }: {
  ev: GiftEvent; combo: number; bump: number; self: boolean; leaving: boolean; top: number;
}) {
  const x = useSharedValue(-BANNER_W - 80);
  const o = useSharedValue(1);
  const cs = useSharedValue(1);
  const is = useSharedValue(1);

  useEffect(() => {
    x.value = withSpring(0, { damping: 16, stiffness: 180 });
  }, [x]);
  useEffect(() => {
    if (bump <= 1) return;
    cs.value = withSequence(withTiming(1.75, { duration: 90 }), withSpring(1, { damping: 7, stiffness: 260 }));
    is.value = withSequence(withTiming(1.25, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 240 }));
  }, [bump, cs, is]);
  useEffect(() => {
    if (!leaving) return;
    x.value = withTiming(-BANNER_W - 80, { duration: 260, easing: Easing.in(Easing.quad) });
    o.value = withTiming(0, { duration: 260 });
  }, [leaving, x, o]);

  const wrapSt = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }] }));
  const comboSt = useAnimatedStyle(() => ({ transform: [{ scale: cs.value }, { rotate: '-6deg' }] }));
  const iconSt = useAnimatedStyle(() => ({ transform: [{ scale: is.value }] }));
  const tier = ev.gift.tier;
  const lux = tier === 'LUXURY';

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { top }, wrapSt]}>
      <LinearGradient colors={BANNER_COLORS[tier]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.pill, lux && styles.luxBorder]}>
        <Avatar uri={ev.sender.avatarUrl} name={ev.sender.name} size={38} vipTier={ev.sender.vipTier} />
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>{self ? gs('you') : ev.sender.name}</Text>
          <Text style={[styles.sub, { color: tier === 'SMALL' ? '#FFD98A' : '#FFF2CC' }]} numberOfLines={1}>{self ? gs('youSent') : gs('sent')} {giftName(ev.gift)}</Text>
        </View>
      </LinearGradient>
      <Animated.View style={[styles.icon, iconSt]}>
        <GiftIcon id={ev.gift.id} size={58} />
      </Animated.View>
      <Animated.View style={[styles.comboWrap, comboSt]}>
        <Text style={styles.x}>×</Text>
        <Text style={styles.combo}>{combo}</Text>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 8, flexDirection: 'row', alignItems: 'center' },
  pill: { width: BANNER_W, height: BANNER_H, borderRadius: BANNER_H / 2, flexDirection: 'row', alignItems: 'center', paddingLeft: 5, paddingRight: 58, gap: 8 },
  luxBorder: { borderWidth: 1.5, borderColor: '#FFE08A' },
  texts: { flex: 1, minWidth: 0 },
  name: { color: '#FFFFFF', fontFamily: fonts.black, fontSize: 13.5, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  sub: { fontFamily: fonts.bold, fontSize: 11.5, marginTop: 1 },
  icon: { position: 'absolute', left: BANNER_W - 58, top: -10 },
  comboWrap: { flexDirection: 'row', alignItems: 'flex-end', marginLeft: 6 },
  x: { color: '#FFE08A', fontFamily: fonts.displayBlack, fontSize: 20, marginBottom: 3, fontStyle: 'italic', textShadowColor: '#C2410C', textShadowRadius: 1, textShadowOffset: { width: 1.5, height: 1.5 } },
  combo: { color: '#FFE08A', fontFamily: fonts.displayBlack, fontSize: 36, fontStyle: 'italic', letterSpacing: -1, textShadowColor: '#C2410C', textShadowRadius: 1, textShadowOffset: { width: 2, height: 2.5 } },
});
