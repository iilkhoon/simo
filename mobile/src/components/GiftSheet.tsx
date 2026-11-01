import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { useStore } from '../store';
import { api, ApiError } from '../lib/api';
import { errorText, giftName } from '../lib/format';
import type { GiftEvent } from '../lib/types';
import { GiftIcon } from './GiftIcon';
import { CoinAmount } from './Badges';
import { Chip, GradientButton } from './ui';

const COUNTS = [1, 5, 10, 33, 99];
const CATS = ['popular', 'azerbaijan', 'luxury'] as const;

export function GiftSheet({ visible, onClose, receiverId, context, contextId, onSent }: {
  visible: boolean; onClose: () => void; receiverId: string; context: 'CHAT' | 'LIVE' | 'VIDEO' | 'CALL' | 'PROFILE'; contextId?: string;
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
  const total = (gift?.price ?? 0) * count;

  async function send() {
    if (!gift) return;
    if ((me?.coins ?? 0) < total) {
      toast(t('errors.INSUFFICIENT_COINS'), 'error');
      onClose();
      router.push('/wallet');
      return;
    }
    setSending(true);
    try {
      const r = await api<{ coins: number; event: GiftEvent }>('/gifts/send', { body: { giftId: gift.id, receiverId, count, context, contextId } });
      patchMe({ coins: r.coins });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSent?.(r.event);
      if (context !== 'LIVE') onClose();
    } catch (e) {
      toast(errorText(e), 'error');
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') {
        onClose();
        router.push('/wallet');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.grabber} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{t('gifts.title')}</Text>
          <Pressable
            onPress={() => {
              onClose();
              router.push('/wallet');
            }}
            style={styles.balance}
          >
            <CoinAmount n={me?.coins ?? 0} />
            <Text style={{ color: colors.gold, fontWeight: '700' }}>{t('gifts.recharge')} ›</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          {CATS.map((c) => (
            <Chip key={c} label={t(`gifts.${c}`)} active={cat === c} onPress={() => setCat(c)} />
          ))}
        </View>
        <FlatList
          data={list}
          numColumns={4}
          keyExtractor={(g) => g.id}
          style={{ maxHeight: 260 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelected(item.id)} style={[styles.cell, selected === item.id && styles.cellActive]}>
              <GiftIcon id={item.id} size={46} />
              <Text style={styles.name} numberOfLines={1}>{giftName(item)}</Text>
              <CoinAmount n={item.price} size={12} />
            </Pressable>
          )}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' }}>
            {COUNTS.map((c) => (
              <Pressable key={c} onPress={() => setCount(c)} style={[styles.count, count === c && { backgroundColor: colors.rose }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>×{c}</Text>
              </Pressable>
            ))}
          </View>
          <GradientButton small title={gift ? `${t('gifts.send')} · ${total}` : t('gifts.send')} disabled={!gift} loading={sending} onPress={send} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#1A0C2C', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, borderTopWidth: 1, borderColor: colors.border },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: 12 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  cell: { flex: 1 / 4, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, borderWidth: 1.5, borderColor: 'transparent', gap: 2 },
  cellActive: { borderColor: colors.rose, backgroundColor: 'rgba(255,77,141,0.12)' },
  name: { color: colors.text, fontSize: 11, fontWeight: '600', maxWidth: '95%' },
  count: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface2 },
});
