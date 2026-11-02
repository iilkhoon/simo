import React, { useCallback, useState } from 'react';
import { Dimensions, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, palette, radius, tintFor } from '@/theme';
import { EmptyState, GlassPill, IconBtn, LiveDot, Loader, PressBox, Screen, Segmented, T, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { CoinPill, LevelBadge } from '@/components/Badges';
import { Mascot, Wordmark } from '@/components/Logo';
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

  const [liveNow, setLiveNow] = useState<Room[] | null>(null);
  const load = useCallback(async (k: Tab) => {
    try {
      const r = await api<{ items: Room[] }>(`/live?tab=${k}`);
      setRooms(r.items);
      if (k === 'popular') setLiveNow(r.items);
      else void api<{ items: Room[] }>('/live?tab=popular').then((x) => setLiveNow(x.items)).catch(() => {});
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

  const stories = (liveNow ?? []).slice(0, 12);
  const header = (
    <View>
      <View style={styles.top}>
        <Wordmark size={30} />
        <View style={{ flex: 1 }} />
        <CoinPill n={me?.coins ?? 0} onPress={() => router.push('/wallet')} />
        <IconBtn name="bell" size={42} badge={unreadN} onPress={() => router.push('/notifications')} />
      </View>

      {/* Canlıdakılar — story sırası */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 6 }}>
        <Pressable style={styles.story} onPress={() => router.push('/live/start')}>
          <View style={styles.storyAdd}>
            <Avatar uri={me?.avatarUrl} name={me?.name} size={60} ring={false} />
            <View style={styles.storyPlus}><Icon name="add" size={16} color={colors.white} /></View>
          </View>
          <Text style={styles.storyName} numberOfLines={1}>{t('live.goLiveShort')}</Text>
        </Pressable>
        {stories.map((r) => (
          <Pressable key={r.id} style={styles.story} onPress={() => open(r)}>
            <Avatar uri={r.host.avatarUrl} name={r.host.name} size={60} live />
            <Text style={styles.storyName} numberOfLines={1}>{r.host.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Təsadüfi tanışlıq — əsas giriş nöqtəsi (düz rəng blokları) */}
      <View style={styles.quickRow}>
        <Pressable style={({ pressed }) => [styles.quick, { backgroundColor: colors.brand }, pressed && styles.pressed]} onPress={() => router.push({ pathname: '/match', params: { type: 'VIDEO' } })}>
          <View style={styles.quickMascot}><Mascot size={74} mood="wink" color={palette.orange} /></View>
          <View style={styles.quickIcon}><Icon name="videocam" size={20} color={colors.brand} /></View>
          <Text style={[styles.quickTitle, { color: colors.white }]}>{t('live.quickVideo')}</Text>
          <Text style={[styles.quickSub, { color: 'rgba(255,255,255,0.9)' }]}>{t('live.quickVideoSub')}</Text>
        </Pressable>
        <View style={{ flex: 1, gap: 10 }}>
          <Pressable style={({ pressed }) => [styles.quickSmall, { backgroundColor: colors.violet }, pressed && styles.pressed]} onPress={() => router.push({ pathname: '/match', params: { type: 'VOICE' } })}>
            <View style={[styles.quickIcon, { position: 'relative', top: 0, left: 0 }]}><Icon name="mic" size={18} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickTitleSm} numberOfLines={2}>{t('live.quickVoice')}</Text>
            </View>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.quickSmall, { backgroundColor: colors.highlight }, pressed && styles.pressed]} onPress={() => router.push('/leaderboard')}>
            <View style={[styles.quickIcon, { position: 'relative', top: 0, left: 0 }]}><Icon name="trophy" size={18} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickTitleSm} numberOfLines={2}>{t('leaderboard.title')}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.secRow}>
        <T v="h2" style={{ flex: 1 }}>{t('live.title')}</T>
        <View style={styles.liveCount}><LiveDot /><Text style={styles.liveCountText}>{compact((liveNow ?? []).length)}</Text></View>
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
        columnWrapperStyle={voice ? undefined : { gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 90, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl tintColor={colors.brand} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(tab); setRefreshing(false); }} />}
        ListEmptyComponent={rooms === null ? <Loader /> : <EmptyState icon={voice ? 'mic' : 'live'} title={t('live.empty')} tint={voice ? colors.diamondSoft : colors.brandSoft} />}
        renderItem={({ item, index }) => (voice ? <VoiceRow room={item} onPress={() => open(item)} /> : <VideoCard room={item} rank={tab === 'popular' ? index : -1} onPress={() => open(item)} />)}
      />
    </Screen>
  );
}

