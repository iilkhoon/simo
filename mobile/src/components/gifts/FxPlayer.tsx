/**
 * Bir effekti oynadır: saat yaradır, səhnəni çəkir, bitəndə onDone çağırır.
 * LUXURY üçün əlavə: qaranlıq pərdə (effektin öz fonu yoxdursa) və yuxarıda göndərən lövhəsi.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { GiftEvent } from '../../lib/types';
import { giftName } from '../../lib/format';
import { fonts } from '../../theme';
import { Avatar } from '../Avatar';
import { ClockProvider, Layer, kf, useFxClock } from './kit';
import { EFFECTS, OWN_BACKDROP } from './effects';
import type { GiftFx } from './catalog';
import { gs } from './strings';

export function FxPlayer({ fx, W, H, ax = 0, ay = 0, giftId, ev, self, topInset = 0, onDone }: {
  fx: GiftFx; W: number; H: number; ax?: number; ay?: number; giftId: string; ev?: GiftEvent; self?: boolean; topInset?: number; onDone: () => void;
}) {
  const t = useFxClock(fx.ms);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const id = setTimeout(() => done.current(), fx.ms + 60);
    return () => clearTimeout(id);
  }, [fx.ms]);
  const Comp = EFFECTS[fx.fx];
  const lux = ev?.gift.tier === 'LUXURY';
  return (
    <ClockProvider t={t}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {lux && !OWN_BACKDROP.has(fx.fx) ? (
          <Layer x={W / 2} y={H / 2} w={W} h={H} k={{ o: kf([0, 0], [0.08, 1], [0.9, 1], [1, 0]) }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(8,6,18,0.45)' }} />
          </Layer>
        ) : null}
        <Comp W={W} H={H} ax={ax} ay={ay} giftId={giftId} variant={fx.variant} />
        {lux && ev ? (
          <Layer x={W / 2} y={topInset + 74} w={Math.min(W - 32, 340)} h={58} k={{ y: kf([0, -90], [0.08, 0], [0.9, 0], [1, -90]), o: kf([0, 0], [0.06, 1], [0.92, 1], [1, 0]) }}>
            <LinearGradient colors={['#FFE08A', '#F2A516', '#C2410C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.titleOuter}>
              <LinearGradient colors={['rgba(30,14,40,0.92)', 'rgba(70,20,40,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.titleInner}>
                <Avatar uri={ev.sender.avatarUrl} name={ev.sender.name} size={40} vipTier={ev.sender.vipTier} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.tName} numberOfLines={1}>{self ? gs('you') : ev.sender.name}</Text>
                  <Text style={styles.tSub} numberOfLines={1}>{self ? gs('youSent') : gs('sent')} {giftName(ev.gift)}{ev.count > 1 ? ` ×${ev.count}` : ''}</Text>
                </View>
              </LinearGradient>
            </LinearGradient>
          </Layer>
        ) : null}
      </View>
    </ClockProvider>
  );
}

const styles = StyleSheet.create({
  titleOuter: { flex: 1, borderRadius: 29, padding: 2 },
  titleInner: { flex: 1, borderRadius: 27, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  tName: { color: '#FFFFFF', fontFamily: fonts.black, fontSize: 15 },
  tSub: { color: '#FFE08A', fontFamily: fonts.bold, fontSize: 12.5 },
});
