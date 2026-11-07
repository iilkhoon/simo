import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import type { GiftEvent } from '../lib/types';
import { giftName } from '../lib/format';
import { colors, fonts } from '../theme';
import { GiftIcon } from './GiftIcon';
import { Burst } from './Burst';

/**
 * Hər hədiyyənin öz animasiya "səhnəsi" var (TikTok Live üslubu):
 *  - ikonun öz hərəkət trayektoriyası (maşın sürür, yaxta üzür, qüllə yerdən qalxır, tac düşür…)
 *  - fon rəngi (tint), fırlanan şüalar, dalğalar
 *  - hissəcik qatları: ürək, ləçək, qığılcım, köpük, sikkə, kül, sürət xətləri, orbit
 * Hamısı native driver ilə (UI thread), ona görə video zəng zamanı da axıcıdır.
 */

type Row = [t: number, x: number, y: number, s: number, r: number]; // x: ekran eni vahidi, y: ekran hündürlüyü vahidi
type PKind = 'heart' | 'spark' | 'star' | 'petal' | 'bubble' | 'coin' | 'confetti' | 'ember' | 'line' | 'dot';
type PMode = 'burst' | 'fall' | 'rise' | 'fountain' | 'streak' | 'orbit';

interface Layer {
  kind: PKind;
  mode: PMode;
  count: number;
  colors: string[];
  size: [number, number];
  from?: number; // buraxılış pəncərəsi (səhnənin hissəsi kimi 0..1)
  to?: number;
  ox?: number; // mənşə (ekran vahidi, mərkəzdən)
  oy?: number;
  spread?: number; // afiş: üfüqi yayılma (ekran eni)
  radius?: number; // burst/orbit radiusu (px)
  life?: number; // ms
  dir?: 1 | -1;
}

interface Scene {
  dur: number;
  tint: [string, string];
  motion: Row[];
  layers: Layer[];
  size: number;
  rays?: string;
  waves?: [string, string];
  impact?: number; // flaş + haptika anı (0..1)
  flash?: string;
}

const PINKS = ['#FF3D7F', '#FF7AA8', '#FFB3C8', '#FFFFFF'];
const GOLDS = ['#FFC23D', '#FFE08A', '#FFFFFF', '#F2D06B'];
const ICE = ['#8ED1FF', '#FFFFFF', '#CDEBFF', '#B9A8FF'];
const FIRE = ['#FF7A3D', '#FFC23D', '#F2344F', '#FFE08A'];

const rise = (to: number, scale = 1): Row[] => [
  [0, 0, 0.6, 0.6 * scale, 0], [0.2, 0, 0.02, 1.12 * scale, 0], [0.28, 0, 0, 1 * scale, 0],
  [0.9, 0, -0.012, 1.05 * scale, 0], [1, 0, to, 0.7 * scale, 0],
];

const FIREWORKS = (ox: number, oy: number, from: number, c = FIRE): Layer => ({
  kind: 'confetti', mode: 'burst', count: 22, colors: c, size: [6, 11], ox, oy, from, to: from + 0.04, radius: 120, life: 1500,
});

