import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { GiftEvent } from '../lib/types';
import { useStore } from '../store';
import { fxFor, type GiftFx } from './gifts/catalog';
import { ComboBanner, BANNER_H, BANNER_W } from './gifts/Banner';
import { FxPlayer } from './gifts/FxPlayer';

export interface GiftOverlayHandle {
  /** Hədiyyə hadisəsi (REST cavabı və ya socket). Eyni `id` ikinci dəfə gəlsə nəzərə alınmır. */
  push: (e: GiftEvent) => void;
}

/**
 * Hədiyyə təqdimatı (TikTok / Bigo Live üslubu):
 *  • HƏR hədiyyə → soldakı kombo-banner (eyni göndərən + eyni hədiyyə ardıcıl gəlsə "×N" artır)
 *  • SMALL → banner yanında kiçik öz effekti (ekranı bağlamır)
 *  • BIG → mərkəzdə orta animasiya; LUXURY → tam ekran animasiya + göndərən lövhəsi (növbə ilə, bir-bir)
 *  • compactSelf (zənglər): göndərən özü yalnız "Sən göndərdin" banneri görür — öz videosunun üstündə böyük animasiya yoxdur
 *  • Təkrar: optimistik (REST) + socket əks-sədası eyni tranzaksiya id-si ilə gəlir → bir dəfə oynanır
 * Örtük heç vaxt toxunuşu tutmur (pointerEvents="none").
 */
interface Lane { key: string; ev: GiftEvent; combo: number; bump: number; self: boolean; uid: number; leaving: boolean }
interface Mini { id: number; fx: GiftFx; giftId: string; ax: number; ay: number }
interface Big { id: number; fx: GiftFx; ev: GiftEvent; self: boolean }

const LANES = 2;
const IDLE_MS = 3200;
const MAX_QUEUE = 8;
const MAX_MINI = 4;

export const GiftOverlay = forwardRef<GiftOverlayHandle, { compactSelf?: boolean; bannerTop?: number }>(function GiftOverlay({ compactSelf, bannerTop = 0.45 }, ref) {
  const win = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ W: win.width, H: win.height });
  const [lanes, setLanes] = useState<(Lane | null)[]>(() => Array(LANES).fill(null));
  const [minis, setMinis] = useState<Mini[]>([]);
  const [big, setBig] = useState<Big | null>(null);
  const seen = useRef<string[]>([]);
  const queue = useRef<Big[]>([]);
  const timers = useRef<(ReturnType<typeof setTimeout> | null)[]>(Array(LANES).fill(null));
  const lanesRef = useRef(lanes);
  lanesRef.current = lanes;
  const bigRef = useRef(big);
  bigRef.current = big;
  const seq = useRef(1);

  const laneTop = useCallback((i: number) => size.H * bannerTop + (LANES - 1 - i) * (BANNER_H + 18), [size.H, bannerTop]);

  const nextBig = useCallback(() => {
    const n = queue.current.shift() ?? null;
    setBig(n);
  }, []);

  const armLane = useCallback((i: number) => {
    const old = timers.current[i];
    if (old) clearTimeout(old);
    timers.current[i] = setTimeout(() => {
      setLanes((cur) => cur.map((l, j) => (j === i && l ? { ...l, leaving: true } : l)));
      timers.current[i] = setTimeout(() => setLanes((cur) => cur.map((l, j) => (j === i && l?.leaving ? null : l))), 300);
    }, IDLE_MS);
  }, []);

  useImperativeHandle(ref, () => ({
    push(e: GiftEvent) {
      if (!e?.gift) return;
      if (e.id) {
        if (seen.current.includes(e.id)) return;
        seen.current.push(e.id);
        if (seen.current.length > 300) seen.current.splice(0, 100);
      }
      const me = useStore.getState().me?.id;
      const self = !!me && e.sender.id === me;
      const fx = fxFor(e.gift);
      const key = `${e.sender.id}:${e.gift.id}`;

      // 1) Banner (kombo)
      const cur = lanesRef.current;
      let idx = cur.findIndex((l) => l && !l.leaving && l.key === key);
      let next: (Lane | null)[];
      if (idx >= 0) {
        next = cur.map((l, j) => (j === idx && l ? { ...l, ev: e, combo: l.combo + e.count, bump: l.bump + 1 } : l));
      } else {
        idx = cur.findIndex((l) => !l);
        if (idx < 0) idx = cur.findIndex((l) => l?.leaving);
        if (idx < 0) idx = 0;
        next = cur.map((l, j) => (j === idx ? { key, ev: e, combo: e.count, bump: 1, self, uid: seq.current++, leaving: false } : l));
      }
      lanesRef.current = next;
      setLanes(next);
      armLane(idx);

      if (compactSelf && self) return; // zəngdə göndərən: yalnız təsdiq banneri

      // 2) Effekt
      if (e.gift.tier === 'SMALL') {
        const ax = 8 + BANNER_W - 29;
        const ay = laneTop(idx) + BANNER_H / 2 - 10;
        setMinis((m) => [...m.slice(-(MAX_MINI - 1)), { id: seq.current++, fx, giftId: e.gift.id, ax, ay }]);
      } else {
        const item: Big = { id: seq.current++, fx, ev: e, self };
        if (queue.current.length >= MAX_QUEUE) queue.current.shift();
        queue.current.push(item);
        if (!bigRef.current) nextBig();
      }
    },
  }), [armLane, compactSelf, laneTop, nextBig]);

  useEffect(() => () => { timers.current.forEach((t) => t && clearTimeout(t)); }, []);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(ev) => {
        const { width, height } = ev.nativeEvent.layout;
        if (width > 0 && height > 0 && (width !== size.W || height !== size.H)) setSize({ W: width, H: height });
      }}
    >
      {big ? (
        <FxPlayer key={big.id} fx={big.fx} W={size.W} H={size.H} giftId={big.ev.gift.id} ev={big.ev} self={big.self} topInset={insets.top} onDone={nextBig} />
      ) : null}
      {minis.map((m) => (
        <FxPlayer key={m.id} fx={m.fx} W={size.W} H={size.H} ax={m.ax} ay={m.ay} giftId={m.giftId} onDone={() => setMinis((cur) => cur.filter((x) => x.id !== m.id))} />
      ))}
      {lanes.map((l, i) => (l ? <ComboBanner key={l.uid} ev={l.ev} combo={l.combo} bump={l.bump} self={l.self} leaving={l.leaving} top={laneTop(i)} /> : null))}
    </View>
  );
});
