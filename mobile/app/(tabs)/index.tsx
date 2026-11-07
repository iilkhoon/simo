import React, { useCallback, useState } from 'react';
import { useTabSpace } from '@/components/Glass';
import { Dimensions, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, glow, gradients, palette, radius, tintFor } from '@/theme';
import { Appear, Pressable3, Pulse, Shine } from '@/components/motion';
import { EmptyState, GlassPill, IconBtn, LiveDot, Loader, PressBox, Screen, Segmented, T, Tabs, Tag } from '@/components/ui';
import Discover from './discover';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { CoinPill, LevelBadge } from '@/components/Badges';
import { Wordmark } from '@/components/Logo';
import { Mascot } from '@/components/Mascot';
import { CampaignBanner } from '@/components/CampaignBanner';
import { compact } from '@/lib/format';
import { api } from '@/lib/api';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

type Tab = 'popular' | 'voice' | 'new' | 'nearby' | 'following';
interface Room { id: string; type: 'VIDEO' | 'VOICE'; title: string; coverUrl: string | null; viewerCount: number; giftsCoins: number; host: PublicUser }

const SW = Dimensions.get('window').width;
const W = (SW - 32 - 12) / 2;

/** Canlı mərkəz: təsadüfi video/səsli tanışlıq + video yayınlar + səsli otaqlar */
type Mode = 'live' | 'discover';
export interface StoryGroup { user: PublicUser; liveRoomId: string | null; unseen: boolean; stories: { id: string; mediaUrl: string; mediaType: 'PHOTO' | 'VIDEO'; createdAt: string; seen: boolean }[] }

