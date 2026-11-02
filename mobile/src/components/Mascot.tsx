import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MASCOT } from './mascotAssets';

/**
 * Simo maskotu — 3D tüklü qırmızı personaj (30 poza + çantalı əsas şəkil `hero`). Şəkillər `assets/mascot/*.png`-dədir,
 * `design/mascot/slice.py` `design/mascot/source/`-dakı cədvəllərdən avtomatik kəsir.
 */
export type MascotPose =
  | 'wave' | 'love' | 'wink' | 'call' | 'sing' | 'gift'
  | 'coin' | 'crown' | 'search' | 'wow' | 'sleep' | 'sad'
  | 'party' | 'nazar' | 'shy' | 'think' | 'laugh' | 'kiss'
  | 'coffee' | 'welcome' | 'dance' | 'music' | 'game' | 'trophy'
  | 'heart' | 'thumbs' | 'cute' | 'rose' | 'calm' | 'cool' | 'hero';

export function Mascot({ pose = 'wave', size = 120, float = true, style }: { pose?: MascotPose; size?: number; float?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!float) return;
    const l = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [v, float]);
  const src = MASCOT[pose] ?? MASCOT.wave;
  if (!src) return null;
  return (
    <Animated.View style={[{ width: size, height: size }, float && { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.04] }) }] }, style]}>
      <Image source={src} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}
