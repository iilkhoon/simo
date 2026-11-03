import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LIQUID = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Şüşə səth (iOS 26+ "Liquid Glass").
 * iOS 26+ — sistemin həqiqi GlassView-u (sındırma, işıq, toxunuşda "jele" effekti).
 * Köhnə iOS / Android / web — bulanıq fon + yuxarıda parlaq kənar + nazik işıqlı haşiyə ilə eyni görünüş.
 */
export function Glass({ children, style, radius, dark, tint, interactive }: {
  children?: React.ReactNode; style?: StyleProp<ViewStyle>; radius: number; dark?: boolean; tint?: string; interactive?: boolean;
}) {
  if (LIQUID) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} tintColor={tint} colorScheme={dark ? 'dark' : 'light'} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, shadow, style]}>
      {/* Android-da real bulanıqlıq (dimezis) hər kadrda bütün ekranı yenidən çəkir — video altında
          tətbiqi dondururdu. Android-da sıx yarımşəffaf fon istifadə olunur. */}
      {Platform.OS === 'android' ? null : (
        <BlurView intensity={60} tint={dark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={StyleSheet.absoluteFill} />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint ?? (Platform.OS === 'android' ? (dark ? 'rgba(28,24,22,0.86)' : 'rgba(255,255,255,0.92)') : (dark ? 'rgba(28,24,22,0.55)' : 'rgba(255,255,255,0.62)')) }]} />
      {/* Yuxarıdan düşən işıq — şüşənin qalınlığı hissi */}
      <LinearGradient colors={dark ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']} style={[StyleSheet.absoluteFill, { bottom: '45%' }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.9)' }]} />
      {children}
    </View>
  );
}

const shadow: ViewStyle = Platform.select({
  web: { boxShadow: '0 10px 30px rgba(40,20,15,0.16), 0 1px 3px rgba(40,20,15,0.10)' } as ViewStyle,
  default: { shadowColor: '#2A140F', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
}) as ViewStyle;

export const TAB_BAR_H = 64;
/** Üzən tab panelinin tutduğu yer: tab ekranlarının məzmunu bu qədər alt boşluqla bitir. */
export function useTabSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_H + Math.max(insets.bottom, 12) + 16;
}
