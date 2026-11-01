import React, { useCallback, useState } from 'react';
import { Dimensions, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { EmptyState, GradientButton, Loader, Screen, Segmented } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { compact } from '@/lib/format';
import { api } from '@/lib/api';
import type { PublicUser } from '@/lib/types';

type Tab = 'popular' | 'new' | 'nearby' | 'voice' | 'following';
interface Room { id: string; type: 'VIDEO' | 'VOICE'; title: string; coverUrl: string | null; viewerCount: number; giftsCoins: number; host: PublicUser }

const W = (Dimensions.get('window').width - 16 * 2 - 10) / 2;

export default function Live() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('popular');
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (k: Tab) => {
    try {
      const r = await api<{ items: Room[] }>(`/live?tab=${k}`);
      setRooms(r.items);
    } catch {
      setRooms([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(tab);
      const id = setInterval(() => void load(tab), 15000);
      return () => clearInterval(id);
    }, [tab, load]),
  );

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
        <Text style={font.h1}>{t('live.title')}</Text>
        <Pressable onPress={() => router.push('/leaderboard')} style={styles.iconBtn}><Icon name="trophy" size={20} color={colors.gold} /></Pressable>
      </View>
      <Segmented<Tab>
        value={tab}
        onChange={(k) => { setTab(k); setRooms(null); }}
        options={(['popular', 'new', 'voice', 'nearby', 'following'] as Tab[]).map((k) => ({ key: k, label: t(`live.${k}`) }))}
      />
      {rooms === null ? (
        <Loader full />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ gap: 10, paddingTop: 10, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={<RefreshControl tintColor={colors.rose} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(tab); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="live" title={t('live.empty')} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/live/[id]', params: { id: item.id } })} style={[styles.card, { width: W }]}>
              {item.coverUrl ? <Image source={{ uri: item.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} />
              <View style={styles.topRow}>
                <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.liveTag}>
                  <Icon name={item.type === 'VOICE' ? 'mic' : 'live'} size={11} />
                  <Text style={styles.liveText}>{item.type === 'VOICE' ? 'VOICE' : 'LIVE'}</Text>
                </LinearGradient>
                <View style={styles.viewers}><Icon name="eye" size={11} /><Text style={styles.viewersText}>{compact(item.viewerCount)}</Text></View>
              </View>
              <View style={styles.bottom}>
                <Text style={styles.title} numberOfLines={1}>{item.title || item.host.name}</Text>
                <Text style={styles.host} numberOfLines={1}>{item.host.name}{item.host.distanceKm != null ? ` · ${t('common.km', { n: item.host.distanceKm })}` : ''}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
      <View style={styles.fab}>
        <GradientButton title={t('live.goLive')} icon="live" onPress={() => router.push('/live/start')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  card: { height: W * 1.35, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 8 },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  viewers: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  viewersText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bottom: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  title: { color: '#fff', fontWeight: '800', fontSize: 14 },
  host: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  fab: { position: 'absolute', bottom: 16, alignSelf: 'center' },
});
