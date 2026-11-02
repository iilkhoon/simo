import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, tintFor } from '@/theme';
import { Box, Btn, EmptyState, IconBtn, Loader, PressBox, Screen, T, Tag } from '@/components/ui';
import { Burst } from '@/components/Burst';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { CoinPill } from '@/components/Badges';
import { SwipeDeck, type SwipeAction } from '@/components/SwipeDeck';
import { api, ApiError } from '@/lib/api';
import { errorText } from '@/lib/format';
import { syncLocation } from '@/lib/media';
import { useStore } from '@/store';
import type { Me, PublicUser } from '@/lib/types';

export default function Discover() {
  const { t } = useTranslation();
  const { me, toast, setMe, unreadNotifications } = useStore();
  const [deck, setDeck] = useState<PublicUser[]>([]);
  const [daily, setDaily] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<{ user: PublicUser; conversationId: string } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const seen = useRef(new Set<string>());
  const fetching = useRef(false);

  const load = useCallback(async (reset = false) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const r = await api<{ items: PublicUser[] }>(`/discover?limit=20&seed=${Date.now()}`);
      if (reset) seen.current.clear();
      const fresh = r.items.filter((u) => !seen.current.has(u.id));
      fresh.forEach((u) => seen.current.add(u.id));
      setDeck((d) => (reset ? fresh : [...d, ...fresh]));
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void syncLocation(false).then(() => load(true));
    void api<{ items: PublicUser[] }>('/discover/daily').then((r) => setDaily(r.items)).catch(() => {});
  }, [load]);

  async function onSwipe(u: PublicUser, action: SwipeAction) {
    setDeck((d) => d.filter((x) => x.id !== u.id));
    if (deck.length <= 6) void load();
    try {
      const r = await api<{ matched: boolean; conversationId?: string; user?: PublicUser }>('/swipes', { body: { toId: u.id, action } });
      if (r.matched && r.conversationId) setMatch({ user: r.user ?? u, conversationId: r.conversationId });
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'LIKE_LIMIT' || e.code === 'SUPERLIKE_LIMIT')) {
        setDeck((d) => [u, ...d]);
        toast(e.code === 'LIKE_LIMIT' ? t('discover.likeLimit') : t('discover.superLimit'), 'error');
        router.push('/vip');
      } else toast(errorText(e), 'error');
    }
  }

  async function claim() {
    setClaiming(true);
    try {
      const r = await api<{ amount: number; me: Me }>('/rewards/checkin', { body: {} });
      setMe(r.me);
      toast(t('rewards.got', { n: r.amount }), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setClaiming(false);
    }
  }

  const nextReward = me ? me.checkin.rewards[me.checkin.streak % me.checkin.rewards.length] : 0;

  return (
    <Screen>
      <View style={styles.top}>
        <T v="h1" style={{ flex: 1 }}>{t('tabs.discover')}</T>
        <CoinPill n={me?.coins ?? 0} onPress={() => router.push('/wallet')} />
        <IconBtn name="location" size={40} onPress={() => router.push('/nearby')} />
        <IconBtn name="bell" size={40} badge={unreadNotifications} onPress={() => router.push('/notifications')} />
      </View>

      {me && !me.checkin.doneToday ? (
        <PressBox onPress={claim} disabled={claiming} bg={colors.coin} r={radius.md} sh={3} style={{ marginBottom: 12 }} inner={styles.checkin}>
          <View style={styles.giftDisc}><Icon name="gift" size={18} color={colors.ink} /></View>
          <Text style={styles.checkinText} numberOfLines={1}>{t('discover.checkinTitle')}</Text>
          <Tag label={`+${nextReward}`} bg={colors.card} />
          <Text style={styles.checkinCta}>{t('discover.checkinCta')}</Text>
        </PressBox>
      ) : null}

      {daily.length ? (
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Tag label={t('discover.daily').toUpperCase()} icon="sparkles" bg={colors.highlight} />
          </View>
          <FlatList
            horizontal
            data={daily}
            keyExtractor={(u) => u.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 8 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })} style={{ alignItems: 'center', width: 62 }}>
                <Avatar uri={item.avatarUrl} name={item.name} size={56} online={item.online} vipTier={item.vipTier} />
                <Text style={styles.dailyName} numberOfLines={1}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <View style={{ flex: 1, marginBottom: 2 }}>
        {loading ? (
          <Loader full />
        ) : deck.length ? (
          <SwipeDeck users={deck} myInterests={me?.interests ?? []} onSwipe={onSwipe} />
        ) : (
          <EmptyState
            icon="compass"
            title={t('discover.emptyTitle')}
            sub={t('discover.emptySub')}
            action={<Btn full={false} kind="light" size="md" title={t('common.retry')} icon="refresh" onPress={() => { setLoading(true); void load(true); }} />}
          />
        )}
      </View>

      <Modal visible={!!match} transparent animationType="fade" onRequestClose={() => setMatch(null)}>
        <View style={styles.match}>
          <View style={{ position: 'absolute', top: '12%', zIndex: 0 }}><Burst size={340} points={16} color={colors.coin} /></View>
          <View style={{ zIndex: 1, alignItems: 'center', width: '100%' }}>
          <Text style={styles.matchTitle}>{t('discover.matchTitle')}</Text>
          <Text style={styles.matchSub}>{t('discover.matchSub', { name: match?.user.name })}</Text>
          <View style={{ flexDirection: 'row', marginVertical: 40 }}>
            <Box r={24} sh={5} bg={tintFor(me?.name)} style={{ transform: [{ rotate: '-8deg' }] }} inner={{ width: 130, height: 160 }}>
              {me?.avatarUrl ? <Image source={{ uri: me.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            </Box>
            <Box r={24} sh={5} bg={tintFor(match?.user.name)} style={{ transform: [{ rotate: '8deg' }], marginLeft: -26, marginTop: 20 }} inner={{ width: 130, height: 160 }}>
              {match?.user.avatarUrl ? <Image source={{ uri: match.user.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            </Box>
          </View>
          <View style={{ width: '100%', gap: 10 }}>
            <Btn
              kind="dark"
              title={t('discover.sayHi')}
              icon="chat"
              onPress={() => {
                const id = match?.conversationId;
                setMatch(null);
                if (id) router.push({ pathname: '/chat/[id]', params: { id } });
              }}
            />
            <Btn kind="light" title={t('discover.keepSwiping')} onPress={() => setMatch(null)} />
          </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 12 },
  checkin: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10 },
  giftDisc: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  checkinText: { flex: 1, color: colors.ink, fontFamily: fonts.bold, fontSize: 14 },
  checkinCta: { color: colors.bg, backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: 'hidden', fontFamily: fonts.bold, fontSize: 12 },
  dailyName: { color: colors.ink, fontSize: 11, marginTop: 5, fontFamily: fonts.semibold },
  match: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.brand },
  matchTitle: { color: colors.white, fontSize: 40, fontFamily: fonts.display, letterSpacing: -1.5, textAlign: 'center', textShadowColor: colors.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0.1 },
  matchSub: { color: colors.white, fontSize: 16, marginTop: 8, fontFamily: fonts.semibold, textAlign: 'center' },
});