const SCENES: Record<string, Scene> = {
  perfume: {
    dur: 3400, size: 170, tint: ['#FFC2DA', '#5B1A6B'], impact: 0.22,
    motion: [[0, 0, 0.4, 0.6, 18], [0.2, 0, 0, 1, 0], [0.42, 0, -0.01, 1.06, -9], [0.62, 0, 0, 1.06, 9], [0.82, 0, -0.01, 1.05, -4], [1, 0, -0.1, 0.7, 0]],
    layers: [
      { kind: 'bubble', mode: 'fountain', count: 26, colors: PINKS, size: [8, 20], ox: 0.1, oy: -0.08, spread: 0.22, from: 0.22, to: 0.8, life: 1300 },
      { kind: 'heart', mode: 'rise', count: 12, colors: PINKS, size: [8, 14], oy: 0.5, from: 0.2, to: 0.85 },
      { kind: 'spark', mode: 'burst', count: 12, colors: GOLDS, size: [8, 14], from: 0.22, to: 0.3, radius: 130 },
    ],
  },
  champagne: {
    dur: 3600, size: 170, tint: ['#FFE08A', '#5B3A00'], impact: 0.3,
    motion: [[0, -0.3, 0.4, 0.6, -30], [0.18, 0, 0, 1, 0], [0.24, 0, 0, 1, -10], [0.27, 0, 0, 1, 10], [0.3, 0, 0, 1.08, -14], [0.34, 0, -0.01, 1.15, 14], [0.4, 0, -0.01, 1.05, 18], [0.9, 0, 0, 1.05, 18], [1, 0, -0.1, 0.7, 18]],
    layers: [
      { kind: 'confetti', mode: 'fountain', count: 44, colors: GOLDS, size: [5, 10], ox: 0.08, oy: -0.15, spread: 0.5, from: 0.3, to: 0.38, life: 1700 },
      { kind: 'bubble', mode: 'rise', count: 40, colors: GOLDS, size: [6, 18], oy: 0.55, from: 0.2, to: 0.95 },
      { kind: 'spark', mode: 'burst', count: 14, colors: GOLDS, size: [9, 15], from: 0.3, to: 0.34, radius: 150 },
    ],
  },
  ring: {
    dur: 3600, size: 170, tint: ['#CDB8FF', '#1E1250'], impact: 0.3, rays: '#CDB8FF',
    motion: [[0, 0, 0.1, 0.1, -360], [0.28, 0, 0, 1.25, 0], [0.34, 0, 0, 1, 0], [0.6, 0, -0.012, 1.08, 0], [0.9, 0, 0, 1.1, 0], [1, 0, 0, 0.5, 0]],
    layers: [
      { kind: 'spark', mode: 'burst', count: 24, colors: ['#FFFFFF', '#CDB8FF', '#FFE08A'], size: [9, 17], from: 0.3, to: 0.4, radius: 160 },
      { kind: 'star', mode: 'orbit', count: 8, colors: ['#FFFFFF', '#FFE08A'], size: [8, 12], radius: 120, from: 0.3, to: 0.34, life: 2800 },
      { kind: 'heart', mode: 'rise', count: 14, colors: PINKS, size: [8, 14], oy: 0.5, from: 0.3, to: 0.9 },
    ],
  },
  crown: {
    dur: 3800, size: 180, tint: ['#FFD36B', '#4A2E00'], impact: 0.2, rays: '#FFC23D',
    motion: [[0, 0, -0.6, 1.3, -22], [0.18, 0, 0.02, 1, 7], [0.24, 0, -0.045, 1.06, -4], [0.3, 0, 0, 1, 0], [0.9, 0, -0.01, 1.06, 0], [1, 0, -0.08, 0.5, 0]],
    layers: [
      { kind: 'coin', mode: 'fall', count: 28, colors: GOLDS, size: [10, 18], from: 0.2, to: 0.85, oy: -0.55, life: 1700 },
      { kind: 'spark', mode: 'burst', count: 26, colors: GOLDS, size: [9, 16], from: 0.2, to: 0.28, radius: 170 },
    ],
  },
  maiden_tower: {
    dur: 5000, size: 200, tint: ['#8ED1FF', '#071F44'], impact: 0.25, rays: '#8ED1FF',
    motion: rise(-0.08),
    layers: [
      { kind: 'star', mode: 'fall', count: 22, colors: ICE, size: [8, 14], from: 0.2, to: 0.85, life: 2600 },
      { kind: 'dot', mode: 'rise', count: 18, colors: GOLDS, size: [4, 8], oy: 0.5, from: 0.25, to: 0.9 },
      { kind: 'spark', mode: 'burst', count: 20, colors: ICE, size: [9, 15], from: 0.25, to: 0.3, radius: 190 },
    ],
  },
  flame_towers: {
    dur: 5200, size: 210, tint: ['#FF7A3D', '#2A0606'], impact: 0.25, flash: '#FF7A3D',
    motion: rise(-0.08),
    layers: [
      { kind: 'ember', mode: 'rise', count: 44, colors: FIRE, size: [4, 10], oy: 0.55, from: 0.15, to: 0.95 },
      FIREWORKS(-0.27, -0.22, 0.3), FIREWORKS(0.27, -0.28, 0.46), FIREWORKS(0, -0.33, 0.62, ['#FFFFFF', '#FFC23D', '#8ED1FF']),
    ],
  },
  sports_car: {
    dur: 5200, size: 220, tint: ['#FF3D3D', '#0C0C10'], impact: 0.3,
    motion: [[0, -0.85, 0.1, 1, 0], [0.12, -0.5, 0.1, 1, 0], [0.3, 0, 0.1, 1.02, 0], [0.34, 0, 0.098, 1.04, -3], [0.4, 0, 0.1, 1.04, 0], [0.7, 0, 0.1, 1.04, 0], [0.74, 0.05, 0.098, 1.04, 3], [1, 0.95, 0.1, 1.2, 0]],
    layers: [
      { kind: 'line', mode: 'streak', count: 24, colors: ['#FFFFFF', '#FFC23D'], size: [6, 12], from: 0.02, to: 0.3, life: 650 },
      { kind: 'line', mode: 'streak', count: 28, colors: ['#FFFFFF', '#FFC23D'], size: [6, 12], from: 0.72, to: 0.95, life: 550 },
      { kind: 'dot', mode: 'fountain', count: 16, colors: ['#BBBBBB', '#DDDDDD'], size: [14, 28], ox: -0.2, oy: 0.12, spread: 0.12, from: 0.28, to: 0.4, life: 1400 },
      { kind: 'spark', mode: 'burst', count: 14, colors: GOLDS, size: [9, 14], oy: 0.1, from: 0.3, to: 0.34, radius: 150 },
    ],
  },
  yacht: {
    dur: 5200, size: 220, tint: ['#8ED1FF', '#04284D'], impact: 0.5, waves: ['#2E86DE', '#6EC1FF'],
    motion: [[0, -0.85, 0.05, 1, 0], [0.15, -0.45, 0.03, 1, 3], [0.3, -0.15, 0.05, 1.05, -3], [0.45, 0, 0.03, 1.1, 3], [0.6, 0.12, 0.05, 1.1, -3], [0.75, 0.3, 0.03, 1.1, 3], [1, 0.95, 0.05, 1.1, -2]],
    layers: [
      { kind: 'bubble', mode: 'rise', count: 18, colors: ['#FFFFFF', '#CDEBFF'], size: [6, 14], oy: 0.5, from: 0.1, to: 0.9, life: 2200 },
      { kind: 'spark', mode: 'fall', count: 18, colors: ['#FFFFFF', '#FFE08A'], size: [8, 14], oy: -0.45, from: 0.15, to: 0.85, life: 2400 },
      { kind: 'confetti', mode: 'burst', count: 24, colors: GOLDS.concat(ICE), size: [6, 11], oy: 0, from: 0.5, to: 0.54, radius: 200 },
    ],
  },
  palace: {
    dur: 5400, size: 220, tint: ['#FFD36B', '#2E1B00'], impact: 0.25, rays: '#FFC23D', flash: '#FFE08A',
    motion: rise(-0.08),
    layers: [
      { kind: 'coin', mode: 'fall', count: 38, colors: GOLDS, size: [10, 18], oy: -0.55, from: 0.2, to: 0.85, life: 1700 },
      { kind: 'spark', mode: 'burst', count: 26, colors: GOLDS, size: [9, 16], from: 0.25, to: 0.3, radius: 200 },
      FIREWORKS(-0.28, -0.3, 0.42, GOLDS), FIREWORKS(0.28, -0.3, 0.56, GOLDS.concat(PINKS)),
    ],
  },
  love_planet: {
    dur: 5400, size: 210, tint: ['#FF8FB8', '#22083E'], impact: 0.3, flash: '#FF8FB8',
    motion: [[0, 0, 0, 0.05, 0], [0.22, 0, 0, 1.25, 50], [0.32, 0, 0, 1, 0], [0.9, 0, -0.012, 1.06, 90], [1, 0, 0, 0.4, 120]],
    layers: [
      { kind: 'heart', mode: 'orbit', count: 10, colors: PINKS, size: [10, 16], radius: 150, from: 0.25, to: 0.3, life: 4200 },
      { kind: 'star', mode: 'fall', count: 24, colors: ['#FFFFFF', '#FFB3C8', '#CDB8FF'], size: [7, 13], oy: -0.55, from: 0.15, to: 0.85, life: 2600 },
      { kind: 'heart', mode: 'rise', count: 26, colors: PINKS, size: [9, 16], oy: 0.55, from: 0.3, to: 0.95 },
    ],
  },
  diamond_heart: {
    dur: 3800, size: 180, tint: ['#8ED1FF', '#0A1E3F'], impact: 0.22, rays: '#8ED1FF',
    motion: [[0, 0, 0.1, 0.1, 0], [0.2, 0, 0, 1.2, 0], [0.3, 0, 0, 1, 0], [0.4, 0, 0, 1.12, 0], [0.5, 0, 0, 1, 0], [0.6, 0, 0, 1.12, 0], [0.7, 0, 0, 1, 0], [0.9, 0, 0, 1.05, 0], [1, 0, -0.08, 0.5, 0]],
    layers: [
      { kind: 'spark', mode: 'burst', count: 28, colors: ICE, size: [9, 17], from: 0.22, to: 0.3, radius: 170 },
      { kind: 'heart', mode: 'rise', count: 14, colors: ['#8ED1FF', '#FFFFFF'], size: [8, 14], oy: 0.5, from: 0.25, to: 0.9 },
      { kind: 'star', mode: 'orbit', count: 6, colors: ['#FFFFFF'], size: [8, 12], radius: 125, from: 0.3, to: 0.33, life: 2600 },
    ],
  },
  diamond_ring: {
    dur: 5000, size: 190, tint: ['#8ED1FF', '#0C1B3A'], impact: 0.3, rays: '#CDEBFF',
    motion: [[0, 0, 0.1, 0.1, -540], [0.3, 0, 0, 1.3, 0], [0.38, 0, 0, 1, 0], [0.9, 0, -0.01, 1.1, 0], [1, 0, 0, 0.5, 0]],
    layers: [
      { kind: 'spark', mode: 'burst', count: 40, colors: ICE.concat(['#FFFFFF']), size: [9, 18], from: 0.3, to: 0.42, radius: 190 },
      { kind: 'star', mode: 'orbit', count: 10, colors: ['#FFFFFF', '#8ED1FF'], size: [8, 13], radius: 135, from: 0.35, to: 0.4, life: 3400 },
    ],
  },
  silk_carpet: {
    dur: 5000, size: 220, tint: ['#E0485E', '#2D0810'], impact: 0.3,
    motion: [[0, -0.85, 0.22, 0.8, -10], [0.3, 0, 0.05, 1.1, 5], [0.42, 0, 0, 1.1, -4], [0.54, 0, 0.05, 1.1, 4], [0.66, 0, 0, 1.1, -3], [0.78, 0.05, 0.04, 1.1, 3], [1, 0.95, -0.25, 0.8, -12]],
    layers: [
      { kind: 'dot', mode: 'fountain', count: 28, colors: GOLDS, size: [4, 8], ox: 0, oy: 0.12, spread: 0.3, from: 0.15, to: 0.85, life: 1500 },
      { kind: 'petal', mode: 'fall', count: 22, colors: ['#E0485E', '#FFB3C8', '#FFC23D'], size: [8, 14], oy: -0.55, from: 0.2, to: 0.8, life: 2600 },
      { kind: 'spark', mode: 'burst', count: 18, colors: GOLDS, size: [9, 15], oy: 0.03, from: 0.3, to: 0.34, radius: 170 },
    ],
  },
  diamond_crown: {
    dur: 5400, size: 190, tint: ['#8ED1FF', '#0A1632'], impact: 0.2, rays: '#DDE6F5', flash: '#FFFFFF',
    motion: [[0, 0, -0.6, 1.3, -22], [0.16, 0, 0.02, 1, 7], [0.22, 0, -0.045, 1.06, -4], [0.28, 0, 0, 1, 0], [0.9, 0, -0.01, 1.08, 0], [1, 0, -0.08, 0.5, 0]],
    layers: [
      { kind: 'spark', mode: 'burst', count: 44, colors: ICE.concat(GOLDS), size: [9, 18], from: 0.2, to: 0.32, radius: 210 },
      { kind: 'star', mode: 'fall', count: 30, colors: ['#FFFFFF', '#8ED1FF'], size: [7, 13], oy: -0.55, from: 0.2, to: 0.85, life: 2600 },
      FIREWORKS(-0.28, -0.3, 0.45, ICE), FIREWORKS(0.28, -0.3, 0.6, GOLDS),
    ],
  },
  private_jet: {
    dur: 5400, size: 220, tint: ['#8ED1FF', '#08142B'], impact: 0.4,
    motion: [[0, -0.9, 0.35, 0.8, -14], [0.3, -0.2, 0.02, 1.15, -8], [0.5, 0.05, -0.04, 1.2, -8], [0.7, 0.35, -0.12, 1.2, -10], [1, 1, -0.45, 0.8, -18]],
    layers: [
      { kind: 'line', mode: 'streak', count: 36, colors: ['#FFFFFF', '#CDEBFF'], size: [8, 14], from: 0.05, to: 0.9, life: 600 },
      { kind: 'dot', mode: 'streak', count: 14, colors: ['#FFFFFF'], size: [20, 42], from: 0.05, to: 0.9, life: 1100 },
      { kind: 'spark', mode: 'burst', count: 18, colors: GOLDS, size: [9, 15], from: 0.4, to: 0.44, radius: 180 },
    ],
  },
};

