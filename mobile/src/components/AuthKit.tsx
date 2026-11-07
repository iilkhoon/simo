/**
 * Giriş axını (nömrə → kod → profil) üçün kiçik ortaq hissələr:
 * addım göstəricisi, sahə xətası, Azərbaycan bayrağı (emoji əvəzinə SVG) və "silkələmə" hərəkəti.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, fonts, gradients, motion, noPad } from '../theme';

/** 3 addımlı irəliləmə: Nömrə · Kod · Profil */
export function AuthSteps({ step }: { step: 0 | 1 | 2 }) {
  const { t } = useTranslation();
  const keys = ['phone', 'code', 'profile'] as const;
  return (
    <View style={s.steps} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: step + 1 }}>
      {keys.map((k, i) => (
        <View key={k} style={{ flex: 1, gap: 6 }}>
          <StepBar on={i <= step} active={i === step} />
          <Text style={[s.stepLabel, i <= step && { color: colors.ink }]} numberOfLines={1}>{t(`u2.steps.${k}`)}</Text>
        </View>
      ))}
    </View>
  );
}

function StepBar({ on, active }: { on: boolean; active: boolean }) {
  const w = useSharedValue(on && !active ? 1 : 0);
  useEffect(() => {
    w.value = withSpring(on ? 1 : 0, motion.enter);
  }, [on, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={s.track}>
      <Animated.View style={[s.fill, a]}>
        <LinearGradient colors={gradients.nar as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

/** Sahənin altındakı xəta mətni (yumşaq girişlə) */
export function FieldError({ text, style }: { text?: string | null; style?: StyleProp<ViewStyle> }) {
  if (!text) return null;
  return (
    <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={[s.err, style]} accessibilityLiveRegion="polite">
      <View style={s.errDot}><Text style={s.errBang}>!</Text></View>
      <Text style={s.errText}>{text}</Text>
    </Animated.View>
  );
}

/** Səhv daxil ediləndə sahəni üfüqi silkələyir */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => {
    x.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(9, { duration: 60 }), withTiming(-6, { duration: 60 }), withTiming(4, { duration: 60 }), withTiming(0, { duration: 50 }));
  };
  return { style, shake };
}

/** Azərbaycan bayrağı — mavi/qırmızı/yaşıl zolaq, ay-ulduz */
export function AzFlag({ w = 26 }: { w?: number }) {
  const h = w * 0.66;
  return (
    <View style={{ width: w, height: h, borderRadius: 4, overflow: 'hidden' }}>
      <Svg width={w} height={h} viewBox="0 0 36 24">
        <Rect x={0} y={0} width={36} height={8} fill="#00B5E2" />
        <Rect x={0} y={8} width={36} height={8} fill="#EF3340" />
        <Rect x={0} y={16} width={36} height={8} fill="#509E2F" />
        <Circle cx={16.6} cy={12} r={3.2} fill="#fff" />
        <Circle cx={17.5} cy={12} r={2.6} fill="#EF3340" />
        <Path d="M21.4 10.4 l0.45 1.05 1.1 -0.2 -0.75 0.85 0.75 0.85 -1.1 -0.2 -0.45 1.05 -0.45 -1.05 -1.1 0.2 0.75 -0.85 -0.75 -0.85 1.1 0.2z" fill="#fff" />
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 18 },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(26,21,18,0.08)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, overflow: 'hidden' },
  stepLabel: { ...noPad, fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.textDim, letterSpacing: 0.3 },
  err: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  errDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  errBang: { ...noPad, color: colors.white, fontFamily: fonts.black, fontSize: 11, lineHeight: 13 },
  errText: { ...noPad, flex: 1, color: colors.danger, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
});
