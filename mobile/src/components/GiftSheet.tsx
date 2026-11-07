import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme';
import { useStore } from '../store';
import { api, ApiError } from '../lib/api';
import { errorText, giftName } from '../lib/format';
import { fmtAlmaz } from '../lib/economy';
import type { Gift, GiftEvent } from '../lib/types';
import { CoinIcon, DiamondIcon, GiftIcon } from './GiftIcon';
import { Icon } from './Icon';
import { gs, type GiftStr } from './gifts/strings';
import { loc, useLiveGiftCampaign } from '../lib/campaigns';

const COUNTS = [1, 10, 33, 99, 520];
const ALMAZ_COUNTS = [1, 5, 10];
const CATS = ['popular', 'azerbaijan', 'romantic', 'luxury', 'almaz'] as const;
/** 'event' — gedən mövsümi kampaniyanın hədiyyələri (lib/campaigns.ts), yalnız kampaniya olanda görünür */
type Cat = (typeof CATS)[number] | 'event';
const COMBO_MS = 3000;

const hap = {
  pick: () => void Haptics.selectionAsync().catch(() => {}),
  send: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  combo: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  err: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};

function inCat(g: Gift, c: (typeof CATS)[number]) {
  if (c === 'almaz') return g.currency === 'DIAMOND';
  if (g.currency === 'DIAMOND') return false;
  return c === 'popular' ? true : g.category === c;
}

function Price({ g, size = 12 }: { g: Pick<Gift, 'price' | 'currency'>; size?: number }) {
  return (
    <View style={styles.price}>
      {g.currency === 'DIAMOND' ? <DiamondIcon size={size} /> : <CoinIcon size={size} />}
      <Text style={[styles.priceText, { fontSize: size - 1 }]}>{g.currency === 'DIAMOND' ? fmtAlmaz(g.price) : g.price.toLocaleString('en-US')}</Text>
    </View>
  );
}

