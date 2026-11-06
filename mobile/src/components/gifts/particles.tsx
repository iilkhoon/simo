/**
 * Hissəcik generatorları: partlayış, yağış, qalxma, parıltı, atəşfəşanlıq, orbit.
 * Hamısı deterministikdir (seed) — eyni hədiyyə hər dəfə eyni gözəl görünür, render zamanı Math.random yoxdur.
 */
import React from 'react';
import { Chip, Dot, Layer, Sprite, between, kf, pick, showFrom, type KF, type Osc, type Rand, type Spec } from './kit';
import { PART, type PartName } from './art';

export type Look =
  | { kind: 'sprite'; xml: string }
  | { kind: 'dot'; color: string; glow?: boolean; ring?: boolean }
  | { kind: 'chip'; color: string };

export const sprite = (name: PartName): Look => ({ kind: 'sprite', xml: PART[name] });
export const xmlLook = (xml: string): Look => ({ kind: 'sprite', xml });
export const dot = (color: string, glow = true): Look => ({ kind: 'dot', color, glow });
export const ring = (color: string): Look => ({ kind: 'dot', color, ring: true });
export const chip = (color: string): Look => ({ kind: 'chip', color });

export interface P { spec: Spec; look: Look }

export function render(ps: P[], keyPrefix = 'p') {
  return ps.map((p, i) => (
    <Layer key={`${keyPrefix}${i}`} {...p.spec}>
      {p.look.kind === 'sprite' ? <Sprite xml={p.look.xml} w={p.spec.w} h={p.spec.h} />
        : p.look.kind === 'chip' ? <Chip w={p.spec.w} h={p.spec.h} color={p.look.color} />
        : <Dot size={p.spec.w} color={p.look.color} glow={p.look.glow} ring={p.look.ring} />}
    </Layer>
  ));
}

const deg = (d: number) => (d * Math.PI) / 180;

/** Mərkəzdən partlayış: cazibə ilə əyri trayektoriya */
export function burst(r: Rand, o: {
  n: number; cx: number; cy: number; looks: Look[];
  dist: [number, number]; size: [number, number];
  t0: [number, number]; dur: [number, number];
  angle?: [number, number]; grav?: number; spin?: number; aspect?: number; z?: number; sway?: number; grow?: [number, number];
}): P[] {
  return Array.from({ length: o.n }, (_, i) => {
    const [a0, a1] = o.angle ?? [0, 360];
    const a = deg(a0 + ((a1 - a0) * (i + r() * 0.8)) / o.n);
    const d = between(r, ...o.dist);
    const s = between(r, ...o.size);
    const t0 = between(r, ...o.t0);
    const t1 = Math.min(1, t0 + between(r, ...o.dur));
    const g = o.grav ?? 0;
    const fr = [0, 0.2, 0.45, 0.7, 1];
    const ease = (f: number) => 1 - (1 - f) * (1 - f);
    const x: KF = kf(...fr.map((f): [number, number] => [t0 + (t1 - t0) * f, Math.cos(a) * d * ease(f)]));
    const y: KF = kf(...fr.map((f): [number, number] => [t0 + (t1 - t0) * f, Math.sin(a) * d * ease(f) + g * f * f]));
    const rot = (o.spin ?? 0) * (r() > 0.5 ? 1 : -1);
    const [g0, g1] = o.grow ?? [0.3, 1];
    const osc: Osc[] = o.sway ? [{ p: 'x', a: o.sway, f: between(r, 2, 4), ph: r() }] : [];
    return {
      spec: {
        x: o.cx, y: o.cy, w: s, h: s * (o.aspect ?? 1), z: o.z, osc,
        k: { x, y, o: showFrom(t0, t1, 0.03, (t1 - t0) * 0.45), s: kf([t0, g0], [t0 + (t1 - t0) * 0.25, g1], [t1, g1 * 0.85]), r: kf([t0, 0], [t1, rot]) },
      },
      look: pick(r, o.looks),
    };
  });
}

/** Yuxarıdan yağış (ləçək, konfetti, toz) */
export function fall(r: Rand, o: {
  n: number; W: number; H: number; looks: Look[]; size: [number, number];
  t0: [number, number]; dur: [number, number]; x?: [number, number]; spin?: number; sway?: number; aspect?: number; z?: number; yFrom?: number; yTo?: number;
}): P[] {
  return Array.from({ length: o.n }, () => {
    const s = between(r, ...o.size);
    const [x0, x1] = o.x ?? [0, o.W];
    const x = between(r, x0, x1);
    const t0 = between(r, ...o.t0);
    const t1 = Math.min(1, t0 + between(r, ...o.dur));
    const y0 = o.yFrom ?? -s;
    const y1 = (o.yTo ?? o.H + s) - y0;
    return {
      spec: {
        x, y: y0, w: s, h: s * (o.aspect ?? 1), z: o.z,
        osc: [{ p: 'x', a: o.sway ?? 14, f: between(r, 1.5, 3.5), ph: r() }, ...(o.aspect ? [{ p: 'sy' as const, a: 0.6, f: between(r, 3, 6), ph: r() }] : [])],
        k: { y: kf([t0, 0], [t1, y1]), o: showFrom(t0, t1, 0.03, 0.12), r: kf([t0, between(r, 0, 360)], [t1, between(r, 0, 360) + (o.spin ?? 220) * (r() > 0.5 ? 1 : -1)]) },
      },
      look: pick(r, o.looks),
    };
  });
}