const SMALL: Record<string, Scene> = {
  rose: small([{ kind: 'petal', mode: 'fountain', count: 12, colors: ['#FF3D7F', '#FF7AA8', '#E0115F'], size: [7, 12], oy: 0.12, spread: 0.18 }]),
  heart: small([{ kind: 'heart', mode: 'rise', count: 12, colors: PINKS, size: [9, 15], oy: 0.15, spread: 0.2 }]),
  kiss: small([{ kind: 'heart', mode: 'burst', count: 12, colors: ['#FF3D7F', '#FF7AA8'], size: [9, 15], oy: 0.15, radius: 110 }]),
  tea: small([{ kind: 'bubble', mode: 'rise', count: 10, colors: ['#FFFFFF', '#FFE08A'], size: [6, 12], oy: 0.12, spread: 0.08 }, { kind: 'spark', mode: 'burst', count: 6, colors: GOLDS, size: [8, 12], oy: 0.15, radius: 90 }]),
  pomegranate: small([{ kind: 'dot', mode: 'fountain', count: 14, colors: ['#FF5470', '#FFB3C1', '#9E0B2B'], size: [5, 9], oy: 0.12, spread: 0.2 }]),
  chocolate: small([{ kind: 'confetti', mode: 'fountain', count: 16, colors: ['#8B4A2B', '#FF6FA4', '#FFFFFF'], size: [5, 9], oy: 0.12, spread: 0.22 }]),
  teddy: small([{ kind: 'heart', mode: 'rise', count: 10, colors: PINKS, size: [9, 15], oy: 0.15, spread: 0.16 }, { kind: 'spark', mode: 'burst', count: 6, colors: GOLDS, size: [8, 12], oy: 0.15, radius: 90 }]),
  bouquet: small([{ kind: 'petal', mode: 'fountain', count: 16, colors: ['#FF7AA8', '#FF3D7F', '#FFB3C8', '#C9B8FF'], size: [7, 12], oy: 0.12, spread: 0.24 }, { kind: 'heart', mode: 'rise', count: 6, colors: PINKS, size: [9, 14], oy: 0.15, spread: 0.12 }]),
};

