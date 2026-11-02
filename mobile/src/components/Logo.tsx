import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
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

/**
 * "Nari" — Simo-nun maskotu: gülümsəyən nar personajı.
 * mood: happy (gülür), wink (göz vurur), love (ürək gözlər), wow (təəccüb)
 */
export function Mascot({ size = 120, mood = 'happy', color = palette.nar }: { size?: number; mood?: 'happy' | 'wink' | 'love' | 'wow'; color?: string }) {
  const eye = (cx: number, wink?: boolean) =>
    mood === 'love' ? (
      <Path key={cx} d={`M${cx} 41.5s-4.2-2.6-4.2-5.3c0-1.4 1.1-2.4 2.3-2.4.9 0 1.5.5 1.9 1.2.4-.7 1-1.2 1.9-1.2 1.2 0 2.3 1 2.3 2.4 0 2.7-4.2 5.3-4.2 5.3z`} fill={palette.ink} />
    ) : wink ? (
      <Path key={cx} d={`M${cx - 3.2} 37.5q3.2 -3 6.4 0`} stroke={palette.ink} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    ) : (
      <G key={cx}>
        <Ellipse cx={cx} cy={37} rx={mood === 'wow' ? 3.4 : 3} ry={mood === 'wow' ? 4.2 : 3.8} fill={palette.ink} />
        <Circle cx={cx + 1} cy={35.6} r={1.1} fill={colors.white} />
      </G>
    );
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* tac (narın taxtası) */}
      <Path d="M24.5 13.5l-2-6.5 5.2 2.6L32 4l4.3 5.6 5.2-2.6-2 6.5z" fill={palette.narDeep} />
      {/* bədən */}
      <Path d="M32 11.5c13.8 0 25 9.6 25 23.5S45.8 60 32 60 7 48.9 7 35s11.2-23.5 25-23.5z" fill={color} />
      {/* parıltı */}
      <Path d="M15 27c2-5.2 6.4-9 11.6-10.2" stroke="rgba(255,255,255,0.55)" strokeWidth={3.2} strokeLinecap="round" fill="none" />
      {/* yanaqlar */}
      <Ellipse cx={20} cy={44} rx={4.4} ry={2.6} fill="#FF9AA8" />
      <Ellipse cx={44} cy={44} rx={4.4} ry={2.6} fill="#FF9AA8" />
      {eye(25)}
      {eye(39, mood === 'wink')}
      {/* ağız */}
      {mood === 'wow' ? (
        <Ellipse cx={32} cy={47} rx={3.2} ry={3.8} fill={palette.ink} />
      ) : (
        <Path d="M26.5 45.5q5.5 6 11 0" stroke={palette.ink} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      )}
    </Svg>
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
