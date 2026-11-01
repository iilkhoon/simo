import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';

/** Simo loqosu: söhbət qabarcığı + ürək (tanış ol və danış) */
export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="lm" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF5E8E" />
          <Stop offset="0.55" stopColor="#C850C0" />
          <Stop offset="1" stopColor="#7B5CFF" />
        </LinearGradient>
      </Defs>
      <Path d="M32 4C16.5 4 4 15.6 4 30c0 7.6 3.5 14.4 9 19.2L10 60l12.4-6.2c3 1 6.3 1.6 9.6 1.6 15.5 0 28-11.6 28-26S47.5 4 32 4z" fill="url(#lm)" />
      <Path d="M32 44S18 35.5 18 26.5c0-4.4 3.4-7.5 7.4-7.5 2.9 0 5.2 1.6 6.6 4 1.4-2.4 3.7-4 6.6-4 4 0 7.4 3.1 7.4 7.5C46 35.5 32 44 32 44z" fill="#fff" />
      <Circle cx="47" cy="15" r="3" fill="#FFE58F" />
    </Svg>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <LogoMark size={size} />
      <Text style={{ color: '#fff', fontSize: size * 0.85, fontWeight: '900', letterSpacing: -1 }}>simo</Text>
    </View>
  );
}