function small(layers: Layer[]): Scene {
  return {
    dur: 2300, size: 96, tint: ['transparent', 'transparent'],
    motion: [[0, 0, 0.32, 0.3, -12], [0.14, 0, 0.14, 1.2, 6], [0.22, 0, 0.15, 1, -3], [0.7, 0, 0.1, 1, 3], [1, 0, -0.18, 0.8, 0]],
    layers: layers.map((l) => ({ ...l, from: 0.12, to: 0.3, life: 1300 })),
  };
}

const GENERIC_BIG: Scene = {
  dur: 3400, size: 170, tint: ['#FFD36B', '#3A2400'], impact: 0.2, rays: '#FFC23D',
  motion: rise(-0.08).map((r, i) => (i === 0 ? ([0, 0, 0.1, 0.2, -20] as Row) : r)),
  layers: [
    { kind: 'confetti', mode: 'burst', count: 28, colors: GOLDS.concat(PINKS), size: [6, 11], from: 0.2, to: 0.26, radius: 180 },
    { kind: 'heart', mode: 'rise', count: 12, colors: PINKS, size: [9, 15], oy: 0.5, from: 0.2, to: 0.85 },
  ],
};

export function sceneFor(id: string, tier: 'SMALL' | 'BIG' | 'LUXURY'): Scene {
  if (tier === 'SMALL') return SMALL[id] ?? SMALL.heart;
  return SCENES[id] ?? (tier === 'LUXURY' ? { ...GENERIC_BIG, dur: 5000, size: 200 } : GENERIC_BIG);
}

