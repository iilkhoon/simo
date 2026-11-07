import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, elev, radius } from '@/theme';
import { Btn, EmptyState, Header, Loader, Screen, T, Tabs, Tag } from '@/components/ui';
import { Appear } from '@/components/motion';
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
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => api<{ items: Order[] }>(`/orders?as=${as}`).then((r) => setItems(r.items)).catch(() => setItems((x) => x ?? [])), [as]);
  useEffect(() => { setItems(null); void load(); }, [load]);
  async function act(id: string, action: 'accept' | 'decline' | 'cancel' | 'complete') {
    setBusy(`${id}:${action}`);
    try { await api(`/orders/${id}/${action}`, { body: {} }); await load(); } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(null); }
  }
  const ld = (id: string, a: string) => busy === `${id}:${a}`;
  /** "Yaz" — birbaşa söhbəti açır (əvvəl profilə aparırdı) */
  async function openChat(orderId: string, userId: string) {
    setBusy(`${orderId}:chat`);
    try {
      const r = await api<{ id: string }>(`/conversations/with/${userId}`, { method: 'POST', body: {} });
      router.push({ pathname: '/chat/[id]', params: { id: r.id } });
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(null); }
  }
  return (
    <Screen>
      <Header title={t('orders.title')} />
      <Tabs value={as} onChange={setAs} options={[{ key: 'buyer', label: t('orders.bought') }, { key: 'seller', label: t('orders.sold') }]} />
      {items === null ? <View style={{ paddingTop: 14 }}><Loader variant="list" n={4} /></View> : (
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ gap: 12, paddingVertical: 14, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.brand} colors={[colors.brand]} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="receipt" title={t('orders.empty')} sub={as === 'buyer' ? t('u2.ordersEmptyBuyer') : t('u2.ordersEmptySeller')} action={as === 'seller' ? <Btn full={false} size="md" icon="add" title={t('services.add')} onPress={() => router.push('/services')} /> : undefined} />}
        renderItem={({ item: o, index }) => (
          <Appear i={index}>
          <View style={[styles.card, elev(1)]}>
            <View style={styles.head}>
              <Avatar uri={o.other?.avatarUrl} name={o.other?.name} size={34} />
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" numberOfLines={1}>{o.other?.name ?? '—'}</T>
                <T v="tiny" color={colors.textMuted}>{timeAgo(o.createdAt)}</T>
              </View>
              <Tag label={t(`orders.status.${o.status}`)} bg={TINT[o.status]} style={{ height: 26, paddingHorizontal: 10 }} />
            </View>
            <ServiceCard s={o.service} />
            {o.note ? <View style={styles.note}><T v="small" color={colors.textMuted}>“{o.note}”</T></View> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {as === 'seller' && o.status === 'PENDING' ? (
                <>
                  <View style={{ flex: 1 }}><Btn size="md" title={t('orders.accept')} loading={ld(o.id, 'accept')} onPress={() => void act(o.id, 'accept')} /></View>
                  <View style={{ flex: 1 }}><Btn size="md" kind="ghost" title={t('orders.decline')} loading={ld(o.id, 'decline')} onPress={() => void act(o.id, 'decline')} /></View>
                </>
              ) : null}
              {as === 'seller' && o.status === 'ACCEPTED' ? <View style={{ flex: 1 }}><Btn size="md" kind="dark" icon="checkmark" title={t('orders.complete')} loading={ld(o.id, 'complete')} onPress={() => void act(o.id, 'complete')} /></View> : null}
              {as === 'buyer' && o.status === 'PENDING' ? <View style={{ flex: 1 }}><Btn size="md" kind="ghost" title={t('orders.cancel')} loading={ld(o.id, 'cancel')} onPress={() => void act(o.id, 'cancel')} /></View> : null}
              {o.other && (o.status === 'PENDING' || o.status === 'ACCEPTED') ? <Btn full={false} size="md" kind="ghost" icon="chat" title={t('orders.chat')} loading={ld(o.id, 'chat')} onPress={() => void openChat(o.id, o.other!.id)} /> : null}
            </View>
          </View>
          </Appear>
        )}
      />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  note: { backgroundColor: colors.bgSunken, borderRadius: radius.sm, padding: 10 },
});
