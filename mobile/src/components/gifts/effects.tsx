/**
 * Hər hədiyyənin öz animasiyası. Kataloq (catalog.ts) hədiyyə → FxKind seçir, burada FxKind → səhnə.
 * Koordinatlar: W×H — örtüyün ölçüsü; kiçik effektlər banner ikonunun yanında (ax, ay) oynayır.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Layer, Sprite, kf, showFrom, type KF } from './kit';
import { GIFT_ART, PART } from './art';
import { rg, rng, svg } from './svg';
import type { FxKind } from './catalog';
import { burst, chip, dot, fall, firework, orbit, render, rise, ring, sprite, twinkle, xmlLook, type P } from './particles';

export interface FxProps { W: number; H: number; ax: number; ay: number; giftId: string; variant?: string }

const glowCache = new Map<string, string>();
function glowXml(color: string) {
  let x = glowCache.get(color);
  if (!x) {
    x = svg(`<defs>${rg('gw', [[0, color, 0.75], [0.45, color, 0.3], [1, color, 0]])}</defs><circle cx="50" cy="50" r="50" fill="url(#gw)"/>`, '0 0 100 100');
    glowCache.set(color, x);
  }
  return x;
}

const art = (id: string) => GIFT_ART[id] ?? GIFT_ART.heart;
const geo = (W: number, H: number) => ({ cx: W / 2, cy: H * 0.44, U: Math.min(W * 0.92, H * 0.56, 430) });
const pulseIn = (t0 = 0, peak = 1.12): KF => kf([t0, 0], [t0 + 0.12, peak], [t0 + 0.2, 1]);
const outro = (from = 0.86): KF => kf([0, 1], [from, 1], [1, 0]);

function Glow({ x, y, size, color, k, osc }: { x: number; y: number; size: number; color: string; k?: Record<string, KF>; osc?: { p: 's' | 'o'; a: number; f: number; ph?: number }[] }) {
  return <Layer x={x} y={y} w={size} h={size} k={k} osc={osc}><Sprite xml={glowXml(color)} w={size} /></Layer>;
}

function Scene({ ps }: { ps: P[] }) {
  return <>{render(ps)}</>;
}

/** Tam ekran fon (qaranlıq, səma) */
function Backdrop({ W, H, xml, color, opacity = 1 }: { W: number; H: number; xml?: string; color?: string; opacity?: number }) {
  return (
    <Layer x={W / 2} y={H / 2} w={W} h={H} k={{ o: kf([0, 0], [0.08, opacity], [0.9, opacity], [1, 0]) }}>
      {xml ? <Sprite xml={xml} w={W} h={H} /> : <View style={{ flex: 1, backgroundColor: color }} />}
    </Layer>
  );
}

/* ═════════════ KİÇİK (banner yanında) ═════════════ */

function Petals({ ax, ay }: FxProps) {
  const ps = useMemo(() => {
    const r = rng(11);
    return [
      ...burst(r, { n: 10, cx: ax, cy: ay, looks: [sprite('petal'), sprite('petal'), sprite('petalPink')], dist: [90, 210], size: [14, 24], t0: [0, 0.35], dur: [0.5, 0.65], angle: [-70, 70], grav: 90, spin: 300, sway: 8, grow: [0.6, 1] }),
      ...twinkle(r, { n: 4, x: [ax + 20, ax + 150], y: [ay - 60, ay + 40], looks: [dot('#FFE08A')], size: [5, 8], t0: [0.1, 0.6] }),
    ];
  }, [ax, ay]);
  return <Scene ps={ps} />;
}

function HeartPop({ ax, ay }: FxProps) {
  const ps = useMemo(() => {
    const r = rng(12);
    return [
      { spec: { x: ax, y: ay, w: 60, h: 60, k: { s: kf([0, 0.3], [0.35, 2.4]), o: kf([0, 0.9], [0.35, 0]) } }, look: ring('#FF6A95') },
      ...rise(r, { n: 9, x: [ax - 20, ax + 40], y: ay, dy: [120, 230], dx: [-10, 90], looks: [sprite('heart'), sprite('heartPink')], size: [16, 30], t0: [0, 0.4], dur: [0.5, 0.6], sway: 10, grow: [0.2, 1.1] }),
    ];
  }, [ax, ay]);
  return <Scene ps={ps} />;
}

function Steam({ ax, ay }: FxProps) {
  const ps = useMemo(() => {
    const r = rng(13);
    return [
      ...rise(r, { n: 6, x: [ax - 10, ax + 10], y: ay - 14, dy: [90, 150], dx: [-10, 30], looks: [sprite('smoke')], size: [26, 40], t0: [0, 0.45], dur: [0.45, 0.55], sway: 12, grow: [0.4, 1.6] }),
      ...twinkle(r, { n: 5, x: [ax - 20, ax + 70], y: [ay - 110, ay - 10], looks: [dot('#FFD27A')], size: [5, 8], t0: [0.15, 0.75] }),
    ];
  }, [ax, ay]);
  return (
    <>
      <Glow x={ax} y={ay} size={110} color="#FFB347" k={{ o: kf([0, 0], [0.15, 0.8], [0.8, 0.5], [1, 0]) }} osc={[{ p: 's', a: 0.08, f: 3 }]} />
      <Scene ps={ps} />
    </>
  );
}

function KissFly({ W, ax, ay }: FxProps) {
  const tx = Math.min(W * 0.42, 190);
  const ps = useMemo(() => {
    const r = rng(14);
    return burst(r, { n: 8, cx: ax + tx, cy: ay - 110, looks: [sprite('heart'), sprite('heartPink')], dist: [40, 80], size: [12, 20], t0: [0.45, 0.5], dur: [0.35, 0.45], grav: -30, grow: [0.5, 1] });
  }, [ax, ay, tx]);
  return (
    <>
      <Layer x={ax + tx} y={ay - 110} w={84} h={63} k={{ s: kf([0, 0], [0.44, 0], [0.48, 1.6], [0.56, 1]), o: kf([0, 0], [0.44, 0], [0.46, 0.9], [0.85, 0.9], [1, 0]), r: kf([0.44, -12], [1, -12]) }}>
        <Sprite xml={PART.lipPrint} w={84} h={63} />
      </Layer>
      <Layer x={ax} y={ay} w={64} h={64} k={{ x: kf([0, 0], [0.45, tx]), y: kf([0, 0], [0.2, -70], [0.45, -110]), s: kf([0, 0.5], [0.4, 1.5], [0.45, 1.2], [0.5, 0]), r: kf([0, -25], [0.45, 12]), o: kf([0, 0], [0.05, 1], [0.45, 1], [0.5, 0]) }}>
        <Sprite xml={art('kiss')} w={64} />
      </Layer>
      <Scene ps={ps} />
    </>
  );
}

function SeedBurst({ ax, ay }: FxProps) {
  const ps = useMemo(() => {
    const r = rng(15);
    return [
      { spec: { x: ax, y: ay, w: 70, h: 70, k: { s: kf([0, 0.2], [0.25, 1.8]), o: kf([0, 0.9], [0.25, 0]) } }, look: dot('rgba(255,90,110,0.55)') },
      ...burst(r, { n: 16, cx: ax, cy: ay, looks: [sprite('seed')], dist: [70, 170], size: [9, 14], t0: [0.02, 0.15], dur: [0.55, 0.7], angle: [-110, 40], grav: 160, spin: 360, grow: [1, 1] }),
      ...twinkle(r, { n: 5, x: [ax, ax + 140], y: [ay - 90, ay + 30], looks: [dot('#FFE08A')], size: [5, 8], t0: [0.05, 0.5] }),
    ];
  }, [ax, ay]);
  return <Scene ps={ps} />;
}