// ───────────────────────── Hissəciklər ─────────────────────────

interface Spec { delay: number; life: number; size: number; color: string; x: number[]; y: number[]; rot: number; a0: number; turns: number; r: number }

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

function makeSpecs(l: Layer, dur: number, W: number, H: number): Spec[] {
  const from = l.from ?? 0.15, to = l.to ?? 0.7;
  return Array.from({ length: l.count }, (_, i) => {
    const size = rnd(l.size[0], l.size[1]);
    const color = l.colors[i % l.colors.length];
    const delay = rnd(from, to) * dur;
    let life = l.life ?? 1500;
    const ox = (l.ox ?? 0) * W, oy = (l.oy ?? 0) * H;
    let x = [0, 0], y = [0, 0];
    let a0 = 0, turns = 0, r = 0;
    switch (l.mode) {
      case 'burst': {
        const a = rnd(0, Math.PI * 2), rad = (l.radius ?? 150) * rnd(0.5, 1.15);
        x = [ox, ox + Math.cos(a) * rad]; y = [oy, oy + Math.sin(a) * rad, oy + Math.sin(a) * rad + 70];
        break;
      }
      case 'fall': {
        const x0 = ox + rnd(-0.5, 0.5) * W, sw = rnd(-40, 40);
        x = [x0, x0 + sw, x0 - sw * 0.5]; y = [oy - 20, oy + H + 40];
        life = (l.life ?? 2400);
        break;
      }
      case 'rise': {
        const x0 = ox + rnd(-(l.spread ?? 0.5), l.spread ?? 0.5) * W, sw = rnd(-30, 30);
        const span = (l.spread != null ? 0.55 : 1.15) * H;
        x = [x0, x0 + sw, x0 - sw * 0.6]; y = [oy, oy - span];
        life = l.life ?? (l.spread != null ? 1500 : 2800);
        break;
      }
      case 'fountain': {
        const vx = rnd(-(l.spread ?? 0.3), l.spread ?? 0.3) * W * 0.6, peak = rnd(0.12, 0.3) * H;
        x = [ox, ox + vx]; y = [oy, oy - peak, oy + peak * 0.5];
        break;
      }
      case 'streak': {
        const dir = l.dir ?? 1;
        const yy = rnd(-0.3, 0.32) * H;
        x = [-dir * W * 0.75, dir * W * 0.75]; y = [yy, yy];
        break;
      }
      case 'orbit': {
        a0 = (360 * i) / l.count; turns = 1.2; r = l.radius ?? 130;
        life = l.life ?? 3200;
        break;
      }
    }
    return { delay, life, size, color, x, y, rot: rnd(-200, 200), a0, turns, r };
  });
}

