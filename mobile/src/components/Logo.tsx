import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { colors, fonts } from '../theme';

/**
 * Simo loqosu — "Nar": Azərbaycan narı formasında stiker, içində ürək.
 * Neobrutal: mürəkkəb kontur + sərt kölgə.
 */
const BODY = 'M32 14c-3.2 0-4.6-5.6-4.6-5.6l-3 4.2-4.6-1.6 1.8 5.4C13.4 20 8 27.4 8 36c0 12.2 10.7 22 24 22s24-9.8 24-22c0-8.6-5.4-16-13.6-19.6l1.8-5.4-4.6 1.6-3-4.2S35.2 14 32 14z';
const HEART = 'M32 47s-11-6.8-11-14c0-3.6 2.8-6.2 6-6.2 2.3 0 4 1.2 5 3 1-1.8 2.7-3 5-3 3.2 0 6 2.6 6 6.2C43 40.2 32 47 32 47z';

export function LogoMark({ size = 64, shadow = true }: { size?: number; shadow?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {shadow ? (
        <G transform="translate(3 3)">
          <Path d={BODY} fill={colors.ink} />
        </G>
      ) : null}
      <Path d={BODY} fill={colors.brand} stroke={colors.ink} strokeWidth={3} strokeLinejoin="round" />
      <Path d={HEART} fill={colors.card} stroke={colors.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <Circle cx="45" cy="27" r="2.6" fill={colors.card} />
    </Svg>
  );
}

export function Wordmark({ size = 34, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <LogoMark size={size * 1.1} />
      <Text style={{ color, fontSize: size * 0.82, fontFamily: fonts.display, letterSpacing: -1.5, marginTop: -2 }}>simo</Text>
    </View>
  );
}