function Cell({ g, on, onPress }: { g: Gift; on: boolean; onPress: () => void }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = on ? withSequence(withTiming(1.22, { duration: 120 }), withSpring(1.12, { damping: 8 })) : withTiming(1, { duration: 120 });
  }, [on, s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const inner = (
    <View style={[styles.cellInner, on && styles.cellInnerOn]}>
      {g.tier !== 'SMALL' ? (
        <LinearGradient colors={g.tier === 'LUXURY' ? ['#FFE08A', '#F2A516'] : ['#FF6A95', '#F2344F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tag}>
          <Text style={[styles.tagText, g.tier === 'LUXURY' && { color: '#3A1A00' }]}>{g.tier === 'LUXURY' ? 'FX+' : 'FX'}</Text>
        </LinearGradient>
      ) : null}
      <Animated.View style={st}><GiftIcon id={g.id} size={50} /></Animated.View>
      <Text style={styles.name} numberOfLines={1}>{giftName(g)}</Text>
      <Price g={g} />
    </View>
  );
  return (
    <Pressable onPress={onPress} style={styles.cell}>
      {on ? <LinearGradient colors={['#FFE08A', '#FF6A95', '#B57BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cellRing}>{inner}</LinearGradient> : inner}
    </Pressable>
  );
}

/** Kombo düyməsi: göndərdikdən sonra 3 san görünür, toxunduqca eyni hədiyyəni təkrar göndərir */
function ComboButton({ n, stamp, onPress }: { n: number; stamp: number; onPress: () => void }) {
  const p = useSharedValue(1);
  const s = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(p);
    p.value = 1;
    p.value = withTiming(0, { duration: COMBO_MS, easing: Easing.linear });
    s.value = withSequence(withTiming(0.88, { duration: 70 }), withSpring(1, { damping: 6, stiffness: 300 }));
  }, [stamp, p, s]);
  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const sc = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.comboBtnWrap, sc]}>
      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <LinearGradient colors={['#FFB21E', '#FF6A3D', '#F2344F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.comboBtn}>
          <Text style={styles.comboLabel}>{gs('combo')}</Text>
          <Text style={styles.comboN}>×{n}</Text>
          <Text style={styles.comboHint}>{gs('tapAgain')}</Text>
          <View style={styles.comboTrack}><Animated.View style={[styles.comboBar, bar]} /></View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export function GiftSheet({ visible, onClose, receiverId, receiverName, context, contextId, onSent }: {
  visible: boolean; onClose: () => void; receiverId: string; receiverName?: string; context: 'CHAT' | 'LIVE' | 'VIDEO' | 'CALL' | 'PROFILE'; contextId?: string;
  onSent?: (e: GiftEvent) => void;
}) {
  const insets = useSafeAreaInsets();
  const { gifts, loadGifts, me, patchMe, toast } = useStore();
  const [cat, setCat] = useState<Cat>('popular');
  const [selected, setSelected] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [combo, setCombo] = useState<{ n: number; stamp: number } | null>(null);
  const comboTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(0);
  const stayOpen = context === 'LIVE' || context === 'CALL' || context === 'VIDEO';

  useEffect(() => {
    if (visible) void loadGifts();
    else { setCombo(null); pending.current = 0; }
  }, [visible, loadGifts]);
  useEffect(() => () => { if (comboTimer.current) clearTimeout(comboTimer.current); }, []);

  const campaign = useLiveGiftCampaign();
  const eventTab = useRef(false);
  // Kampaniya gedirsə — pəncərə ilk dəfə "bayram" tabında açılır (Bigo/Chamet kimi)
  useEffect(() => { if (visible && campaign && !eventTab.current) { eventTab.current = true; setCat('event'); } }, [visible, campaign]);
  const list = useMemo(() => {
    if (cat === 'event') return (campaign?.giftIds ?? []).map((id) => gifts.find((g) => g.id === id)).filter((g): g is Gift => !!g);
    return gifts.filter((g) => inCat(g, cat));
  }, [gifts, cat, campaign]);
  const gift = gifts.find((g) => g.id === selected);
  const almaz = cat === 'almaz' || gift?.currency === 'DIAMOND';
  const counts = almaz ? ALMAZ_COUNTS : COUNTS;
  const total = (gift?.price ?? 0) * count;
  const bal = gift?.currency === 'DIAMOND' ? (me?.diamonds ?? 0) : (me?.coins ?? 0);
  const short = gift ? bal - pending.current < total : false;

  function topUp() {
    onClose();
    router.push({ pathname: '/wallet', params: almaz ? { tab: 'almaz' } : {} });
  }

  async function send(fromCombo = false) {
    if (!gift) return;
    const cost = gift.price * count;
    const balNow = (gift.currency === 'DIAMOND' ? useStore.getState().me?.diamonds : useStore.getState().me?.coins) ?? 0;
    if (balNow - pending.current < cost) {
      hap.err();
      toast(gift.currency === 'DIAMOND' ? gs('needMore', { n: `${fmtAlmaz(cost - balNow)} 💎` }) : gs('needMore', { n: `${cost - balNow + pending.current} Nar` }), 'error');
      setCombo(null);
      topUp();
      return;
    }
    if (fromCombo) hap.combo(); else hap.send();
    if (stayOpen) {
      const n = (fromCombo && combo ? combo.n : 0) + count;
      setCombo({ n, stamp: Date.now() });
      if (comboTimer.current) clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => setCombo(null), COMBO_MS);
    }
    pending.current += cost;
    try {
      const r = await api<{ coins: number | null; event: GiftEvent }>('/gifts/send', { body: { giftId: gift.id, receiverId, count, context, contextId } });
      const st = useStore.getState().me;
      if (gift.currency === 'DIAMOND') patchMe({ diamonds: Math.max(0, (st?.diamonds ?? 0) - cost) });
      else if (r.coins != null) patchMe({ coins: r.coins });
      onSent?.(r.event);
      if (!stayOpen) onClose();
    } catch (e) {
      hap.err();
      setCombo(null);
      toast(errorText(e), 'error');
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') topUp();
    } finally {
      pending.current = Math.max(0, pending.current - cost);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <LinearGradient colors={['#231A2E', '#140F1A']} style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.grip} />
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>🎁 {receiverName ? <Text style={styles.to}>{gs('to')}: <Text style={styles.toName}>{receiverName}</Text></Text> : null}</Text>
          </View>
          <Pressable onPress={topUp} style={({ pressed }) => [styles.balance, pressed && { opacity: 0.8 }]}>
            {almaz ? <DiamondIcon size={18} /> : <CoinIcon size={18} />}
            <Text style={styles.balText}>{almaz ? fmtAlmaz(me?.diamonds ?? 0) : (me?.coins ?? 0).toLocaleString('en-US')}</Text>
            <Text style={styles.rechargeText}>{gs('recharge')}</Text>
            <Icon name="chevron" size={14} color="#FFD54A" />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {campaign ? (
            <Pressable onPress={() => { hap.pick(); setCat('event'); setSelected(null); setCount(1); setCombo(null); }} style={styles.tab}>
              <Text style={[styles.tabText, cat === 'event' && styles.tabTextOn, { maxWidth: 150 }]} numberOfLines={1}>{campaign.emoji} {loc(campaign.title)}</Text>
              {cat === 'event' ? <LinearGradient colors={[campaign.color, campaign.color2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabBar} /> : null}
            </Pressable>
          ) : null}
          {CATS.map((c) => {
            const on = c === cat;
            return (
              <Pressable key={c} onPress={() => { hap.pick(); setCat(c); setSelected(null); setCount(1); setCombo(null); }} style={styles.tab}>
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{c === 'almaz' ? '💎 ' : ''}{gs(c as GiftStr)}</Text>
                {on ? <LinearGradient colors={['#FFD54A', '#FF6A95']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.tabBar} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <FlatList
          data={list}
          numColumns={4}
          keyExtractor={(g) => g.id}
          style={styles.grid}
          columnWrapperStyle={{ gap: 6 }}
          contentContainerStyle={{ gap: 6, paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Cell g={item} on={selected === item.id} onPress={() => { hap.pick(); setSelected(item.id); setCombo(null); if (item.tier === 'LUXURY' && count > 10) setCount(1); }} />
          )}
        />
        <View style={styles.bottom}>
          <View style={styles.counts}>
            {counts.map((c) => (
              <Pressable key={c} onPress={() => { hap.pick(); setCount(c); setCombo(null); }} style={[styles.count, count === c && styles.countOn]}>
                <Text style={[styles.countText, count === c && styles.countTextOn]}>×{c}</Text>
              </Pressable>
            ))}
          </View>
          {combo && gift && !short ? (
            <ComboButton n={combo.n} stamp={combo.stamp} onPress={() => void send(true)} />
          ) : (
            <Pressable disabled={!gift} onPress={short ? topUp : () => void send(false)} style={({ pressed }) => [styles.sendWrap, !gift && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.96 }] }]}>
              <LinearGradient colors={short ? ['#FFD54A', '#FFB21E'] : ['#FF6A95', '#F2344F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.send}>
                {!gift ? <Text style={styles.sendText}>{gs('pick')}</Text> : short ? (
                  <>
                    <Text style={[styles.sendText, { color: '#2A1600' }]}>{gs('recharge')}</Text>
                    <Text style={styles.shortText}>{gs('needMore', { n: gift.currency === 'DIAMOND' ? fmtAlmaz(total - bal) : (total - bal).toLocaleString('en-US') })}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.sendText}>{gs('send')}</Text>
                    <View style={styles.sendPrice}>{gift.currency === 'DIAMOND' ? <DiamondIcon size={12} /> : <CoinIcon size={12} />}<Text style={styles.sendPriceText}>{gift.currency === 'DIAMOND' ? fmtAlmaz(total) : total.toLocaleString('en-US')}</Text></View>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 8, paddingHorizontal: 12 },
  grip: { alignSelf: 'center', width: 38, height: 4.5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 6, paddingHorizontal: 4, gap: 10 },
  title: { fontFamily: fonts.displayBold, fontSize: 17, color: '#FFFFFF' },
  to: { fontFamily: fonts.semibold, fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  toName: { fontFamily: fonts.black, color: '#FFFFFF' },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,213,74,0.12)', borderWidth: 1, borderColor: 'rgba(255,213,74,0.35)', paddingLeft: 10, paddingRight: 8, height: 34, borderRadius: 17 },
  balText: { fontFamily: fonts.black, fontSize: 14, color: '#FFFFFF' },
  rechargeText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFD54A', marginLeft: 2 },
  tabs: { gap: 18, paddingHorizontal: 6, paddingTop: 6 },
  tab: { paddingVertical: 6, alignItems: 'center' },
  tabText: { fontFamily: fonts.bold, fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  tabTextOn: { color: '#FFFFFF', fontFamily: fonts.black },
  tabBar: { position: 'absolute', bottom: 0, height: 3, width: 22, borderRadius: 2 },
  grid: { maxHeight: 262, marginTop: 4 },
  cell: { flex: 1, maxWidth: '24.2%', height: 120 },
  cellRing: { flex: 1, borderRadius: 16, padding: 1.6 },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.045)', gap: 2 },
  cellInnerOn: { backgroundColor: '#2C2038' },
  tag: { position: 'absolute', top: 5, right: 5, height: 15, paddingHorizontal: 4.5, borderRadius: 8, justifyContent: 'center' },
  tagText: { fontFamily: fonts.black, fontSize: 8.5, color: '#FFFFFF' },
  name: { color: '#FFFFFF', fontSize: 11.5, fontFamily: fonts.semibold, maxWidth: '92%', marginTop: 4 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceText: { color: '#FFD54A', fontFamily: fonts.black },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingHorizontal: 2 },
  counts: { flex: 1, flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 22, padding: 3 },
  count: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  countOn: { backgroundColor: 'rgba(255,255,255,0.16)' },
  countText: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.black, fontSize: 12.5 },
  countTextOn: { color: '#FFFFFF' },
  sendWrap: { width: 118, height: 46 },
  send: { flex: 1, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#FFFFFF', fontFamily: fonts.black, fontSize: 15 },
  sendPrice: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  sendPriceText: { color: 'rgba(255,255,255,0.92)', fontFamily: fonts.bold, fontSize: 11 },
  shortText: { color: 'rgba(42,22,0,0.75)', fontFamily: fonts.bold, fontSize: 10.5 },
  comboBtnWrap: { width: 118, height: 74, marginTop: -28 },
  comboBtn: { flex: 1, borderRadius: 37, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#FFE08A' },
  comboLabel: { color: '#FFF4D0', fontFamily: fonts.black, fontSize: 11, letterSpacing: 1.5 },
  comboN: { color: '#FFFFFF', fontFamily: fonts.displayBlack, fontSize: 24, fontStyle: 'italic', lineHeight: 28 },
  comboHint: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.bold, fontSize: 9.5 },
  comboTrack: { position: 'absolute', left: 14, right: 14, bottom: 6, height: 3, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.25)' },
  comboBar: { height: 3, borderRadius: 2, backgroundColor: '#FFF4D0' },
});
