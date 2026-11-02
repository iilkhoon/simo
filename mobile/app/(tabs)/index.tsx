import React, { useCallback, useState } from 'react';
import { Dimensions, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, tintFor } from '@/theme';
import { Box, Btn, EmptyState, IconBtn, Loader, PressBox, Screen, Segmented, T, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { CoinPill, LevelBadge } from '@/components/Badges';
import { Wordmark } from '@/components/Logo';
import { compact } from '@/lib/format';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

type Tab = 'popular' | 'voice' | 'new' | 'nearby' | 'following';
interface Room { id: string; type: 'VIDEO' | 'VOICE'; title: string; coverUrl: string | null; viewerCount: number; giftsCoins: number; host: PublicUser }

const SW = Dimensions.get('window').width;
const W = (SW - 32 - 12) / 2;

/** Canlı mərkəz: təsadüfi video/səsli tanışlıq + video yayınlar + səsli otaqlar */
export default function LiveHub() {
  const { t } = useTranslation();
  const me = useStore((s) => s.me);
  const unreadN = useStore((s) => s.unreadNotifications);
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

  const voice = tab === 'voice';
  const open = (r: Room) => router.push({ pathname: '/live/[id]', params: { id: r.id } });

  const header = (
    <View>
      <View style={styles.top}>
        <Wordmark size={28} />
        <View style={{ flex: 1 }} />
        <CoinPill n={me?.coins ?? 0} onPress={() => router.push('/wallet')} />
        <IconBtn name="bell" size={40} badge={unreadN} onPress={() => router.push('/notifications')} />
      </View>

      {/* Təsadüfi tanışlıq — əsas giriş nöqtəsi */}
      <View style={styles.quickRow}>
        <PressBox style={{ flex: 1 }} bg={colors.brand} r={radius.lg} sh={5} inner={styles.quick} onPress={() => router.push({ pathname: '/match', params: { type: 'VIDEO' } })}>
          <View style={styles.quickIcon}><Icon name="videocam" size={22} color={colors.ink} /></View>
          <Text style={[styles.quickTitle, { color: colors.white }]}>{t('live.quickVideo')}</Text>
          <Text style={[styles.quickSub, { color: 'rgba(255,255,255,0.88)' }]}>{t('live.quickVideoSub')}</Text>
          <Tag label="1:1" bg={colors.highlight} style={styles.quickTag} />
        </PressBox>
        <PressBox style={{ flex: 1 }} bg={colors.diamond} r={radius.lg} sh={5} inner={styles.quick} onPress={() => router.push({ pathname: '/match', params: { type: 'VOICE' } })}>
          <View style={styles.quickIcon}><Icon name="mic" size={22} color={colors.ink} /></View>
          <Text style={[styles.quickTitle, { color: colors.white }]}>{t('live.quickVoice')}</Text>
          <Text style={[styles.quickSub, { color: 'rgba(255,255,255,0.88)' }]}>{t('live.quickVoiceSub')}</Text>
          <Tag label="1:1" bg={colors.highlight} style={styles.quickTag} />
        </PressBox>
      </View>

      <View style={styles.secRow}>
        <T v="h2" style={{ flex: 1 }}>{t('live.title')}</T>
        <IconBtn name="trophy" size={38} bg={colors.coinSoft} onPress={() => router.push('/leaderboard')} />
      </View>
      <Segmented<Tab>
        value={tab}
        onChange={(k) => { setTab(k); setRooms(null); }}
        options={(['popular', 'voice', 'new', 'nearby', 'following'] as Tab[]).map((k) => ({ key: k, label: t(`live.${k}`), icon: k === 'voice' ? 'mic' : undefined }))}
      />
      <View style={{ height: 12 }} />
    </View>
  );

  return (
    <Screen>
      <FlatList
        key={voice ? 'list' : 'grid'}
        data={rooms ?? []}
        keyExtractor={(r) => r.id}
        numColumns={voice ? 1 : 2}
        columnWrapperStyle={voice ? undefined : { gap: 4 }}
        contentContainerStyle={{ gap: 8, paddingBottom: 90, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl tintColor={colors.brand} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(tab); setRefreshing(false); }} />}
        ListEmptyComponent={rooms === null ? <Loader /> : <EmptyState icon={voice ? 'mic' : 'live'} title={t('live.empty')} tint={voice ? colors.diamondSoft : colors.brandSoft} />}
        renderItem={({ item, index }) => (voice ? <VoiceRow room={item} onPress={() => open(item)} /> : <VideoCard room={item} rank={tab === 'popular' ? index : -1} onPress={() => open(item)} />)}
      />
      <View style={styles.fab}>
        <Btn full={false} kind="dark" title={t('live.goLive')} icon="add" onPress={() => router.push('/live/start')} />
      </View>
    </Screen>
  );
}