function Glyph({ kind, s, c }: { kind: PKind; s: number; c: string }) {
  switch (kind) {
    case 'heart': return <Text style={{ fontSize: s * 1.8, color: c }}>♥</Text>;
    case 'spark': return <Text style={{ fontSize: s * 1.9, color: c }}>✦</Text>;
    case 'star': return <Text style={{ fontSize: s * 1.5, color: c }}>★</Text>;
    case 'petal': return <View style={{ width: s * 0.9, height: s * 1.5, borderRadius: s, borderTopLeftRadius: 2, backgroundColor: c }} />;
    case 'bubble': return <View style={{ width: s, height: s, borderRadius: s, borderWidth: 1.5, borderColor: c, backgroundColor: c + '33' }} />;
    case 'coin': return <View style={{ width: s, height: s, borderRadius: s, backgroundColor: c, borderWidth: 2, borderColor: '#C9A227' }} />;
    case 'confetti': return <View style={{ width: s, height: s * 0.55, borderRadius: 2, backgroundColor: c }} />;
    case 'ember': return <View style={{ width: s, height: s, borderRadius: s, backgroundColor: c, shadowColor: c, shadowOpacity: 0.9, shadowRadius: 6 }} />;
    case 'line': return <View style={{ width: s * 9, height: 2.5, borderRadius: 2, backgroundColor: c, opacity: 0.9 }} />;
    default: return <View style={{ width: s, height: s, borderRadius: s, backgroundColor: c, opacity: 0.7 }} />;
  }
}

