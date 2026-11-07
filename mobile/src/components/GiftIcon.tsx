import React, { memo } from 'react';
import { SvgXml } from 'react-native-svg';
import { COIN_SVG, DIAMOND_SVG } from '../assets/giftSvgs';
import { GIFT_ART } from './gifts/art';

/** Hədiyyə ikonu — qradiyentli, kölgəli orijinal rəsm (naməlum id → ürək) */
export const GiftIcon = memo(function GiftIcon({ id, size = 48 }: { id: string; size?: number }) {
  const xml = GIFT_ART[id] ?? GIFT_ART.heart;
  return <SvgXml xml={xml} width={size} height={size} />;
});

export function CoinIcon({ size = 16 }: { size?: number }) {
  return <SvgXml xml={COIN_SVG} width={size} height={size} />;
}

export function DiamondIcon({ size = 16 }: { size?: number }) {
  return <SvgXml xml={DIAMOND_SVG} width={size} height={size} />;
}