export default function LiveHub() {
  const [mode, setMode] = useState<Mode>('live');
  const { t } = useTranslation();
  const tabSpace = useTabSpace();
  const me = useStore((s) => s.me);
  const unreadN = useStore((s) => s.unreadNotifications);
  const [tab, setTab] = useState<Tab>('popular');
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [liveNow, setLiveNow] = useState<Room[] | null>(null);
  const [stories, setStories] = useState<StoryGroup[]>([]);
  const myStory = stories.find((s) => s.user.id === me?.id && s.stories.length);
  const load = useCallback(async (k: Tab) => {
    try {
      const r = await api<{ items: Room[] }>(`/live?tab=${k}`);
      setRooms(r.items);
      void api<{ items: StoryGroup[] }>('/stories/feed').then((x) => setStories(x.items)).catch(() => {});
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

  const header = (
    <View>

      {/* Story sırası: əvvəl canlıda olanlar, sonra izlədiklərin story-ləri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 6 }}>
        <Pressable style={styles.story} onPress={() => router.push(myStory ? { pathname: '/story/[userId]', params: { userId: me!.id } } : '/story/new')}>
          <View style={styles.storyAdd}>
            <View style={[styles.storyRing, { borderColor: myStory ? colors.brand : 'transparent' }]}>
              <Avatar uri={me?.avatarUrl} name={me?.name} size={56} ring={false} />
            </View>
            <Pressable onPress={() => router.push('/story/new')} style={styles.storyPlus} hitSlop={6}><Icon name="add" size={16} color={colors.white} /></Pressable>
          </View>
          <Text style={styles.storyName} numberOfLines={1}>{t('stories.mine')}</Text>
        </Pressable>
        {stories.filter((s) => s.user.id !== me?.id).map((s) => (
          <Pressable key={s.user.id} style={styles.story} onPress={() => (s.liveRoomId ? router.push({ pathname: '/live/[id]', params: { id: s.liveRoomId } }) : router.push({ pathname: '/story/[userId]', params: { userId: s.user.id } }))}>
            {s.liveRoomId ? <Avatar uri={s.user.avatarUrl} name={s.user.name} size={66} live /> : (
              <View style={[styles.storyRing, { borderColor: s.unseen ? colors.brand : 'rgba(26,21,18,0.15)' }]}>
                <Avatar uri={s.user.avatarUrl} name={s.user.name} size={56} ring={false} />
              </View>
            )}
            <Text style={styles.storyName} numberOfLines={1}>{s.user.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Mövsümi kampaniya (Novruz, 8 Mart...) — yoxdursa heç nə göstərmir */}
      <CampaignBanner style={{ marginTop: 6 }} />

      {/* Təsadüfi tanışlıq — əsas giriş nöqtəsi (düz rəng blokları) */}
      <View style={styles.quickRow}>
        <Pressable3 scaleTo={0.96} style={[styles.quick, { backgroundColor: colors.brand }, glow(colors.brand)]} onPress={() => router.push({ pathname: '/match', params: { type: 'VIDEO' } })}>
          <LinearGradient colors={gradients.nar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]} />
          <View style={styles.quickGlow} />
          <Shine />
          <View style={styles.quickMascot}><Mascot size={92} pose="call" float={false} /></View>
          <View style={styles.quickIcon}><Icon name="videocam" size={20} color={colors.brand} /></View>
          <Text style={[styles.quickTitle, { color: colors.white }]}>{t('live.quickVideo')}</Text>
          <Text style={[styles.quickSub, { color: 'rgba(255,255,255,0.9)' }]}>{t('live.quickVideoSub')}</Text>
        </Pressable3>
        <View style={{ flex: 1, gap: 10 }}>
          <Pressable3 scaleTo={0.95} style={[styles.quickSmall, { backgroundColor: colors.violet }]} onPress={() => router.push({ pathname: '/match', params: { type: 'VOICE' } })}>
            <LinearGradient colors={gradients.lilac} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
            <View style={[styles.quickIcon, { position: 'relative', top: 0, left: 0 }]}><Icon name="mic" size={18} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickTitleSm} numberOfLines={2}>{t('live.quickVoice')}</Text>
            </View>
          </Pressable3>
          <Pressable3 scaleTo={0.95} style={[styles.quickSmall, { backgroundColor: colors.highlight }]} onPress={() => router.push('/leaderboard')}>
            <LinearGradient colors={gradients.lime} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
            <View style={[styles.quickIcon, { position: 'relative', top: 0, left: 0 }]}><Icon name="trophy" size={18} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickTitleSm} numberOfLines={2}>{t('leaderboard.title')}</Text>
            </View>
          </Pressable3>
        </View>
      </View>

      <View style={styles.secRow}>
        <T v="h2" style={{ flex: 1 }}>{t('live.title')}</T>
        <View style={styles.liveCount}><View style={{ width: 7, height: 7, alignItems: 'center', justifyContent: 'center' }}><Pulse size={7} /><LiveDot /></View><Text style={styles.liveCountText}>{compact((liveNow ?? []).length)}</Text></View>
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
      <View style={styles.top}>
        <Wordmark size={28} />
        <View style={{ flex: 1 }} />
        <CoinPill n={me?.coins ?? 0} onPress={() => router.push('/wallet')} />
        <IconBtn name="search" size={42} onPress={() => router.push('/search')} />
        <IconBtn name="bell" size={42} badge={unreadN} onPress={() => router.push('/notifications')} />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Tabs<Mode> value={mode} onChange={setMode} options={[{ key: 'live', label: t('tabs.live') }, { key: 'discover', label: t('tabs.discover') }]} />
      </View>
      {mode === 'discover' ? <Discover embedded /> : (
      <FlatList
        key={voice ? 'list' : 'grid'}
        data={rooms ?? []}
        keyExtractor={(r) => r.id}
        numColumns={voice ? 1 : 2}
        columnWrapperStyle={voice ? undefined : { gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: tabSpace + 8, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl tintColor={colors.brand} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(tab); setRefreshing(false); }} />}
        ListEmptyComponent={rooms === null ? <Loader variant={voice ? 'list' : 'grid'} width={W} n={4} /> : <EmptyState compact icon={voice ? 'mic' : 'live'} title={t('live.empty')} sub={t('ui.liveEmptySub')} />}
        renderItem={({ item, index }) => <Appear i={index} from="fade">{voice ? <VoiceRow room={item} onPress={() => open(item)} /> : <VideoCard room={item} rank={tab === 'popular' ? index : -1} onPress={() => open(item)} />}</Appear>}
      />
      )}
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
        <GlassPill label={room.type === 'VOICE' ? t('tags.voice') : t('tags.live')} icon={room.type === 'VOICE' ? 'mic' : 'radio'} bg={colors.brand} />
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
  story: { width: 68, alignItems: 'center', gap: 8 },
  storyAdd: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center' },
  storyRing: { width: 66, height: 66, borderRadius: 33, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  storyPlus: { position: 'absolute', right: 2, bottom: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brand, borderWidth: 2.5, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  storyName: { fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 14, color: colors.ink, maxWidth: 68, textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  quick: { flex: 1.15, padding: 16, height: 180, borderRadius: radius.xl, justifyContent: 'flex-end', overflow: 'hidden' },
  quickSmall: { flex: 1, borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  pressed: { transform: [{ scale: 0.97 }] },
  quickMascot: { position: 'absolute', right: -14, top: -10 },
  quickGlow: { position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,214,120,0.35)' },
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