function SugarHop({ ax, ay }: FxProps) {
  const ps = useMemo(() => {
    const r = rng(16);
    return [
      ...fall(r, { n: 14, W: 0, H: 0, x: [ax + 10, ax + 150], yFrom: ay - 80, yTo: ay + 40, looks: [dot('#FFFFFF', false), dot('#FFF3D6', false)], size: [3, 5], t0: [0.1, 0.6], dur: [0.3, 0.4], sway: 6 }),
      ...burst(r, { n: 8, cx: ax + 150, cy: ay, looks: [sprite('starGold')], dist: [30, 60], size: [10, 16], t0: [0.72, 0.75], dur: [0.22, 0.25], angle: [-170, -10], grow: [0.5, 1] }),
    ];
  }, [ax, ay]);
  return (
    <>
      <Layer x={ax} y={ay} w={58} h={58} k={{ x: kf([0, 0], [0.75, 150]), y: kf([0, 0], [0.2, -90], [0.4, 0], [0.55, -50], [0.72, 0], [0.8, -12], [0.86, 0]), r: kf([0, 0], [0.4, 180], [0.72, 360]), sy: kf([0.38, 1], [0.41, 0.75], [0.46, 1], [0.7, 1], [0.73, 0.8], [0.78, 1]), o: kf([0, 0], [0.05, 1], [0.9, 1], [1, 0]) }}>
        <Sprite xml={art('shekerbura')} w={58} />
      </Layer>
      <Scene ps={ps} />
    </>
  );
}

function ChocoZigzag({ ax, ay }: FxProps) {
  const ps = useMemo(() => {
    const r = rng(17);
    return rise(r, { n: 9, x: [ax, ax + 30], y: ay, dy: [160, 240], dx: [20, 110], looks: [sprite('heartPink'), sprite('starGold'), sprite('heart')], size: [14, 24], t0: [0, 0.45], dur: [0.45, 0.55], sway: 22, swayF: 2.2, spin: 30, grow: [0.3, 1] });
  }, [ax, ay]);
  return <Scene ps={ps} />;
}

function MiniSpark({ ax, ay }: FxProps) {
  const ps = useMemo(() => burst(rng(18), { n: 10, cx: ax, cy: ay, looks: [sprite('starGold'), dot('#FFE08A')], dist: [50, 110], size: [8, 14], t0: [0, 0.15], dur: [0.5, 0.6], angle: [-120, 60], grav: 40, spin: 180 }), [ax, ay]);
  return <Scene ps={ps} />;
}

/* ═════════════ ORTA (mərkəz) ═════════════ */