function VideoCard({ room, rank, onPress }: { room: Room; rank: number; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <PressBox style={{ width: W }} r={radius.lg} sh={2} bg={tintFor(room.host.name)} inner={{ height: W * 1.38 }} onPress={onPress}>
      {room.coverUrl ? <Image source={{ uri: room.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}><Text style={styles.ghost}>{room.host.name.slice(0, 1)}</Text></View>
      )}
      <LinearGradient colors={['rgba(16,14,13,0)', 'rgba(16,14,13,0.78)']} style={styles.scrim} pointerEvents="none" />
      <View style={styles.cardTop}>
        <GlassPill label={room.type === 'VOICE' ? 'VOICE' : 'LIVE'} icon={room.type === 'VOICE' ? 'mic' : 'radio'} bg={colors.brand} />
        <GlassPill label={compact(room.viewerCount)} icon="eye" />
      </View>
      {rank >= 0 && rank < 3 ? <View style={[styles.rank, { backgroundColor: [colors.coin, colors.card, colors.orangeSoft][rank] }]}><Text style={styles.rankText}>{rank + 1}</Text></View> : null}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{room.title || room.host.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <Avatar uri={room.host.avatarUrl} name={room.host.name} size={18} ring={false} />
          <Text style={styles.cardHost} numberOfLines={1}>{room.host.name}{room.host.distanceKm != null ? ` · ${t('common.km', { n: room.host.distanceKm })}` : ''}</Text>
        </View>
      </View>
    </PressBox>
  );
}

function VoiceRow({ room, onPress }: { room: Room; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <PressBox r={radius.lg} sh={2} onPress={onPress} inner={styles.voice}>
      <View style={[styles.voiceCover, { backgroundColor: tintFor(room.host.name) }]}>
        {room.coverUrl ? <Image source={{ uri: room.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <View style={styles.wave}>
          {[10, 18, 12, 20, 9].map((h, i) => <View key={i} style={[styles.bar, { height: h }]} />)}
        </View>
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={styles.voiceTitle} numberOfLines={1}>{room.title || room.host.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Avatar uri={room.host.avatarUrl} name={room.host.name} size={22} ring={false} />
          <T v="small" color={colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{room.host.name}</T>
          <LevelBadge level={room.host.charmLevel} kind="charm" />
        </View>
        <Tag label={t('live.listeners', { n: compact(room.viewerCount) })} icon="headset" bg={colors.lilac} />
      </View>
      <View style={styles.join}><Icon name="arrowRight" size={18} color={colors.white} /></View>
    </PressBox>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 12, minHeight: 54 },
  story: { width: 66, alignItems: 'center', gap: 6 },
  storyAdd: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center' },
  storyPlus: { position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, borderWidth: 2.5, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  storyName: { fontFamily: fonts.semibold, fontSize: 11.5, color: colors.ink, maxWidth: 66 },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quick: { flex: 1.15, padding: 16, height: 180, borderRadius: radius.xl, justifyContent: 'flex-end', overflow: 'hidden' },
  quickSmall: { flex: 1, borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { transform: [{ scale: 0.97 }] },
  quickMascot: { position: 'absolute', right: -10, top: -8, transform: [{ rotate: '12deg' }] },
  quickIcon: { position: 'absolute', top: 14, left: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontFamily: fonts.displayBlack, fontSize: 21, lineHeight: 23, letterSpacing: -0.7 },
  quickTitleSm: { fontFamily: fonts.display, fontSize: 14, lineHeight: 17, letterSpacing: -0.3, color: colors.ink },
  quickSub: { fontFamily: fonts.medium, fontSize: 12.5, marginTop: 4 },
  secRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 10 },
  liveCount: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, paddingHorizontal: 12, height: 30, borderRadius: 15 },
  liveCountText: { fontFamily: fonts.black, fontSize: 13, color: colors.ink },
  ghost: { fontFamily: fonts.displayBlack, fontSize: 80, color: 'rgba(26,21,18,0.12)' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  rank: { position: 'absolute', top: 42, left: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  cardInfo: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.white, letterSpacing: -0.3 },
  cardHost: { fontFamily: fonts.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.85)', flexShrink: 1 },
  voice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  voiceCover: { width: 76, height: 76, borderRadius: 18, overflow: 'hidden' },
  voiceTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  wave: { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'flex-end', gap: 2, backgroundColor: colors.card, borderRadius: 8, padding: 4 },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.diamond },
  join: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 14, right: 16 },
});
