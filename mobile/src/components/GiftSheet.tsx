import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';
import { useStore } from '../store';
import { api, ApiError } from '../lib/api';
import { errorText, giftName } from '../lib/format';
import type { GiftEvent } from '../lib/types';
import { GiftIcon } from './GiftIcon';
import { CoinAmount, DiamondAmount } from './Badges';
import { fmtAlmaz } from '../lib/economy';
import { Btn, Tabs, Tag, tap } from './ui';
import { sheetStyles } from './ActionSheet';
import { Icon } from './Icon';

const COUNTS = [1, 5, 10, 33, 99, 520];
const CATS = ['popular', 'romantic', 'azerbaijan', 'luxury', 'almaz'] as const;

export function GiftSheet({ visible, onClose, receiverId, receiverName, context, contextId, onSent }: {
  visible: boolean; onClose: () => void; receiverId: string; receiverName?: string; context: 'CHAT' | 'LIVE' | 'VIDEO' | 'CALL' | 'PROFILE'; contextId?: string;
  onSent?: (e: GiftEvent) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { gifts, loadGifts, me, patchMe, toast } = useStore();
  const [cat, setCat] = useState<(typeof CATS)[number]>('popular');
  const [selected, setSelected] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) void loadGifts();
  }, [visible, loadGifts]);

  const list = useMemo(() => gifts.filter((g) => g.category === cat), [gifts, cat]);
  const gift = gifts.find((g) => g.id === selected);
  const almaz = cat === 'almaz' || gift?.currency === 'DIAMOND';
  const total = (gift?.price ?? 0) * count;
  const short = gift ? (gift.currency === 'DIAMOND' ? (me?.diamonds ?? 0) : (me?.coins ?? 0)) < total : false;

  function topUp() {
    onClose();
    router.push({ pathname: '/wallet', params: almaz ? { tab: 'almaz' } : {} });
  }

  async function send() {
    if (!gift) return;
    if (short) {
      toast(gift.currency === 'DIAMOND' ? t('almaz.need') : t('errors.INSUFFICIENT_COINS'), 'error');
      topUp();
      return;
    }
    setSending(true);
    try {
      const r = await api<{ coins: number | null; event: GiftEvent }>('/gifts/send', { body: { giftId: gift.id, receiverId, count, context, contextId } });
      if (gift.currency === 'DIAMOND') patchMe({ diamonds: Math.max(0, (me?.diamonds ?? 0) - total) });
      else if (r.coins != null) patchMe({ coins: r.coins });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSent?.(r.event);
      if (context !== 'LIVE') onClose();
    } catch (e) {
      toast(errorText(e), 'error');
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') topUp();
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[sheetStyles.sheet, styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={sheetStyles.grip} />
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('gifts.title')}</Text>
            {receiverName ? <Text style={styles.to}>→ {receiverName}</Text> : null}
          </View>
          <Pressable onPress={topUp} style={styles.balance}>
            {almaz ? <DiamondAmount n={me?.diamonds ?? 0} /> : <CoinAmount n={me?.coins ?? 0} />}
            <View style={styles.plus}><Icon name="add" size={14} color={colors.ink} /></View>
          </Pressable>
        </View>
        <Tabs options={CATS.map((c) => ({ key: c, label: c === 'almaz' ? `💎 ${t('almaz.giftsTab')}` : t(`gifts.${c}`) }))} value={cat} onChange={(c) => { setCat(c); setSelected(null); setCount(1); }} />
        {cat === 'almaz' ? <Text style={styles.almazInfo}>{t('almaz.what')}</Text> : null}
        <FlatList
          data={list}
          numColumns={4}
          keyExtractor={(g) => g.id}
          style={{ maxHeight: 268, marginTop: 12 }}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const on = selected === item.id;
            return (
              <Pressable onPress={() => { tap(); setSelected(item.id); }} style={[styles.cell, on && styles.cellOn]}>
                {item.tier !== 'SMALL' ? <Tag label={item.tier === 'LUXURY' ? 'FX+' : 'FX'} bg={item.tier === 'LUXURY' ? colors.diamond : colors.highlight} fg={item.tier === 'LUXURY' ? colors.white : colors.ink} style={styles.fx} /> : null}
                <GiftIcon id={item.id} size={44} />
                <Text style={styles.name} numberOfLines={1}>{giftName(item)}</Text>
                {item.currency === 'DIAMOND' ? <DiamondAmount n={item.price} size={12} /> : <CoinAmount n={item.price} size={12} />}
              </Pressable>
            );
          }}
        />
        <View style={styles.counts}>
          {(almaz ? [1, 3, 5] : COUNTS).map((c) => (
            <Pressable key={c} onPress={() => { tap(); setCount(c); }} style={[styles.count, count === c && { backgroundColor: colors.ink }]}>
              <Text style={[styles.countText, count === c && { color: colors.bg }]}>×{c}</Text>
            </Pressable>
          ))}
        </View>
        <Btn
          style={{ marginTop: 12 }}
          kind={short ? 'coin' : 'primary'}
          icon={short ? 'add' : 'gift'}
          title={!gift ? t('gifts.pick') : short ? (almaz ? t('almaz.buy') : t('gifts.recharge')) : `${t('gifts.send')} · ${almaz ? `${fmtAlmaz(total)} 💎` : total}`}
          disabled={!gift}
          loading={sending}
          onPress={send}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,13,12,0.25)' },
  sheet: { paddingTop: 10, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  title: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.ink },
  to: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.coinSoft, paddingLeft: 10, paddingRight: 4, height: 36, borderRadius: radius.pill },
  plus: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.coin, alignItems: 'center', justifyContent: 'center' },
  cell: { flex: 1, maxWidth: '23.5%', alignItems: 'center', paddingTop: 10, paddingBottom: 8, borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent', backgroundColor: colors.card, gap: 3 },
  cellOn: { borderColor: colors.coin, backgroundColor: colors.coinSoft },
  fx: { position: 'absolute', top: 4, right: 4, height: 16, paddingHorizontal: 4 },
  name: { color: colors.ink, fontSize: 11, fontFamily: fonts.semibold, maxWidth: '92%' },
  counts: { flexDirection: 'row', gap: 6, marginTop: 12 },
  count: { flex: 1, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  almazInfo: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted, marginTop: 8 },
  countText: { color: colors.ink, fontFamily: fonts.black, fontSize: 12 },
});
