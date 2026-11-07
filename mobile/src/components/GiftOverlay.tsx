import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { GiftEvent } from '../lib/types';
import { giftName } from '../lib/format';
import { colors, fonts } from '../theme';
import { GiftIcon } from './GiftIcon';
import { Avatar } from './Avatar';
import { GiftScene } from './GiftScenes';

export interface GiftOverlayHandle {
  push: (e: GiftEvent) => void;
}

/**
 * Hədiyyə animasiyaları:
 *  SMALL  → solda sürüşən stiker-banner + kombo sayğacı (×N "döyünür")
 *  Hər hədiyyənin öz səhnəsi var (GiftScenes.tsx): ikon trayektoriyası, fon, hissəciklər
 */
export const GiftOverlay = forwardRef<GiftOverlayHandle>(function GiftOverlay(_, ref) {
  const [banner, setBanner] = useState<GiftEvent | null>(null);
  const [big, setBig] = useState<{ k: number; e: GiftEvent } | null>(null);
  const [floats, setFloats] = useState<{ key: number; e: GiftEvent }[]>([]);
  const bigQueue = useRef<GiftEvent[]>([]);
  const playingBig = useRef(false);
  const floatKey = useRef(0);
  const bannerX = useRef(new Animated.Value(-340)).current;
  const comboScale = useRef(new Animated.Value(1)).current;
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playNext = useCallback(() => {
    const next = bigQueue.current.shift();
    if (!next) {
      playingBig.current = false;
      setBig(null);
      return;
    }
    playingBig.current = true;
    setBig({ k: ++floatKey.current, e: next });
  }, []);

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
        const key = ++floatKey.current;
        setFloats((f) => [...f.slice(-3), { key, e }]);
      } else {
        // Çox böyük hədiyyə növbəsi uzanmasın: ən çox 4 gözləyən
        if (bigQueue.current.length >= 4) bigQueue.current.shift();
        bigQueue.current.push(e);
        if (!playingBig.current) playNext();
      }
    },
  }));

  useEffect(() => () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {floats.map(({ key, e }) => (
        <GiftScene key={key} event={e} onDone={() => setFloats((f) => f.filter((x) => x.key !== key))} />
      ))}
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
      {big ? <GiftScene key={big.k} event={big.e} onDone={playNext} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  banner: { position: 'absolute', left: 10, top: '36%', flexDirection: 'row', alignItems: 'center' },
  bannerInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 8, height: 50, width: 236, borderRadius: 26, backgroundColor: colors.card },
  bannerName: { color: colors.ink, fontFamily: fonts.black, fontSize: 13 },
  bannerSub: { color: colors.brand, fontFamily: fonts.bold, fontSize: 11 },
  combo: { color: colors.coin, fontSize: 34, fontFamily: fonts.display, marginLeft: 10, textShadowColor: 'rgba(0,0,0,0.18)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
});
