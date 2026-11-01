import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GiftEvent } from '../lib/types';
import { giftName } from '../lib/format';
import { GiftIcon } from './GiftIcon';
import { Avatar } from './Avatar';

export interface GiftOverlayHandle {
  push: (e: GiftEvent) => void;
}

/**
 * Hədiyyə animasiyaları:
 *  SMALL  → sol tərəfdə sürüşən banner (kombo sayğacı ilə)
 *  BIG/LUXURY → ekranın mərkəzində böyük, parlayan animasiya
 */
export const GiftOverlay = forwardRef<GiftOverlayHandle>(function GiftOverlay(_, ref) {
  const [banner, setBanner] = useState<GiftEvent | null>(null);
  const [big, setBig] = useState<GiftEvent | null>(null);
  const bigQueue = useRef<GiftEvent[]>([]);
  const bannerX = useRef(new Animated.Value(-320)).current;
  const bigScale = useRef(new Animated.Value(0)).current;
  const bigOpacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingBig = useRef(false);

  const playBig = useCallback(() => {
    const next = bigQueue.current.shift();
    if (!next) {
      playingBig.current = false;
      setBig(null);
      return;
    }
    playingBig.current = true;
    setBig(next);
    bigScale.setValue(0.2);
    bigOpacity.setValue(0);
    glow.setValue(0);
    const hold = next.gift.tier === 'LUXURY' ? 2600 : 1400;
    Animated.sequence([
      Animated.parallel([
        Animated.spring(bigScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(bigOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.loop(Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true }), { iterations: 3 }),
      ]),
      Animated.delay(hold),
      Animated.parallel([
        Animated.timing(bigOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(bigScale, { toValue: 1.4, duration: 350, useNativeDriver: true }),
      ]),
    ]).start(() => playBig());
  }, [bigOpacity, bigScale, glow]);

  useImperativeHandle(ref, () => ({
    push(e: GiftEvent) {
      if (e.gift.tier === 'SMALL') {
        setBanner(e);
        Animated.spring(bannerX, { toValue: 0, friction: 7, useNativeDriver: true }).start();
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(() => {
          Animated.timing(bannerX, { toValue: -320, duration: 250, useNativeDriver: true }).start(() => setBanner(null));
        }, 2600);
      } else {
        bigQueue.current.push(e);
        if (!playingBig.current) playBig();
      }
    },
  }));

  useEffect(() => () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
  }, []);

  const spin = glow.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {banner ? (
        <Animated.View style={[styles.banner, { transform: [{ translateX: bannerX }] }]}>
          <LinearGradient colors={['rgba(255,77,141,0.95)', 'rgba(123,92,255,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bannerInner}>
            <Avatar uri={banner.sender.avatarUrl} name={banner.sender.name} size={34} />
            <View style={{ maxWidth: 130 }}>
              <Text style={styles.bannerName} numberOfLines={1}>{banner.sender.name}</Text>
              <Text style={styles.bannerSub} numberOfLines={1}>{giftName(banner.gift)}</Text>
            </View>
            <GiftIcon id={banner.gift.id} size={42} />
          </LinearGradient>
          <Text style={styles.combo}>×{banner.count}</Text>
        </Animated.View>
      ) : null}
      {big ? (
        <Animated.View style={[styles.center, { opacity: bigOpacity }]}>
          <Animated.View style={[styles.rays, { transform: [{ rotate: spin }] }]}>
            <LinearGradient colors={['rgba(255,200,87,0.0)', 'rgba(255,94,142,0.45)', 'rgba(123,92,255,0.0)']} style={{ flex: 1, borderRadius: 200 }} />
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: bigScale }], alignItems: 'center' }}>
            <GiftIcon id={big.gift.id} size={big.gift.tier === 'LUXURY' ? 220 : 160} />
            <Text style={styles.bigText}>{big.sender.name}</Text>
            <Text style={styles.bigSub}>{giftName(big.gift)} ×{big.count}</Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 8, top: '38%', flexDirection: 'row', alignItems: 'center' },
  bannerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 10, paddingVertical: 4, borderRadius: 30 },
  bannerName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  combo: { color: '#FFE58F', fontSize: 30, fontWeight: '900', fontStyle: 'italic', marginLeft: 8, textShadowColor: '#C850C0', textShadowRadius: 8 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', width: 380, height: 380 },
  bigText: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 8, textShadowColor: '#000', textShadowRadius: 6 },
  bigSub: { color: '#FFE58F', fontSize: 16, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 6 },
});
