import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius } from '@/theme';
import { Btn, EmptyState, Header, Screen, T, Tabs, Tag } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { ServiceCard, type Service } from '@/components/Services';
import { api } from '@/lib/api';
import { errorText, timeAgo } from '@/lib/format';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

interface Order { id: string; status: 'PENDING' | 'ACCEPTED' | 'DONE' | 'CANCELLED' | 'DECLINED'; price: number; note: string; createdAt: string; service: Service; other: PublicUser | null }
const TINT: Record<Order['status'], string> = { PENDING: colors.highlight, ACCEPTED: colors.skySoft, DONE: colors.onlineSoft, CANCELLED: colors.bgSunken, DECLINED: colors.brandSoft };

/** Sifarişlər: aldıqlarım / satdıqlarım; satıcı qəbul edir → tamamlayır, alıcı gözləyən sifarişi ləğv edə bilər */
export default function Orders() {
  const { t } = useTranslation();
  const { toast } = useStore();
  const params = useLocalSearchParams<{ as?: 'buyer' | 'seller' }>();
  const [as, setAs] = useState<'buyer' | 'seller'>(params.as === 'seller' ? 'seller' : 'buyer');
  const [items, setItems] = useState<Order[] | null>(null);
  const load = useCallback(() => { void api<{ items: Order[] }>(`/orders?as=${as}`).then((r) => setItems(r.items)).catch(() => setItems([])); }, [as]);
  useEffect(load, [load]);
  async function act(id: string, action: 'accept' | 'decline' | 'cancel' | 'complete') {
    try { await api(`/orders/${id}/${action}`, { body: {} }); load(); } catch (e) { toast(errorText(e), 'error'); }
  }
  return (
    <Screen>
      <Header title={t('orders.title')} />
      <Tabs value={as} onChange={setAs} options={[{ key: 'buyer', label: t('orders.bought') }, { key: 'seller', label: t('orders.sold') }]} />
      <FlatList
        data={items ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ gap: 12, paddingVertical: 14, flexGrow: 1 }}
        ListEmptyComponent={items ? <EmptyState icon="receipt" pose="think" title={t('orders.empty')} /> : undefined}
        renderItem={({ item: o }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <Avatar uri={o.other?.avatarUrl} name={o.other?.name} size={34} />
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" numberOfLines={1}>{o.other?.name ?? '—'}</T>
                <T v="tiny" color={colors.textMuted}>{timeAgo(o.createdAt)}</T>
              </View>
              <Tag label={t(`orders.status.${o.status}`)} bg={TINT[o.status]} style={{ height: 26, paddingHorizontal: 10 }} />
            </View>
            <ServiceCard s={o.service} />
            {o.note ? <T v="small" color={colors.textMuted}>“{o.note}”</T> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {as === 'seller' && o.status === 'PENDING' ? (
                <>
                  <View style={{ flex: 1 }}><Btn size="md" title={t('orders.accept')} onPress={() => void act(o.id, 'accept')} /></View>
                  <View style={{ flex: 1 }}><Btn size="md" kind="light" title={t('orders.decline')} onPress={() => void act(o.id, 'decline')} /></View>
                </>
              ) : null}
              {as === 'seller' && o.status === 'ACCEPTED' ? <View style={{ flex: 1 }}><Btn size="md" kind="dark" icon="checkmark" title={t('orders.complete')} onPress={() => void act(o.id, 'complete')} /></View> : null}
              {as === 'buyer' && o.status === 'PENDING' ? <View style={{ flex: 1 }}><Btn size="md" kind="light" title={t('orders.cancel')} onPress={() => void act(o.id, 'cancel')} /></View> : null}
              {o.other && (o.status === 'PENDING' || o.status === 'ACCEPTED') ? <Btn full={false} size="md" kind="light" icon="chat" title={t('orders.chat')} onPress={() => router.push({ pathname: '/user/[id]', params: { id: o.other!.id } })} /> : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
