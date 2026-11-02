import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { GiftEvent } from '../lib/types';
import { giftName } from '../lib/format';
import { colors, fonts } from '../theme';
import { GiftIcon } from './GiftIcon';
import { Avatar } from './Avatar';
import { Burst } from './Burst';

export interface GiftOverlayHandle {
  push: (e: GiftEvent) => void;
}

/**
 * Hədiyyə animasiyaları:
 *  SMALL  → solda sürüşən stiker-banner + kombo sayğacı (×N "döyünür")
 *  BIG/LUXURY → mərkəzdə fırlanan "partlayış" stikeri üzərində böyük hədiyyə
 */
export const GiftOverlay = forwardRef<GiftOverlayHandle>(function GiftOverlay(_, ref) {
  const [banner, setBanner] = useState<GiftEvent | null>(null);
  const [big, setBig] = useState<GiftEvent | null>(null);
  const bigQueue = useRef<GiftEvent[]>([]);
  const bannerX = useRef(new Animated.Value(-340)).current;
  const comboScale = useRef(new Animated.Value(1)).current;
  const bigScale = useRef(new Animated.Value(0)).current;
  const bigOpacity = useRef(new Animated.Value(0)).current;
  const spinV = useRef(new Animated.Value(0)).current;
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
    spinV.setValue(0);
    const hold = next.gift.tier === 'LUXURY' ? 2600 : 1400;
    Animated.timing(spinV, { toValue: 1, duration: hold + 1200, easing: Easing.linear, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.parallel([
        Animated.spring(bigScale, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
        Animated.timing(bigOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.delay(hold),
      Animated.parallel([
        Animated.timing(bigOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(bigScale, { toValue: 0.6, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => playBig());
  }, [bigOpacity, bigScale, spinV]);

  useImperativeHandle(ref, () => ({
    push(e: GiftEvent) {
      if (e.gift.tier === 'SMALL') {
        setBanner(e);
        Animated.spring(bannerX, { toValue: 0, friction: 7, useNativeDriver: true }).start();
        comboScale.setValue(1.8);
        Animated.spring(comboScale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(() => {
          Animated.timing(bannerX, { toValue: -340, duration: 220, useNativeDriver: true }).start(() => setBanner(null));
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

  const spin = spinV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '120deg'] });
  const lux = big?.gift.tier === 'LUXURY';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {banner ? (
        <Animated.View style={[styles.banner, { transform: [{ translateX: bannerX }] }]}>
          <View style={styles.bannerInner}>
            <Avatar uri={banner.sender.avatarUrl} name={banner.sender.name} size={32} />
            <View style={{ maxWidth: 120 }}>
              <Text style={styles.bannerName} numberOfLines={1}>{banner.sender.name}</Text>
              <Text style={styles.bannerSub} numberOfLines={1}>{giftName(banner.gift)}</Text>
            </View>
            <GiftIcon id={banner.gift.id} size={40} />
          </View>
          <Animated.Text style={[styles.combo, { transform: [{ scale: comboScale }] }]}>×{banner.count}</Animated.Text>
        </Animated.View>
      ) : null}
      {big ? (
        <Animated.View style={[styles.center, { opacity: bigOpacity }]}>
          <Animated.View style={{ position: 'absolute', transform: [{ rotate: spin }] }}>
            <Burst size={lux ? 360 : 290} points={lux ? 18 : 14} color={lux ? colors.diamond : colors.coin} />
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: bigScale }], alignItems: 'center', zIndex: 2 }}>
            <GiftIcon id={big.gift.id} size={lux ? 200 : 150} />
            <View style={styles.bigLabel}>
              <Text style={styles.bigText} numberOfLines={1}>{big.sender.name}</Text>
              <Text style={styles.bigSub}>{giftName(big.gift)} ×{big.count}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 10, top: '36%', flexDirection: 'row', alignItems: 'center' },
  bannerShadow: { position: 'absolute', left: 3, top: 3, height: 50, width: 236, borderRadius: 26, backgroundColor: colors.ink },
  bannerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 8, height: 50, width: 236, borderRadius: 26, backgroundColor: colors.card },
  bannerName: { color: colors.ink, fontFamily: fonts.black, fontSize: 13 },
  bannerSub: { color: colors.brand, fontFamily: fonts.bold, fontSize: 11 },
  combo: { color: colors.coin, fontSize: 34, fontFamily: fonts.display, marginLeft: 10, textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  bigLabel: { marginTop: 10, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center', maxWidth: 260 },
  bigText: { color: colors.ink, fontSize: 16, fontFamily: fonts.displayBold },
  bigSub: { color: colors.brand, fontSize: 13, fontFamily: fonts.black },
});