function ButaSpin({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const ps = useMemo(() => {
    const r = rng(21);
    return [
      ...orbit({ n: 16, cx, cy, rx: U * 0.42, ry: U * 0.42, turns: 0.5, looks: [dot('#FFD54A')], size: 7, t0: 0.15, t1: 0.9 }),
      ...orbit({ n: 3, cx, cy, rx: U * 0.55, ry: U * 0.2, turns: 0.8, looks: [xmlLook(art('buta'))], size: U * 0.14, t0: 0.25, t1: 0.88 }),
      ...twinkle(r, { n: 10, x: [cx - U * 0.5, cx + U * 0.5], y: [cy - U * 0.5, cy + U * 0.5], looks: [dot('#FFE08A'), sprite('starGold')], size: [8, 16], t0: [0.2, 0.85] }),
      ...burst(r, { n: 14, cx, cy, looks: [sprite('petal'), sprite('starGold')], dist: [U * 0.5, U * 0.8], size: [14, 22], t0: [0.18, 0.22], dur: [0.5, 0.6], grav: 60, spin: 300 }),
    ];
  }, [cx, cy, U]);
  return (
    <>
      <Layer x={cx} y={cy} w={U * 1.6} h={U * 1.6} k={{ o: kf([0, 0], [0.15, 0.8], [0.85, 0.8], [1, 0]), r: kf([0, 0], [1, 90]) }}><Sprite xml={PART.raysPink} w={U * 1.6} /></Layer>
      <Glow x={cx} y={cy} size={U * 1.1} color="#FF5A6E" k={{ o: kf([0, 0], [0.2, 0.9], [0.85, 0.7], [1, 0]) }} osc={[{ p: 's', a: 0.06, f: 4 }]} />
      <Scene ps={ps} />
      <Layer x={cx} y={cy} w={U * 0.62} h={U * 0.62} k={{ s: kf([0, 0], [0.18, 1.15], [0.26, 1], [0.86, 1], [1, 0.4]), r: kf([0, -270], [0.26, 0]), o: outro() }} osc={[{ p: 's', a: 0.035, f: 3 }]}>
        <Sprite xml={art('buta')} w={U * 0.62} />
      </Layer>
    </>
  );
}

function TeddyDrop({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.64;
  const ps = useMemo(() => {
    const r = rng(22);
    return [
      ...rise(r, { n: 12, x: [cx - S * 0.4, cx + S * 0.4], y: cy - S * 0.1, dy: [U * 0.5, U * 0.8], dx: [-40, 40], looks: [sprite('heart'), sprite('heartPink')], size: [18, 32], t0: [0.3, 0.75], dur: [0.25, 0.3], sway: 14, grow: [0.3, 1] }),
      ...burst(r, { n: 10, cx, cy: cy + S * 0.45, looks: [dot('#FFE7C4', false)], dist: [40, 90], size: [6, 10], t0: [0.2, 0.22], dur: [0.2, 0.26], angle: [-170, -10], grav: 30 }),
    ];
  }, [cx, cy, S, U]);
  return (
    <>
      <Glow x={cx} y={cy} size={U * 1.1} color="#FFB37A" k={{ o: kf([0, 0], [0.22, 0.85], [0.85, 0.7], [1, 0]) }} />
      <Layer x={cx} y={cy + S * 0.5} w={S * 0.8} h={S * 0.12} k={{ o: kf([0, 0], [0.2, 0.5], [0.88, 0.5], [1, 0]), sx: kf([0, 0.3], [0.2, 1], [0.26, 0.8], [0.32, 1]) }}>
        <View style={{ flex: 1, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)' }} />
      </Layer>
      <Layer x={cx} y={cy} w={S} h={S} k={{ y: kf([0, -H * 0.7], [0.2, 0], [0.26, -26], [0.32, 0], [0.88, 0], [1, 30]), sy: kf([0.19, 1], [0.21, 0.8], [0.25, 1.06], [0.32, 1]), o: outro(0.88), s: kf([0.88, 1], [1, 0.6]) }} osc={[{ p: 'r', a: 5, f: 4 }]}>
        <Sprite xml={art('teddy')} w={S} />
      </Layer>
      <Scene ps={ps} />
    </>
  );
}

function BouquetBloom({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.66;
  const ps = useMemo(() => {
    const r = rng(23);
    const sp: P[] = [];
    for (let i = 0; i < 22; i++) {
      const a = i * 137.5;
      sp.push(...burst(r, { n: 1, cx, cy: cy - S * 0.2, looks: [sprite(i % 2 ? 'petal' : 'petalPink')], dist: [U * 0.45, U * 0.85], size: [14, 24], t0: [0.25 + i * 0.018, 0.26 + i * 0.018], dur: [0.45, 0.55], angle: [a, a + 1], grav: 50, spin: 360, sway: 6 }));
    }
    return [...sp, ...twinkle(r, { n: 10, x: [cx - U * 0.5, cx + U * 0.5], y: [cy - U * 0.55, cy + U * 0.3], looks: [dot('#FFFFFF'), dot('#FFD1DC')], size: [5, 9], t0: [0.25, 0.85] })];
  }, [cx, cy, S, U]);
  return (
    <>
      <Glow x={cx} y={cy - S * 0.1} size={U * 1.15} color="#FF6A95" k={{ o: kf([0, 0], [0.2, 0.85], [0.85, 0.7], [1, 0]) }} osc={[{ p: 's', a: 0.05, f: 3 }]} />
      <Scene ps={ps} />
      <Layer x={cx} y={cy} w={S} h={S} k={{ y: kf([0, H * 0.45], [0.2, 0]), s: kf([0, 0.4], [0.2, 1.06], [0.28, 1], [0.86, 1], [1, 0.7]), o: kf([0, 0], [0.05, 1], [0.86, 1], [1, 0]) }} osc={[{ p: 'r', a: 3, f: 2 }]}>
        <Sprite xml={art('bouquet')} w={S} />
      </Layer>
    </>
  );
}

function TarMusic({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.62;
  const ps = useMemo(() => {
    const r = rng(24);
    return [
      ...rise(r, { n: 14, x: [cx + S * 0.05, cx + S * 0.2], y: cy - S * 0.05, dy: [U * 0.35, U * 0.7], dx: [W * 0.25, W * 0.55], looks: [sprite('note')], size: [20, 34], t0: [0.18, 0.72], dur: [0.25, 0.32], sway: 16, swayF: 2, spin: 20, grow: [0.4, 1] }),
      ...twinkle(r, { n: 10, x: [cx - U * 0.2, cx + U * 0.6], y: [cy - U * 0.5, cy + U * 0.2], looks: [dot('#FFD27A')], size: [5, 9], t0: [0.2, 0.85] }),
    ];
  }, [cx, cy, S, U, W]);
  return (
    <>
      <Glow x={cx} y={cy} size={U * 1.15} color="#FFB347" k={{ o: kf([0, 0], [0.2, 0.85], [0.85, 0.7], [1, 0]) }} osc={[{ p: 's', a: 0.07, f: 8 }]} />
      <Layer x={cx - S * 0.12} y={cy} w={S} h={S} k={{ x: kf([0, -W * 0.7], [0.18, 0], [0.86, 0], [1, -W * 0.15]), r: kf([0, -30], [0.18, 0]), o: kf([0, 0], [0.04, 1], [0.86, 1], [1, 0]) }} osc={[{ p: 'r', a: 4, f: 6 }, { p: 's', a: 0.03, f: 8 }]}>
        <Sprite xml={art('tar')} w={S} />
      </Layer>
      <Scene ps={ps} />
    </>
  );
}

function PerfumeMist({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.56;
  const ps = useMemo(() => {
    const r = rng(25);
    const mist: P[] = [];
    for (const t0 of [0.24, 0.44, 0.64]) {
      mist.push(...rise(r, { n: 3, x: [cx + S * 0.25, cx + S * 0.3], y: cy - S * 0.3, dy: [-20, 40], dx: [U * 0.35, U * 0.7], looks: [sprite('pinkMist')], size: [U * 0.3, U * 0.4], t0: [t0, t0 + 0.04], dur: [0.3, 0.36], grow: [0.3, 2] }));
    }
    return [
      ...mist,
      ...twinkle(r, { n: 22, x: [cx, cx + U * 0.65], y: [cy - U * 0.45, cy + U * 0.05], looks: [dot('#FFFFFF'), dot('#FFD1E8'), sprite('starGold')], size: [5, 12], t0: [0.25, 0.88] }),
      ...rise(r, { n: 6, x: [cx + U * 0.1, cx + U * 0.5], y: cy, dy: [U * 0.3, U * 0.6], looks: [sprite('heartPink')], size: [14, 24], t0: [0.4, 0.7], dur: [0.25, 0.3], sway: 10 }),
    ];
  }, [cx, cy, S, U]);
  const squeeze = kf([0, 0], [0.12, 1.08], [0.18, 1], [0.24, 1], [0.26, 0.94], [0.3, 1], [0.44, 1], [0.46, 0.94], [0.5, 1], [0.64, 1], [0.66, 0.94], [0.7, 1], [0.88, 1], [1, 0.6]);
  return (
    <>
      <Glow x={cx - S * 0.2} y={cy} size={U} color="#FF6FB0" k={{ o: kf([0, 0], [0.15, 0.8], [0.85, 0.6], [1, 0]) }} />
      <Layer x={cx - S * 0.25} y={cy} w={S} h={S} k={{ s: squeeze, o: outro(0.88) }}><Sprite xml={art('perfume')} w={S} /></Layer>
      <Scene ps={ps} />
    </>
  );
}

function ChampagnePop({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.62;
  const px = cx - S * 0.2, py = cy - S * 0.38;
  const ps = useMemo(() => {
    const r = rng(26);
    return [
      ...burst(r, { n: 34, cx: px, cy: py, looks: [dot('#FFF0B8'), dot('#FFFFFF'), dot('#FFD54A')], dist: [U * 0.3, U * 0.75], size: [5, 11], t0: [0.28, 0.5], dur: [0.3, 0.4], angle: [-125, -50], grav: U * 0.7, grow: [1, 1] }),
      ...fall(r, { n: 28, W, H, looks: ['#F2344F', '#FFD54A', '#8ED1FF', '#D9F26B', '#CDB8FF', '#FFFFFF'].map(chip), size: [6, 10], aspect: 1.8, t0: [0.3, 0.75], dur: [0.3, 0.45], spin: 400 }),
    ];
  }, [px, py, U, W, H]);
  return (
    <>
      <Glow x={cx} y={cy} size={U * 1.1} color="#FFD54A" k={{ o: kf([0, 0], [0.2, 0.6], [0.3, 1], [0.85, 0.6], [1, 0]) }} />
      <Layer x={px} y={py} w={U * 0.5} h={U * 0.5} k={{ s: kf([0.28, 0.1], [0.36, 1.6]), o: kf([0, 0], [0.28, 0], [0.29, 0.9], [0.38, 0]) }}><Sprite xml={glowXml('#FFFFFF')} w={U * 0.5} /></Layer>
      <Layer x={px} y={py} w={22} h={25} k={{ y: kf([0.28, 0], [0.42, -H * 0.5]), x: kf([0.28, 0], [0.42, -30]), r: kf([0.28, 0], [0.42, -540]), o: kf([0, 0], [0.28, 0], [0.285, 1], [0.42, 1], [0.43, 0]) }}><Sprite xml={PART.cork} w={22} h={25} /></Layer>
      <Layer x={cx} y={cy} w={S} h={S} k={{ s: pulseIn(0), r: kf([0.06, 0], [0.09, -7], [0.12, 7], [0.15, -7], [0.18, 7], [0.21, -7], [0.24, 7], [0.28, 0], [0.32, -4], [0.36, 0]), o: outro(0.86) }}>
        <Sprite xml={art('champagne')} w={S} />
      </Layer>
      <Scene ps={ps} />
    </>
  );
}

function RingReveal({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.66;
  const ps = useMemo(() => {
    const r = rng(27);
    return [
      ...burst(r, { n: 12, cx, cy, looks: [sprite('heart'), sprite('heartGold')], dist: [U * 0.4, U * 0.7], size: [16, 28], t0: [0.25, 0.3], dur: [0.45, 0.55], grav: 40, spin: 60 }),
      ...fall(r, { n: 20, W, H, x: [cx - U * 0.6, cx + U * 0.6], looks: [dot('#FFE08A'), dot('#FFFFFF')], size: [3, 6], t0: [0.25, 0.75], dur: [0.3, 0.4], sway: 8 }),
    ];
  }, [cx, cy, U, W, H]);
  const sparkleK = kf([0, 0], [0.3, 0], [0.36, 1.4], [0.42, 0.2], [0.5, 1.2], [0.56, 0.2], [0.66, 1.3], [0.72, 0]);
  return (
    <>
      <Layer x={cx} y={cy} w={U * 1.7} h={U * 1.7} k={{ o: kf([0, 0], [0.15, 0.9], [0.85, 0.9], [1, 0]), r: kf([0, 0], [1, 70]), s: kf([0, 0.5], [0.2, 1]) }}><Sprite xml={PART.raysGold} w={U * 1.7} /></Layer>
      <Glow x={cx} y={cy} size={U} color="#FFD54A" k={{ o: kf([0, 0], [0.2, 0.8], [0.85, 0.6], [1, 0]) }} />
      <Layer x={cx} y={cy} w={S} h={S} k={{ s: kf([0, 0], [0.15, 1.12], [0.22, 1], [0.86, 1], [1, 0.5]), o: outro() }} osc={[{ p: 'y', a: 6, f: 2 }]}><Sprite xml={art('ring')} w={S} /></Layer>
      <Layer x={cx + S * 0.0} y={cy - S * 0.22} w={70} h={70} k={{ s: sparkleK, r: kf([0.3, 0], [0.72, 180]) }}><Sprite xml={PART.starGold} w={70} /></Layer>
      <Scene ps={ps} />
    </>
  );
}

function FireworksShow({ W, H }: FxProps) {
  const ps = useMemo(() => {
    const r = rng(28);
    const pal = [['#FFD166', '#FF8FA3'], ['#7DD3FC', '#C4B5FD'], ['#F472B6', '#FDE68A'], ['#86EFAC', '#FFFFFF'], ['#FCA5A5', '#FFD54A']];
    const pts: [number, number, number][] = [[0.3, 0.3, 0.02], [0.72, 0.24, 0.14], [0.5, 0.4, 0.26], [0.22, 0.48, 0.38], [0.78, 0.46, 0.5], [0.5, 0.22, 0.6]];
    return [
      ...pts.flatMap(([fx, fy, t], i) => firework(r, { cx: W * fx, cy: H * fy, H, t, colors: pal[i % pal.length], radius: Math.min(W, H) * 0.2 })),
      ...fall(r, { n: 24, W, H, yFrom: H * 0.2, looks: [dot('#FFE08A'), dot('#FFFFFF')], size: [2.5, 4.5], t0: [0.3, 0.8], dur: [0.25, 0.35], sway: 6 }),
    ];
  }, [W, H]);
  return <Scene ps={ps} />;
}

function CrystalHeart({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.6;
  const ps = useMemo(() => {
    const r = rng(29);
    return [
      ...burst(r, { n: 16, cx, cy, looks: [sprite('starBlue'), dot('#BFE3FF')], dist: [U * 0.45, U * 0.75], size: [10, 20], t0: [0.2, 0.24], dur: [0.45, 0.55], grav: 30, spin: 200 }),
      ...twinkle(r, { n: 12, x: [cx - U * 0.5, cx + U * 0.5], y: [cy - U * 0.5, cy + U * 0.5], looks: [dot('#FFFFFF'), dot('#8FD0FF')], size: [5, 10], t0: [0.2, 0.85] }),
    ];
  }, [cx, cy, U]);
  return (
    <>
      <Layer x={cx} y={cy} w={U * 1.6} h={U * 1.6} k={{ o: kf([0, 0], [0.15, 0.9], [0.85, 0.9], [1, 0]), r: kf([0, 0], [1, -70]) }}><Sprite xml={PART.raysBlue} w={U * 1.6} /></Layer>
      <Glow x={cx} y={cy} size={U} color="#4FA8FF" k={{ o: kf([0, 0], [0.2, 0.9], [0.85, 0.6], [1, 0]) }} osc={[{ p: 's', a: 0.06, f: 3 }]} />
      <Layer x={cx} y={cy} w={S} h={S} k={{ s: kf([0, 0.2], [0.15, 1.12], [0.22, 1], [0.86, 1], [1, 0.4]), sx: kf([0.22, 1], [0.32, -1], [0.42, 1], [0.6, 1], [0.7, -1], [0.8, 1]), o: outro() }}><Sprite xml={art('diamond_heart')} w={S} /></Layer>
      <Scene ps={ps} />
    </>
  );
}

function BigPop({ W, H, giftId }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const ps = useMemo(() => burst(rng(30), { n: 16, cx, cy, looks: [sprite('starGold'), dot('#FFE08A')], dist: [U * 0.4, U * 0.7], size: [10, 18], t0: [0.18, 0.22], dur: [0.45, 0.55], grav: 40, spin: 200 }), [cx, cy, U]);
  return (
    <>
      <Layer x={cx} y={cy} w={U * 1.5} h={U * 1.5} k={{ o: kf([0, 0], [0.15, 0.8], [0.85, 0.8], [1, 0]), r: kf([0, 0], [1, 60]) }}><Sprite xml={PART.raysGold} w={U * 1.5} /></Layer>
      <Layer x={cx} y={cy} w={U * 0.6} h={U * 0.6} k={{ s: kf([0, 0], [0.15, 1.15], [0.22, 1], [0.86, 1], [1, 0.4]), o: outro() }} osc={[{ p: 'y', a: 6, f: 2 }]}><Sprite xml={art(giftId)} w={U * 0.6} /></Layer>
      <Scene ps={ps} />
    </>
  );
}

/* ═════════════ TAM EKRAN ═════════════ */

function CrownDescend({ W, H, variant }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const blue = variant === 'blue';
  const S = U * 0.74;
  const ps = useMemo(() => {
    const r = rng(blue ? 41 : 31);
    return [
      ...fall(r, { n: 46, W, H, looks: blue ? [dot('#BFE3FF'), dot('#FFFFFF'), sprite('starBlue')] : [dot('#FFE08A'), dot('#FFC23D'), sprite('starGold')], size: [4, 10], t0: [0.2, 0.75], dur: [0.25, 0.4], sway: 10 }),
      ...burst(r, { n: 14, cx, cy, looks: [sprite(blue ? 'starBlue' : 'starGold')], dist: [U * 0.45, U * 0.8], size: [14, 26], t0: [0.26, 0.3], dur: [0.4, 0.5], grav: 40, spin: 220 }),
      ...twinkle(r, { n: 14, x: [cx - U * 0.55, cx + U * 0.55], y: [cy - U * 0.45, cy + U * 0.35], looks: [dot('#FFFFFF')], size: [6, 12], t0: [0.3, 0.88] }),
    ];
  }, [cx, cy, U, W, H, blue]);
  return (
    <>
      <Layer x={cx} y={cy} w={U * 2.4} h={U * 2.4} k={{ o: kf([0, 0], [0.2, 0.9], [0.88, 0.9], [1, 0]), r: kf([0, 0], [1, 60]), s: kf([0, 0.4], [0.28, 1]) }}><Sprite xml={blue ? PART.raysBlue : PART.raysGold} w={U * 2.4} /></Layer>
      <Glow x={cx} y={cy} size={U * 1.3} color={blue ? '#4FA8FF' : '#FFD54A'} k={{ o: kf([0, 0], [0.24, 0.5], [0.28, 1], [0.88, 0.7], [1, 0]) }} osc={[{ p: 's', a: 0.05, f: 4 }]} />
      <Layer x={cx} y={cy} w={U * 0.5} h={U * 0.5} k={{ s: kf([0.25, 0.2], [0.33, 3]), o: kf([0, 0], [0.25, 0], [0.26, 0.85], [0.34, 0]) }}><Sprite xml={glowXml('#FFFFFF')} w={U * 0.5} /></Layer>
      <Layer x={cx} y={cy} w={S} h={S} k={{ y: kf([0, -H * 0.65], [0.25, 0], [0.88, 0], [1, -20]), r: kf([0, -22], [0.25, 0], [0.3, 6], [0.36, -4], [0.42, 0]), s: kf([0.88, 1], [1, 0.7]), o: kf([0, 0], [0.04, 1], [0.88, 1], [1, 0]) }} osc={[{ p: 'y', a: 5, f: 3 }]}>
        <Sprite xml={art(blue ? 'diamond_crown' : 'crown')} w={S} />
      </Layer>
      <Scene ps={ps} />
    </>
  );
}

function CaspianSunset({ W, H }: FxProps) {
  const { U } = geo(W, H);
  const seaY = H * 0.62;
  const ps = useMemo(() => {
    const r = rng(32);
    return [
      ...twinkle(r, { n: 22, x: [W * 0.3, W * 0.7], y: [seaY + 10, seaY + H * 0.12], looks: [dot('#FFE7A0')], size: [3, 7], t0: [0.1, 0.88], dur: [0.08, 0.16] }),
      ...twinkle(r, { n: 10, x: [0, W], y: [H * 0.05, H * 0.3], looks: [dot('#FFFFFF', false)], size: [2, 4], t0: [0.05, 0.85], dur: [0.3, 0.5] }),
    ];
  }, [W, H, seaY]);
  const waveX = (sp: number): KF => kf([0, 0], [1, -W * sp]);
  return (
    <>
      <Backdrop W={W} H={H} xml={PART.caspianSky} opacity={0.97} />
      <Layer x={W / 2} y={seaY - U * 0.05} w={U * 1.1} h={U * 1.1} k={{ y: kf([0, -H * 0.12], [1, U * 0.16]), o: showFrom(0.02, 1, 0.1, 0.1) }}><Sprite xml={PART.sun} w={U * 1.1} /></Layer>
      <Layer x={W * 0.24} y={seaY - U * 0.2} w={U * 0.42} h={U * 0.58} k={{ y: kf([0, U * 0.3], [0.2, 0]), o: showFrom(0.04, 1, 0.12, 0.1) }}><Sprite xml={PART.towersSil} w={U * 0.42} h={U * 0.58} /></Layer>
      <Layer x={W} y={seaY + H * 0.2} w={W * 2} h={H * 0.42} k={{ x: waveX(0.5), o: showFrom(0, 1, 0.08, 0.1) }}><Sprite xml={PART.wave} w={W * 2} h={H * 0.42} /></Layer>
      <Scene ps={ps} />
      <Layer x={W} y={seaY + H * 0.3} w={W * 2} h={H * 0.3} k={{ x: waveX(0.9), o: kf([0, 0], [0.08, 0.85], [0.9, 0.85], [1, 0]) }}><Sprite xml={PART.wave} w={W * 2} h={H * 0.3} /></Layer>
      {[0, 1, 2].map((i) => (
        <Layer key={i} x={-40} y={H * (0.16 + i * 0.07)} w={44 - i * 8} h={22 - i * 4} k={{ x: kf([0.05 + i * 0.12, 0], [0.75 + i * 0.08, W + 80]), o: showFrom(0.05 + i * 0.12, 0.83 + i * 0.05, 0.02, 0.02) }} osc={[{ p: 'sy', a: 0.45, f: 14 + i * 3 }, { p: 'y', a: 10, f: 2, ph: i * 0.3 }]}>
          <Sprite xml={PART.gull} w={44 - i * 8} h={22 - i * 4} />
        </Layer>
      ))}
      <Layer x={W / 2} y={H * 0.36} w={U * 0.5} h={U * 0.5} k={{ s: kf([0, 0], [0.6, 0], [0.7, 1.1], [0.76, 1]), o: kf([0, 0], [0.6, 0], [0.62, 1], [0.9, 1], [1, 0]) }} osc={[{ p: 'y', a: 5, f: 2 }]}>
        <Sprite xml={art('caspian')} w={U * 0.5} />
      </Layer>
    </>
  );
}

function TowerRise({ W, H }: FxProps) {
  const { cx, U } = geo(W, H);
  const S = U * 0.95;
  const by = H * 0.52;
  const ps = useMemo(() => {
    const r = rng(33);
    return [
      ...twinkle(r, { n: 30, x: [0, W], y: [0, H * 0.5], looks: [dot('#FFFFFF', false), dot('#FFE7A0')], size: [2, 5], t0: [0.05, 0.88], dur: [0.2, 0.4] }),
      ...firework(r, { cx: W * 0.22, cy: H * 0.2, H, t: 0.32, colors: ['#00B5E2', '#FFFFFF'], radius: U * 0.22, z: 0 }),
      ...firework(r, { cx: W * 0.8, cy: H * 0.17, H, t: 0.45, colors: ['#EF3340', '#FFD54A'], radius: U * 0.22, z: 0 }),
      ...firework(r, { cx: W * 0.5, cy: H * 0.1, H, t: 0.58, colors: ['#509E2F', '#FFFFFF'], radius: U * 0.25, z: 0 }),
    ];
  }, [W, H, U]);
  return (
    <>
      <Backdrop W={W} H={H} xml={PART.nightSky} opacity={0.95} />
      <Layer x={W * 0.8} y={H * 0.1} w={U * 0.3} h={U * 0.3} k={{ o: showFrom(0.06, 1, 0.12, 0.1), y: kf([0, 30], [0.25, 0]) }}><Sprite xml={PART.moon} w={U * 0.3} /></Layer>
      <Scene ps={ps} />
      <Glow x={cx} y={by} size={U * 1.3} color="#FFB25A" k={{ o: kf([0, 0], [0.3, 0.8], [0.9, 0.7], [1, 0]) }} osc={[{ p: 's', a: 0.04, f: 3 }]} />
      <Layer x={cx} y={by} w={S} h={S * (132 / 128)} k={{ y: kf([0, H * 0.7], [0.28, 0], [0.31, 8], [0.34, 0]), o: kf([0, 0], [0.05, 1], [0.9, 1], [1, 0]) }}>
        <Sprite xml={PART.maidenTower} w={S} h={S * (132 / 128)} />
      </Layer>
    </>
  );
}

function FlameTowers({ W, H }: FxProps) {
  const { cx, U } = geo(W, H);
  const S = U * 1.0;
  const by = H * 0.55;
  const tips: [number, number, number][] = [[40, 30, 0.7], [64, 4, 1], [100, 42, 0.62]];
  const ps = useMemo(() => {
    const r = rng(34);
    return [
      ...twinkle(r, { n: 24, x: [0, W], y: [0, H * 0.45], looks: [dot('#FFFFFF', false)], size: [2, 4], t0: [0.05, 0.88], dur: [0.2, 0.4] }),
      ...rise(r, { n: 26, x: [cx - S * 0.4, cx + S * 0.4], y: by + S * 0.2, dy: [S * 0.5, S * 1.1], dx: [-30, 30], looks: [dot('#FFB020'), dot('#FF5A1F'), dot('#FFE27A')], size: [3, 7], t0: [0.25, 0.85], dur: [0.2, 0.3], sway: 8, grow: [1, 0.6] }),
      ...firework(r, { cx: W * 0.25, cy: H * 0.14, H, t: 0.38, colors: ['#FFD166', '#FF8A3D'], radius: U * 0.22 }),
      ...firework(r, { cx: W * 0.75, cy: H * 0.12, H, t: 0.5, colors: ['#FF5A1F', '#FFF3C4'], radius: U * 0.24 }),
      ...firework(r, { cx: W * 0.5, cy: H * 0.06, H, t: 0.62, colors: ['#FFE27A', '#FF4D7E'], radius: U * 0.22 }),
    ];
  }, [W, H, U, cx, S, by]);
  const rise0: KF = kf([0, H * 0.7], [0.26, 0]);
  return (
    <>
      <Backdrop W={W} H={H} xml={PART.nightSky} opacity={0.95} />
      <Glow x={cx} y={by + S * 0.25} size={S * 1.5} color="#FF8A3D" k={{ o: kf([0, 0], [0.3, 0.9], [0.9, 0.8], [1, 0]) }} osc={[{ p: 's', a: 0.06, f: 6 }]} />
      <Layer x={cx} y={by} w={S} h={S} k={{ y: rise0, o: kf([0, 0], [0.05, 1], [0.9, 1], [1, 0]) }}><Sprite xml={PART.flameTowers} w={S} /></Layer>
      {tips.map(([tx, ty, sc], i) => {
        const fw = S * 0.2 * sc;
        return (
          <Layer key={i} x={cx - S / 2 + (tx / 128) * S} y={by - S / 2 + (ty / 128) * S - fw * 0.55} w={fw} h={fw * 1.5}
            k={{ y: rise0, s: kf([0, 0], [0.28, 0], [0.34, 1]), o: kf([0, 0], [0.28, 0], [0.3, 1], [0.9, 1], [1, 0]) }}
            osc={[{ p: 'sy', a: 0.14, f: 11 + i * 2 }, { p: 'sx', a: 0.07, f: 7 + i }, { p: 'r', a: 4, f: 5, ph: i * 0.3 }]}>
            <Sprite xml={PART.flame} w={fw} h={fw * 1.5} />
          </Layer>
        );
      })}
      <Scene ps={ps} />
    </>
  );
}

function CarDrive({ W, H }: FxProps) {
  const Wc = Math.min(W * 0.9, 400);
  const cx = W / 2, cy = H * 0.5;
  const X: KF = kf([0, -W * 0.95], [0.3, 0], [0.34, 10], [0.38, 0], [0.74, 0], [0.8, -14], [1, W * 1.1]);
  const R: KF = kf([0, 0], [0.3, 900], [0.38, 960], [0.74, 960], [0.8, 940], [1, 2400]);
  const wheelS = (32 / 136) * Wc;
  const wpos = (wx: number) => ({ x: cx - Wc / 2 + ((wx + 4) / 136) * Wc, y: cy - Wc / 2 + ((92 + 4) / 136) * Wc });
  const ps = useMemo(() => {
    const r = rng(35);
    const lines: P[] = Array.from({ length: 16 }, (_, i) => {
      const t0 = (i % 8) * 0.035 + (i < 8 ? 0 : 0.76);
      const y = cy - Wc * 0.25 + r() * Wc * 0.4;
      const len = 60 + r() * 120;
      const dir = i < 8 ? -1 : 1;
      return { spec: { x: W / 2, y, w: len, h: 3, k: { x: kf([t0, W * 0.6 * -dir], [t0 + 0.12, W * 0.6 * dir]), o: kf([0, 0], [t0, 0], [t0 + 0.01, 0.7], [t0 + 0.12, 0]) } }, look: chip('rgba(255,255,255,0.85)') };
    });
    const rear = cx - Wc * 0.45;
    return [
      ...lines,
      ...burst(r, { n: 8, cx: rear, cy: cy + Wc * 0.18, looks: [sprite('smoke')], dist: [30, 90], size: [40, 70], t0: [0.3, 0.34], dur: [0.3, 0.4], angle: [150, 210], grav: -20, grow: [0.4, 1.4] }),
      ...burst(r, { n: 8, cx: rear, cy: cy + Wc * 0.18, looks: [sprite('smoke')], dist: [40, 110], size: [40, 70], t0: [0.74, 0.78], dur: [0.2, 0.25], angle: [160, 200], grav: -20, grow: [0.4, 1.5] }),
      ...twinkle(r, { n: 12, x: [cx - Wc * 0.5, cx + Wc * 0.5], y: [cy - Wc * 0.4, cy + Wc * 0.1], looks: [sprite('starGold'), dot('#FFFFFF')], size: [8, 16], t0: [0.4, 0.7] }),
    ];
  }, [W, cx, cy, Wc]);
  const o: KF = kf([0, 1], [1, 1]);
  return (
    <>
      <Glow x={cx} y={cy} size={Wc * 1.2} color="#FF4D4D" k={{ o: kf([0, 0], [0.3, 0.6], [0.74, 0.6], [0.9, 0]) }} />
      <Layer x={cx} y={cy + Wc * 0.24} w={Wc * 0.9} h={Wc * 0.06} k={{ x: X, o: kf([0, 0.4], [1, 0.4]) }}><View style={{ flex: 1, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.45)' }} /></Layer>
      <Scene ps={ps} />
      <Layer x={cx} y={cy} w={Wc} h={Wc} k={{ x: X, o, r: kf([0.3, 0], [0.33, -2], [0.38, 0], [0.74, 0], [0.78, 2], [0.82, 0]) }} osc={[{ p: 'y', a: 1.5, f: 40 }]}>
        <Sprite xml={PART.carBody} w={Wc} />
      </Layer>
      {[34, 98].map((wx) => (
        <Layer key={wx} {...wpos(wx)} w={wheelS} h={wheelS} k={{ x: X, r: R, o }}><Sprite xml={PART.wheel} w={wheelS} /></Layer>
      ))}
      <Layer x={cx - Wc / 2 + (120 / 136) * Wc} y={cy - Wc / 2 + (79 / 136) * Wc} w={Wc * 0.35} h={Wc * 0.35} k={{ x: X, o: kf([0, 0], [0.42, 0], [0.45, 1], [0.5, 0.2], [0.53, 1], [0.6, 0]) }}><Sprite xml={glowXml('#FFF6C8')} w={Wc * 0.35} /></Layer>
    </>
  );
}

function RocketLaunch({ W, H }: FxProps) {
  const { cx, U } = geo(W, H);
  const S = U * 0.6;
  const base = H * 0.66;
  const Y: KF = kf([0, H * 0.5], [0.14, 0], [0.4, 0], [0.48, -H * 0.06], [0.56, -H * 0.22], [0.64, -H * 0.5], [0.74, -H * 1.1]);
  const X: KF = kf([0.16, 0], [0.18, -3], [0.2, 3], [0.22, -3], [0.24, 3], [0.26, -3], [0.28, 3], [0.3, -3], [0.32, 3], [0.34, -3], [0.36, 3], [0.38, -3], [0.4, 0]);
  const ps = useMemo(() => {
    const r = rng(36);
    const trail: P[] = [];
    const ys: [number, number][] = [[0.48, -H * 0.06], [0.52, -H * 0.13], [0.56, -H * 0.22], [0.6, -H * 0.35], [0.64, -H * 0.5], [0.68, -H * 0.72]];
    for (const [t, dy] of ys) trail.push(...rise(r, { n: 2, x: [cx - 8, cx + 8], y: base + S * 0.55 + dy, dy: [-10, 20], dx: [-30, 30], looks: [sprite('smoke')], size: [60, 90], t0: [t, t + 0.01], dur: [0.3, 0.36], grow: [0.5, 1.8] }));
    const streaks: P[] = Array.from({ length: 18 }, () => {
      const t0 = 0.5 + r() * 0.4;
      return { spec: { x: r() * W, y: -40, w: 2.5, h: 40 + r() * 50, k: { y: kf([t0, 0], [t0 + 0.12, H + 80]), o: kf([0, 0], [t0, 0], [t0 + 0.01, 0.8], [t0 + 0.12, 0]) } }, look: chip('rgba(255,255,255,0.8)') };
    });
    return [
      ...burst(r, { n: 14, cx, cy: base + S * 0.5, looks: [sprite('smoke')], dist: [U * 0.2, U * 0.55], size: [60, 100], t0: [0.18, 0.45], dur: [0.35, 0.45], angle: [150, 390], grav: -30, grow: [0.4, 1.6] }),
      ...trail,
      ...streaks,
      ...twinkle(r, { n: 16, x: [0, W], y: [0, H * 0.6], looks: [dot('#FFFFFF', false)], size: [2, 4], t0: [0.05, 0.9], dur: [0.2, 0.4] }),
    ];
  }, [W, H, U, cx, base, S]);
  return (
    <>
      <Backdrop W={W} H={H} color="rgba(10,14,40,0.55)" />
      <Scene ps={ps} />
      <Layer x={cx} y={base + S * 0.5 + S * 0.16} w={S * 0.38} h={S * 0.32} k={{ y: Y, x: X, s: kf([0.12, 0.5], [0.2, 1], [0.42, 1.2], [0.6, 2]), o: kf([0, 0], [0.12, 0], [0.16, 1], [0.74, 1], [0.75, 0]) }} osc={[{ p: 'sy', a: 0.18, f: 30 }]}>
        <Sprite xml={PART.rocketFlame} w={S * 0.38} h={S * 0.32} />
      </Layer>
      <Layer x={cx} y={base} w={S} h={S} k={{ y: Y, x: X, o: kf([0, 1], [0.74, 1], [0.75, 0]) }}><Sprite xml={PART.rocket} w={S} /></Layer>
    </>
  );
}

function YachtSail({ W, H }: FxProps) {
  const { cx, U } = geo(W, H);
  const S = U * 0.95;
  const seaY = H * 0.6;
  const ps = useMemo(() => {
    const r = rng(37);
    return [
      ...twinkle(r, { n: 24, x: [0, W], y: [seaY + 20, H * 0.85], looks: [dot('#FFFFFF'), dot('#BFE9FF')], size: [3, 6], t0: [0.05, 0.9], dur: [0.08, 0.16] }),
      ...burst(r, { n: 14, cx: cx + S * 0.38, cy: seaY + S * 0.06, looks: [dot('#FFFFFF', false), dot('#D6F2FF', false)], dist: [30, 70], size: [4, 8], t0: [0.3, 0.36], dur: [0.2, 0.25], angle: [-160, -20], grav: 60, grow: [1, 1] }),
    ];
  }, [W, H, cx, S, seaY]);
  return (
    <>
      <Backdrop W={W} H={H} color="rgba(8,30,60,0.45)" />
      <Glow x={W * 0.75} y={H * 0.16} size={U * 0.8} color="#FFD56A" k={{ o: showFrom(0.05, 1, 0.1, 0.1) }} />
      <Layer x={W} y={seaY + H * 0.22} w={W * 2} h={H * 0.44} k={{ x: kf([0, 0], [1, -W * 0.6]), o: showFrom(0, 1, 0.08, 0.1) }}><Sprite xml={PART.wave} w={W * 2} h={H * 0.44} /></Layer>
      <Layer x={cx} y={seaY - S * 0.18} w={S} h={S} k={{ x: kf([0, W * 0.9], [0.32, 0], [0.72, 0], [1, -W * 0.95]), o: kf([0, 1], [1, 1]) }} osc={[{ p: 'y', a: 7, f: 4 }, { p: 'r', a: 2.5, f: 4, ph: 0.25 }]}>
        <Sprite xml={PART.yachtBoat} w={S} />
      </Layer>
      <Scene ps={ps} />
      <Layer x={W} y={seaY + H * 0.3} w={W * 2} h={H * 0.3} k={{ x: kf([0, -W * 0.3], [1, -W * 1.2]), o: kf([0, 0], [0.08, 0.8], [0.9, 0.8], [1, 0]) }}><Sprite xml={PART.wave} w={W * 2} h={H * 0.3} /></Layer>
      {[0, 1].map((i) => (
        <Layer key={i} x={W + 40} y={H * (0.2 + i * 0.08)} w={40 - i * 8} h={20 - i * 4} k={{ x: kf([0.1 + i * 0.15, 0], [0.8 + i * 0.1, -W - 80]) }} osc={[{ p: 'sy', a: 0.45, f: 16 + i * 3 }, { p: 'y', a: 8, f: 2 }]}>
          <Sprite xml={PART.gull} w={40 - i * 8} h={20 - i * 4} />
        </Layer>
      ))}
    </>
  );
}

function PalaceRise({ W, H }: FxProps) {
  const { cx, U } = geo(W, H);
  const S = U * 0.95;
  const by = H * 0.5;
  const ps = useMemo(() => {
    const r = rng(38);
    return [
      ...firework(r, { cx: W * 0.2, cy: H * 0.18, H, t: 0.3, colors: ['#FFD166', '#FF8FA3'], radius: U * 0.22, z: 0 }),
      ...firework(r, { cx: W * 0.8, cy: H * 0.16, H, t: 0.4, colors: ['#7DD3FC', '#C4B5FD'], radius: U * 0.22, z: 0 }),
      ...firework(r, { cx: W * 0.32, cy: H * 0.08, H, t: 0.52, colors: ['#F472B6', '#FDE68A'], radius: U * 0.2, z: 0 }),
      ...firework(r, { cx: W * 0.7, cy: H * 0.06, H, t: 0.62, colors: ['#86EFAC', '#FFFFFF'], radius: U * 0.2, z: 0 }),
      ...fall(r, { n: 36, W, H, looks: ['#F2344F', '#FFD54A', '#8ED1FF', '#D9F26B', '#CDB8FF', '#FFFFFF'].map(chip), size: [6, 10], aspect: 1.8, t0: [0.32, 0.8], dur: [0.25, 0.4], spin: 400 }),
    ];
  }, [W, H, U]);
  return (
    <>
      <Layer x={cx} y={by} w={U * 2.4} h={U * 2.4} k={{ o: kf([0, 0], [0.25, 0.8], [0.9, 0.8], [1, 0]), r: kf([0, 0], [1, 50]) }}><Sprite xml={PART.raysGold} w={U * 2.4} /></Layer>
      <Glow x={cx} y={by} size={U * 1.3} color="#FFC24A" k={{ o: kf([0, 0], [0.3, 0.9], [0.9, 0.7], [1, 0]) }} />
      <Scene ps={ps} />
      <Layer x={cx} y={by} w={S} h={S} k={{ y: kf([0, H * 0.6], [0.28, 0], [0.31, 10], [0.34, 0]), s: kf([0, 0.8], [0.28, 1]), o: kf([0, 0], [0.05, 1], [0.9, 1], [1, 0]) }}><Sprite xml={PART.palace} w={S} /></Layer>
    </>
  );
}

function PlanetOrbit({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.78;
  const ps = useMemo(() => {
    const r = rng(39);
    return [
      ...twinkle(r, { n: 30, x: [0, W], y: [0, H], looks: [dot('#FFFFFF', false), dot('#FFD1E8')], size: [2, 5], t0: [0.02, 0.9], dur: [0.2, 0.4] }),
      ...fall(r, { n: 20, W, H, looks: [sprite('heart'), sprite('heartPink'), sprite('heartGold')], size: [14, 26], t0: [0.4, 0.8], dur: [0.3, 0.4], spin: 60, sway: 16 }),
    ];
  }, [W, H]);
  const orb = useMemo(() => orbit({ n: 10, cx, cy, rx: U * 0.55, ry: U * 0.16, turns: 1.6, looks: [sprite('heart'), sprite('heartGold'), sprite('heartPink')], size: 26, t0: 0.15, t1: 0.92 }), [cx, cy, U]);
  return (
    <>
      <Backdrop W={W} H={H} color="rgba(40,8,40,0.5)" />
      <Glow x={cx} y={cy} size={U * 1.4} color="#FF5FA2" k={{ o: kf([0, 0], [0.15, 0.9], [0.9, 0.8], [1, 0]) }} osc={[{ p: 's', a: 0.07, f: 4 }]} />
      <Scene ps={ps} />
      <Layer x={cx} y={cy} w={S} h={S} k={{ s: kf([0, 0], [0.14, 1.1], [0.2, 1], [0.9, 1], [1, 0.5]), o: kf([0, 0], [0.04, 1], [0.9, 1], [1, 0]) }} osc={[{ p: 'r', a: 4, f: 1 }, { p: 'y', a: 6, f: 2 }]}><Sprite xml={PART.planet} w={S} /></Layer>
      <Scene ps={orb} />
    </>
  );
}

function DiamondRing({ W, H }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const S = U * 0.7;
  const ps = useMemo(() => {
    const r = rng(40);
    return [
      ...fall(r, { n: 44, W, H, looks: [dot('#BFE3FF'), dot('#FFFFFF'), sprite('starBlue')], size: [4, 10], t0: [0.2, 0.75], dur: [0.25, 0.4], sway: 10 }),
      ...burst(r, { n: 16, cx, cy: cy - S * 0.25, looks: [sprite('starBlue'), dot('#FFFFFF')], dist: [U * 0.4, U * 0.8], size: [12, 24], t0: [0.3, 0.34], dur: [0.4, 0.5], grav: 30, spin: 240 }),
    ];
  }, [cx, cy, S, U, W, H]);
  return (
    <>
      <Layer x={cx} y={cy} w={U * 2.4} h={U * 2.4} k={{ o: kf([0, 0], [0.2, 0.9], [0.88, 0.9], [1, 0]), r: kf([0, 0], [1, -60]) }}><Sprite xml={PART.raysBlue} w={U * 2.4} /></Layer>
      <Glow x={cx} y={cy} size={U * 1.2} color="#4FA8FF" k={{ o: kf([0, 0], [0.3, 1], [0.88, 0.7], [1, 0]) }} />
      <Layer x={cx} y={cy} w={S} h={S} k={{ y: kf([0, -H * 0.6], [0.28, 0]), sx: kf([0, 1], [0.08, -1], [0.16, 1], [0.24, -1], [0.3, 1], [0.6, 1], [0.66, -1], [0.72, 1]), s: kf([0.88, 1], [1, 0.6]), o: kf([0, 0], [0.04, 1], [0.88, 1], [1, 0]) }} osc={[{ p: 'y', a: 6, f: 3 }]}>
        <Sprite xml={art('diamond_ring')} w={S} />
      </Layer>
      <Scene ps={ps} />
    </>
  );
}

function CarpetFly({ W, H }: FxProps) {
  const { U } = geo(W, H);
  const S = U * 0.85;
  const cy = H * 0.44;
  const X: [number, number][] = [[0, -W * 0.9], [0.35, 0], [0.65, 0], [1, W * 0.95]];
  const xAt = (t: number) => {
    for (let i = 1; i < X.length; i++) if (t <= X[i][0]) { const [t0, x0] = X[i - 1], [t1, x1] = X[i]; return x0 + ((x1 - x0) * (t - t0)) / (t1 - t0); }
    return X[X.length - 1][1];
  };
  const ps = useMemo(() => {
    const r = rng(42);
    const trail: P[] = [];
    for (let i = 0; i < 34; i++) {
      const t = 0.03 + i * 0.028;
      const x = W / 2 + xAt(t) - S * 0.35;
      trail.push({ spec: { x, y: cy + (r() - 0.5) * S * 0.3, w: 8 + r() * 10, h: 8 + r() * 10, k: { o: kf([0, 0], [t, 0], [t + 0.01, 1], [t + 0.2, 0]), s: kf([t, 1], [t + 0.2, 0.2]), y: kf([t, 0], [t + 0.2, 30]) } }, look: i % 3 ? dot('#FFE08A') : sprite('starGold') });
    }
    return [...twinkle(r, { n: 26, x: [0, W], y: [0, H], looks: [dot('#FFFFFF', false), dot('#FFE7A0')], size: [2, 5], t0: [0.02, 0.9], dur: [0.2, 0.4] }), ...trail];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, S, cy]);
  return (
    <>
      <Backdrop W={W} H={H} xml={PART.nightSky} opacity={0.85} />
      <Layer x={W * 0.78} y={H * 0.14} w={U * 0.32} h={U * 0.32} k={{ o: showFrom(0.05, 1, 0.12, 0.1) }}><Sprite xml={PART.moon} w={U * 0.32} /></Layer>
      <Scene ps={ps} />
      <Layer x={W / 2} y={cy} w={S} h={S} k={{ x: kf(...X), o: kf([0, 1], [1, 1]) }} osc={[{ p: 'y', a: 18, f: 2.5 }, { p: 'skx', a: 7, f: 3 }, { p: 'r', a: 4, f: 2.5, ph: 0.2 }]}>
        <Sprite xml={art('silk_carpet')} w={S} />
      </Layer>
    </>
  );
}

function JetFly({ W, H }: FxProps) {
  const { U } = geo(W, H);
  const S = U * 0.95;
  const pts: [number, number, number][] = [[0, -W * 0.7, H * 0.25], [0.35, 0, 0], [0.62, W * 0.08, -H * 0.03], [1, W * 0.95, -H * 0.45]];
  const at = (t: number) => {
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, x0, y0] = pts[i - 1], [t1, x1, y1] = pts[i]; const f = (t - t0) / (t1 - t0); return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]; }
    return [pts[3][1], pts[3][2]];
  };
  const cy = H * 0.46;
  const ps = useMemo(() => {
    const r = rng(43);
    const trail: P[] = [];
    for (let i = 0; i < 40; i++) {
      const t = 0.02 + i * 0.024;
      const [x, y] = at(t);
      trail.push({ spec: { x: W / 2 + x - S * 0.42, y: cy + y + S * 0.08, w: 14, h: 14, k: { o: kf([0, 0], [t, 0], [t + 0.01, 0.8], [t + 0.25, 0]), s: kf([t, 0.6], [t + 0.25, 2.2]) } }, look: dot('rgba(255,255,255,0.8)', false) });
    }
    const clouds: P[] = Array.from({ length: 6 }, (_, i) => {
      const w = U * (0.5 + r() * 0.5);
      const sp = 0.6 + r() * 0.8;
      return { spec: { x: W + w, y: H * (0.15 + (i / 6) * 0.75), w, h: w * 0.62, z: i % 2 ? 3 : 0, k: { x: kf([0, 0], [1, -(W + w * 2) * sp]), o: kf([0, 0], [0.06, 0.95], [0.92, 0.95], [1, 0]) } }, look: sprite('cloud') };
    });
    return { trail, clouds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, U, S, cy]);
  return (
    <>
      <Backdrop W={W} H={H} color="rgba(40,110,200,0.45)" />
      <Scene ps={ps.clouds.filter((c) => !c.spec.z)} />
      <Scene ps={ps.trail} />
      <Layer x={W / 2} y={cy} w={S} h={S * (80 / 128)} k={{ x: kf(...pts.map((p): [number, number] => [p[0], p[1]])), y: kf(...pts.map((p): [number, number] => [p[0], p[2]])), r: kf([0, -6], [0.35, 0], [0.62, -4], [1, -18]), s: kf([0.62, 1], [1, 0.7]) }} osc={[{ p: 'y', a: 4, f: 3 }]}>
        <Sprite xml={PART.jet} w={S} h={S * (80 / 128)} />
      </Layer>
      <Scene ps={ps.clouds.filter((c) => !!c.spec.z)} />
    </>
  );
}

function LuxPop({ W, H, giftId }: FxProps) {
  const { cx, cy, U } = geo(W, H);
  const ps = useMemo(() => {
    const r = rng(44);
    return [
      ...fall(r, { n: 40, W, H, looks: [dot('#FFE08A'), sprite('starGold')], size: [4, 12], t0: [0.2, 0.75], dur: [0.25, 0.4] }),
      ...burst(r, { n: 18, cx, cy, looks: [sprite('starGold')], dist: [U * 0.45, U * 0.85], size: [14, 26], t0: [0.2, 0.24], dur: [0.45, 0.55], grav: 40, spin: 220 }),
    ];
  }, [cx, cy, U, W, H]);
  return (
    <>
      <Layer x={cx} y={cy} w={U * 2.4} h={U * 2.4} k={{ o: kf([0, 0], [0.2, 0.9], [0.88, 0.9], [1, 0]), r: kf([0, 0], [1, 60]) }}><Sprite xml={PART.raysGold} w={U * 2.4} /></Layer>
      <Layer x={cx} y={cy} w={U * 0.78} h={U * 0.78} k={{ s: kf([0, 0], [0.18, 1.15], [0.25, 1], [0.88, 1], [1, 0.5]), o: outro(0.88) }} osc={[{ p: 'y', a: 8, f: 2 }]}><Sprite xml={art(giftId)} w={U * 0.78} /></Layer>
      <Scene ps={ps} />
    </>
  );
}

export const EFFECTS: Record<FxKind, React.ComponentType<FxProps>> = {
  petals: Petals, heartPop: HeartPop, steam: Steam, kissFly: KissFly, seedBurst: SeedBurst, sugarHop: SugarHop, chocoZigzag: ChocoZigzag, miniSpark: MiniSpark,
  butaSpin: ButaSpin, teddyDrop: TeddyDrop, bouquetBloom: BouquetBloom, tarMusic: TarMusic, perfumeMist: PerfumeMist, champagnePop: ChampagnePop,
  ringReveal: RingReveal, fireworksShow: FireworksShow, crystalHeart: CrystalHeart, bigPop: BigPop,
  crownDescend: CrownDescend, caspianSunset: CaspianSunset, towerRise: TowerRise, flameTowers: FlameTowers, carDrive: CarDrive,
  rocketLaunch: RocketLaunch, yachtSail: YachtSail, palaceRise: PalaceRise, planetOrbit: PlanetOrbit,
  diamondRing: DiamondRing, carpetFly: CarpetFly, jetFly: JetFly, luxPop: LuxPop,
};

/** Bu effektlər öz fonunu çəkir (əlavə qaranlıq pərdə lazım deyil) */
export const OWN_BACKDROP = new Set<FxKind>(['caspianSunset', 'towerRise', 'flameTowers', 'rocketLaunch', 'yachtSail', 'planetOrbit', 'carpetFly', 'jetFly']);
