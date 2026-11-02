import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, palette } from '../theme';

/**
 * Simo loqosu — "Nar": Azərbaycan narı formasında düz işarə, içində ürək.
 */
const BODY = 'M32 14c-3.2 0-4.6-5.6-4.6-5.6l-3 4.2-4.6-1.6 1.8 5.4C13.4 20 8 27.4 8 36c0 12.2 10.7 22 24 22s24-9.8 24-22c0-8.6-5.4-16-13.6-19.6l1.8-5.4-4.6 1.6-3-4.2S35.2 14 32 14z';
const HEART = 'M32 47s-11-6.8-11-14c0-3.6 2.8-6.2 6-6.2 2.3 0 4 1.2 5 3 1-1.8 2.7-3 5-3 3.2 0 6 2.6 6 6.2C43 40.2 32 47 32 47z';

export function LogoMark({ size = 64, light }: { size?: number; shadow?: boolean; light?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d={BODY} fill={light ? colors.white : colors.brand} />
      <Path d={HEART} fill={light ? colors.brand : colors.white} />
      <Circle cx="45" cy="28" r="2.6" fill={light ? colors.brand : colors.white} opacity={0.9} />
    </Svg>
  );
}

export function Wordmark({ size = 34, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <LogoMark size={size * 1.08} />
      <Text style={{ color, fontSize: size * 0.9, fontFamily: fonts.displayBlack, letterSpacing: -1.8, marginTop: -3 }}>simo</Text>
    </View>
  );
}

/** Nazar boncuğu stikeri — uğur və qoruma simvolu */
export function Nazar({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={22} fill="#1F4FD8" />
      <Circle cx={24} cy={24} r={15} fill={colors.white} />
      <Circle cx={24} cy={24} r={10} fill="#7CC4FF" />
      <Circle cx={24} cy={24} r={5.2} fill={palette.ink} />
      <Circle cx={18} cy={14} r={3} fill="rgba(255,255,255,0.6)" />
    </Svg>
  );
}