/** Aşağıdan yuxarı qalxma (köpük, not, qığılcım, ürək) */
export function rise(r: Rand, o: {
  n: number; x: [number, number]; y: number; dy: [number, number]; dx?: [number, number]; looks: Look[]; size: [number, number];
  t0: [number, number]; dur: [number, number]; sway?: number; swayF?: number; grow?: [number, number]; spin?: number; z?: number;
}): P[] {
  return Array.from({ length: o.n }, () => {
    const s = between(r, ...o.size);
    const t0 = between(r, ...o.t0);
    const t1 = Math.min(1, t0 + between(r, ...o.dur));
    const [g0, g1] = o.grow ?? [0.4, 1];
    return {
      spec: {
        x: between(r, ...o.x), y: o.y, w: s, h: s, z: o.z,
        osc: o.sway ? [{ p: 'x', a: o.sway, f: o.swayF ?? between(r, 1.5, 3), ph: r() }] : [],
        k: {
          y: kf([t0, 0], [t1, -between(r, ...o.dy)]),
          x: o.dx ? kf([t0, 0], [t1, between(r, ...o.dx)]) : undefined,
          o: showFrom(t0, t1, 0.04, (t1 - t0) * 0.4),
          s: kf([t0, g0], [t0 + (t1 - t0) * 0.3, g1], [t1, g1 * 1.05]),
          r: o.spin ? kf([t0, -o.spin], [t1, o.spin]) : undefined,
        },
      },
      look: pick(r, o.looks),
    };
  });
}

/** Yerində yanıb-sönən parıltılar */
export function twinkle(r: Rand, o: { n: number; x: [number, number]; y: [number, number]; looks: Look[]; size: [number, number]; t0?: [number, number]; dur?: [number, number]; z?: number }): P[] {
  return Array.from({ length: o.n }, () => {
    const s = between(r, ...o.size);
    const t0 = between(r, ...(o.t0 ?? [0, 0.8]));
    const t1 = Math.min(1, t0 + between(r, ...(o.dur ?? [0.12, 0.3])));
    const m = (t0 + t1) / 2;
    return {
      spec: { x: between(r, ...o.x), y: between(r, ...o.y), w: s, h: s, z: o.z, k: { s: kf([t0, 0], [m, 1], [t1, 0]), o: kf([t0, 0], [t0 + 0.01, 1], [t1 - 0.01, 1], [t1, 0]), r: kf([t0, 0], [t1, 90]) } },
      look: pick(r, o.looks),
    };
  });
}

/** Bir atəşfəşanlıq: aşağıdan iz + rəngli partlayış */
export function firework(r: Rand, o: { cx: number; cy: number; H: number; t: number; colors: string[]; radius: number; n?: number; z?: number; trail?: boolean }): P[] {
  const out: P[] = [];
  const climb = 0.1;
  const tb = o.t + (o.trail === false ? 0 : climb);
  if (o.trail !== false) {
    out.push({ spec: { x: o.cx, y: o.cy, w: 6, h: 6, z: o.z, k: { y: kf([o.t, o.H - o.cy], [tb, 0]), o: kf([0, 0], [o.t, 0], [o.t + 0.01, 1], [tb, 1], [tb + 0.01, 0]) } }, look: dot('#FFF3C4') });
  }
  out.push({ spec: { x: o.cx, y: o.cy, w: o.radius * 0.9, h: o.radius * 0.9, z: o.z, k: { s: kf([tb, 0.2], [tb + 0.05, 1.3]), o: kf([0, 0], [tb, 0], [tb + 0.01, 0.9], [tb + 0.08, 0]) } }, look: dot('rgba(255,255,255,0.9)') });
  out.push(...burst(r, { n: o.n ?? 20, cx: o.cx, cy: o.cy, looks: o.colors.map((c) => dot(c)), dist: [o.radius * 0.75, o.radius * 1.05], size: [4, 7], t0: [tb, tb + 0.01], dur: [0.26, 0.34], grav: o.radius * 0.45, z: o.z, grow: [1, 1] }));
  out.push(...burst(r, { n: 10, cx: o.cx, cy: o.cy, looks: [dot('#FFFFFF')], dist: [o.radius * 0.35, o.radius * 0.55], size: [2.5, 4], t0: [tb + 0.02, tb + 0.04], dur: [0.22, 0.3], grav: o.radius * 0.3, z: o.z, grow: [1, 1] }));
  return out;
}

/** Elliptik orbit üzrə fırlanan obyektlər (ön tərəfdə böyüyür) */
export function orbit(o: { n: number; cx: number; cy: number; rx: number; ry: number; turns: number; looks: Look[]; size: number; t0?: number; t1?: number; z?: number }): P[] {
  return Array.from({ length: o.n }, (_, i) => {
    const ph = i / o.n;
    return {
      spec: {
        x: o.cx, y: o.cy, w: o.size, h: o.size, z: o.z,
        osc: [
          { p: 'x', a: o.rx, f: o.turns, ph: ph + 0.25 },
          { p: 'y', a: o.ry, f: o.turns, ph },
          { p: 's', a: 0.35, f: o.turns, ph },
        ],
        k: { o: showFrom(o.t0 ?? 0.1, o.t1 ?? 0.92, 0.08, 0.08) },
      },
      look: o.looks[i % o.looks.length],
    };
  });
}
