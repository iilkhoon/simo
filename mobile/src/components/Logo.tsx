import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, palette } from '../theme';

/**
 * Simo loqosu — söhbət baloncuğu + maskotun iki buynuzu + ürək: "danış, tanış ol, sev".
 */
const BODY = 'M8 36C8 26.5 12.6 19.2 18.8 15.2C17.2 10.8 17.8 6.2 20.6 3.4C21.6 2.4 23 2.6 23.4 4C24.4 7.4 25.4 10.6 26.6 13.7C30.4 12.9 35 12.8 39.6 13.6C42 10.6 45.4 8.8 49.2 8.4C50.4 8.3 51 9.2 50.7 10.4C50.1 13 49.2 15.4 47.9 17.6C53 21.4 56 27.6 56 34.4C56 46 46.2 54.4 33.6 54.4H23.4C20.6 58 16.2 60.6 10.6 61.2C12.6 58.6 13.6 55.8 13.4 52.4C10 48.2 8 42.8 8 36Z';
const HEART = 'M32 46.6S20.8 40 20.8 32.6C20.8 29 23.6 26.4 26.9 26.4C29.2 26.4 31 27.6 32 29.4C33 27.6 34.8 26.4 37.1 26.4C40.4 26.4 43.2 29 43.2 32.6C43.2 40 32 46.6 32 46.6Z';

export function LogoMark({ size = 64, light }: { size?: number; shadow?: boolean; light?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d={BODY} fill={light ? colors.white : colors.brand} />
      <Path d={HEART} fill={light ? colors.brand : colors.white} />
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