function VideoCard({ room, rank, onPress }: { room: Room; rank: number; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <PressBox style={{ width: W }} r={radius.lg} sh={4} bg={tintFor(room.host.name)} inner={{ height: W * 1.32 }} onPress={onPress}>
      {room.coverUrl ? <Image source={{ uri: room.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <View style={styles.cardTop}>
        <Tag label={room.type === 'VOICE' ? 'VOICE' : 'LIVE'} icon={room.type === 'VOICE' ? 'mic' : 'radio'} bg={colors.brand} fg={colors.white} />
        <Tag label={compact(room.viewerCount)} icon="eye" bg={colors.card} />
      </View>
      {rank >= 0 && rank < 3 ? <View style={[styles.rank, { backgroundColor: [colors.coin, colors.card, colors.brandSoft][rank] }]}><Text style={styles.rankText}>{rank + 1}</Text></View> : null}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{room.title || room.host.name}</Text>
        <Text style={styles.cardHost} numberOfLines={1}>{room.host.name}{room.host.distanceKm != null ? ` · ${t('common.km', { n: room.host.distanceKm })}` : ''}</Text>
      </View>
    </PressBox>
  );
}

function VoiceRow({ room, onPress }: { room: Room; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <PressBox r={radius.lg} sh={4} onPress={onPress} inner={styles.voice}>
      <Box r={16} sh={0} bg={tintFor(room.host.name)} inner={{ width: 74, height: 74 }}>
        {room.coverUrl ? <Image source={{ uri: room.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <View style={styles.wave}>
          {[10, 18, 12, 20, 9].map((h, i) => <View key={i} style={[styles.bar, { height: h }]} />)}
        </View>
      </Box>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.voiceTitle} numberOfLines={1}>{room.title || room.host.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Avatar uri={room.host.avatarUrl} name={room.host.name} size={22} />
          <T v="small" color={colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{room.host.name}</T>
          <LevelBadge level={room.host.charmLevel} kind="charm" />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Tag label={t('live.listeners', { n: compact(room.viewerCount) })} icon="headset" bg={colors.diamondSoft} />
        </View>
      </View>
      <View style={styles.join}><Icon name="arrowRight" size={18} color={colors.white} /></View>
    </PressBox>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 14 },
  quickRow: { flexDirection: 'row', gap: 6 },
  quick: { padding: 14, height: 150, justifyContent: 'flex-end' },
  quickIcon: { position: 'absolute', top: 12, left: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontFamily: fonts.displayBold, fontSize: 16, letterSpacing: -0.3 },
  quickSub: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  quickTag: { position: 'absolute', top: 14, right: 12, transform: [{ rotate: '6deg' }] },
  secRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 8 },
  rank: { position: 'absolute', top: 36, left: 8, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  cardInfo: { position: 'absolute', left: 6, right: 6, bottom: 6, backgroundColor: colors.card, borderRadius: 12, borderWidth: 2, borderColor: colors.ink, paddingHorizontal: 9, paddingVertical: 6 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },
  cardHost: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  voiceTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  wave: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'flex-end', gap: 2, backgroundColor: colors.card, borderRadius: 6, borderWidth: 1.5, borderColor: colors.ink, padding: 3 },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.diamond },
  join: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 14, right: 16 },
});
