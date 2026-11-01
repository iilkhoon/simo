import React from 'react';
import { SvgXml } from 'react-native-svg';
import { COIN_SVG, DIAMOND_SVG, GIFT_SVGS } from '../assets/giftSvgs';

export function GiftIcon({ id, size = 48 }: { id: string; size?: number }) {
  const xml = GIFT_SVGS[id] ?? GIFT_SVGS.heart;
  return <SvgXml xml={xml} width={size} height={size} />;
}

export function CoinIcon({ size = 16 }: { size?: number }) {
  return <SvgXml xml={COIN_SVG} width={size} height={size} />;
}

export function DiamondIcon({ size = 16 }: { size?: number }) {
  return <SvgXml xml={DIAMOND_SVG} width={size} height={size} />;
}
