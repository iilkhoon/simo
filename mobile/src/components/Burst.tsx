import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

/** Yumşaq "partlayış" stikeri (çoxguşəli ulduz) — hədiyyə effektləri və aksiyalar üçün */
export function Burst({ size = 120, points = 14, color = colors.coin, inner = 0.8 }: { size?: number; points?: number; color?: string; stroke?: string; inner?: number }) {
  const c = 50;
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 48 : 48 * inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'}${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)} `;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={d + 'Z'} fill={color} stroke={color} strokeWidth={6} strokeLinejoin="round" />
    </Svg>
  );
}