function Particle({ spec, layer, W, H }: { spec: Spec; layer: Layer; W: number; H: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(spec.delay),
      Animated.timing(v, { toValue: 1, duration: spec.life, easing: layer.mode === 'burst' ? Easing.out(Easing.cubic) : Easing.linear, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [spec, layer.mode, v]);
  const kf = (arr: number[]) => v.interpolate({ inputRange: arr.map((_, i) => i / (arr.length - 1)), outputRange: arr });
  const opacity = v.interpolate({ inputRange: [0, 0.001, 0.12, 0.78, 1], outputRange: [0, 1, 1, 1, 0] });
  const base = { position: 'absolute' as const, left: W / 2, top: H / 2, opacity };
  if (layer.mode === 'orbit') {
    return (
      <Animated.View style={[base, { width: 0, height: 0, transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${spec.a0}deg`, `${spec.a0 + 360 * spec.turns}deg`] }) }] }]}>
        <View style={{ position: 'absolute', left: spec.r, top: -spec.size }}><Glyph kind={layer.kind} s={spec.size} c={spec.color} /></View>
      </Animated.View>
    );
  }
  const isLine = layer.kind === 'line';
  return (
    <Animated.View style={[base, {
      transform: [
        { translateX: kf(spec.x) }, { translateY: kf(spec.y) },
        ...(isLine ? [] : [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spec.rot}deg`] }) }]),
        ...(layer.kind === 'spark' || layer.kind === 'star' ? [{ scale: v.interpolate({ inputRange: [0, 0.2, 0.6, 1], outputRange: [0.2, 1.2, 0.8, 0.2] }) }] : []),
      ],
    }]}>
      <Glyph kind={layer.kind} s={spec.size} c={spec.color} />
    </Animated.View>
  );
}

function Layers({ layers, dur, W, H, seed }: { layers: Layer[]; dur: number; W: number; H: number; seed: number }) {
  const all = useMemo(() => layers.map((l) => makeSpecs(l, dur, W, H)), [layers, dur, W, H, seed]);
  return <>{layers.map((l, li) => all[li].map((s, i) => <Particle key={`${li}-${i}`} spec={s} layer={l} W={W} H={H} />))}</>;
}

function Waves({ colors: [c1, c2], W, H }: { colors: [string, string]; W: number; H: number }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const la = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1700, easing: Easing.linear, useNativeDriver: true }));
    const lb = Animated.loop(Animated.timing(b, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true }));
    la.start(); lb.start();
    return () => { la.stop(); lb.stop(); };
  }, [a, b]);
  const seg = W / 4;
  const path = (n: number) => `M0 40 Q${seg / 2} 8 ${seg} 40${Array.from({ length: n - 1 }, (_, i) => ` T${seg * (i + 2)} 40`).join('')} L${seg * n} 120 L0 120 Z`;
  const wave = (v: Animated.Value, c: string, bottom: number, dir: number, op: number) => (
    <Animated.View style={{ position: 'absolute', bottom, left: 0, width: W * 2, opacity: op, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: dir > 0 ? [-W / 2, 0] : [0, -W / 2] }) }] }}>
      <Svg width={W * 2} height={120}><Path d={path(8)} fill={c} /></Svg>
    </Animated.View>
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.32 }}>
      {wave(b, c2, H * 0.1 - 20, -1, 0.75)}
      {wave(a, c1, H * 0.1 - 60, 1, 0.9)}
    </View>
  );
}

// ───────────────────────── Səhnə ─────────────────────────

export function GiftScene({ event, onDone, showLabel = true }: { event: GiftEvent; onDone: () => void; showLabel?: boolean }) {
  const { width: W, height: H } = useWindowDimensions();
  const sc = useMemo(() => sceneFor(event.gift.id, event.gift.tier), [event.gift.id, event.gift.tier]);
  const isSmall = event.gift.tier === 'SMALL';
  const p = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const seed = useRef(Date.now()).current;

  useEffect(() => {
    const anim = Animated.timing(p, { toValue: 1, duration: sc.dur, easing: Easing.linear, useNativeDriver: true });
    anim.start(({ finished }) => { if (finished) doneRef.current(); });
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!isSmall && sc.impact != null) {
      t = setTimeout(() => { Haptics.impactAsync(event.gift.tier === 'LUXURY' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); }, sc.impact * sc.dur);
    }
    return () => { anim.stop(); if (t) clearTimeout(t); };
  }, [p, sc, isSmall, event.gift.tier]);

  const times = sc.motion.map((r) => r[0]);
  const ip = (idx: 1 | 2 | 3 | 4, mul: number, unit = '') => p.interpolate({ inputRange: times, outputRange: sc.motion.map((r) => (unit ? `${r[idx] * mul}${unit}` : r[idx] * mul) as never) });
  const fade = p.interpolate({ inputRange: [0, 0.05, 0.9, 1], outputRange: [0, 1, 1, 0] });
  const tintOp = p.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 0.6, 0.6, 0] });
  const labelOp = p.interpolate({ inputRange: [0, 0.14, 0.2, 0.86, 0.94], outputRange: [0, 0, 1, 1, 0] });
  const labelY = H * 0.5 + sc.size / 2 + (isSmall ? 30 : 36);
  const iconY = sc.motion[sc.motion.length - 2][2] * H;
  const flashOp = sc.impact != null
    ? p.interpolate({ inputRange: [Math.max(0, sc.impact - 0.02), sc.impact, Math.min(1, sc.impact + 0.1)], outputRange: [0, sc.flash ? 0.5 : 0.28, 0] })
    : 0;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {!isSmall ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: tintOp }]}>
          <LinearGradient colors={[sc.tint[1] + 'CC', sc.tint[0] + '55', sc.tint[1] + 'CC']} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        {sc.waves ? <Waves colors={sc.waves} W={W} H={H} /> : null}
        {sc.rays ? (
          <Animated.View style={{ position: 'absolute', left: W / 2 - 200, top: H / 2 - 200, opacity: 0.55, transform: [{ translateY: iconY * 0.5 }, { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '220deg'] }) }, { scale: p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.2, 1, 1.15] }) }] }}>
            <Burst size={400} points={16} color={sc.rays} inner={0.6} />
          </Animated.View>
        ) : null}
        <Layers layers={sc.layers} dur={sc.dur} W={W} H={H} seed={seed} />
        <Animated.View style={{ position: 'absolute', left: W / 2 - sc.size / 2, top: H / 2 - sc.size / 2, transform: [{ translateX: ip(1, W) }, { translateY: ip(2, H) }, { scale: ip(3, 1) }, { rotate: ip(4, 1, 'deg') }] }}>
          <GiftIcon id={event.gift.id} size={sc.size} />
        </Animated.View>
        {showLabel && !isSmall ? (
          <Animated.View style={[styles.label, { top: labelY, opacity: labelOp }]}>
            <Text style={styles.name} numberOfLines={1}>{event.sender.name}</Text>
            <Text style={styles.sub}>{giftName(event.gift)} ×{event.count}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
      {sc.impact != null ? <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: sc.flash ?? '#FFFFFF', opacity: flashOp }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', alignSelf: 'center', backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 7, alignItems: 'center', maxWidth: 280 },
  name: { color: colors.ink, fontSize: 16, fontFamily: fonts.displayBold },
  sub: { color: colors.brand, fontSize: 13, fontFamily: fonts.black },
});
