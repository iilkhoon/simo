import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTabSpace } from '@/components/Glass';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, palette, radius, tintFor } from '@/theme';
import { Box, Btn, EmptyState, IconBtn, Loader, PressBox, Screen, SpeechBlock, T, Tag } from '@/components/ui';
import { MatchCelebration } from '@/components/MatchCelebration';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { CoinPill } from '@/components/Badges';
import { SwipeDeck, type SwipeAction } from '@/components/SwipeDeck';
import { api, ApiError } from '@/lib/api';
import { errorText } from '@/lib/format';
import { syncLocation } from '@/lib/media';
import { useStore } from '@/store';
import type { Me, PublicUser } from '@/lib/types';

/** `embedded` — Ana ekranın "Kəşf" bölməsi kimi (öz başlığı və Screen-i olmadan) */
export default function Discover({ embedded }: { embedded?: boolean } = {}) {
  const { t } = useTranslation();
  const tabSpace = useTabSpace();
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
    <Wrap embedded={embedded} pad={tabSpace}>
      {!embedded ? (
        <View style={styles.top}>
          <T v="h1" style={{ flex: 1 }}>{t('tabs.discover')}</T>
          <CoinPill n={me?.coins ?? 0} onPress={() => router.push('/wallet')} />
          <IconBtn name="search" size={40} onPress={() => router.push('/search')} />
          <IconBtn name="location" size={40} onPress={() => router.push('/nearby')} />
          <IconBtn name="bell" size={40} badge={unreadNotifications} onPress={() => router.push('/notifications')} />
        </View>
      ) : null}

      {me && !me.checkin.doneToday ? (
        <PressBox onPress={claim} disabled={claiming} bg={colors.highlight} r={radius.pill} sh={0} style={{ marginBottom: 12 }} inner={styles.checkin}>
          <View style={styles.giftDisc}><Icon name="gift" size={18} color={colors.ink} /></View>
          <Text style={styles.checkinText} numberOfLines={1}>{t('discover.checkinTitle')}</Text>
          <Tag label={`+${nextReward}`} bg={colors.card} />
          <Text style={styles.checkinCta}>{t('discover.checkinCta')}</Text>
        </PressBox>
      ) : null}

      {daily.length ? (
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Icon name="sparkles" size={15} color={colors.brand} />
            <T v="h3" style={{ fontSize: 15 }}>{t('discover.daily')}</T>
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
          <Skeleton h={480} r={28} style={{ flex: 1 }} />
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
        <MatchCelebration me={{ avatarUrl: me?.avatarUrl, name: me?.name }} other={{ avatarUrl: match?.user.avatarUrl, name: match?.user.name }} title={t('discover.matchTitle')} sub={t('discover.matchSub', { name: match?.user.name })}>
          <View style={{ width: '100%', gap: 10 }}>
            <Btn
              kind="light"
              title={t('discover.sayHi')}
              icon="chat"
              onPress={() => {
                const id = match?.conversationId;
                setMatch(null);
                if (id) router.push({ pathname: '/chat/[id]', params: { id } });
              }}
            />
            <Btn kind="ghost" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} title={t('discover.keepSwiping')} onPress={() => setMatch(null)} />
          </View>
        </MatchCelebration>
      </Modal>
    </Wrap>
  );
}

function Wrap({ embedded, children, pad }: { embedded?: boolean; children: React.ReactNode; pad: number }) {
  return embedded ? <View style={{ flex: 1, paddingBottom: pad - 6 }}>{children}</View> : <Screen style={{ paddingBottom: pad - 6 }}>{children}</Screen>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6, paddingBottom: 12, minHeight: 54 },
  checkin: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 7 },
  giftDisc: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  checkinText: { flex: 1, color: colors.ink, fontFamily: fonts.bold, fontSize: 14 },
  checkinCta: { color: colors.bg, backgroundColor: colors.ink, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: 'hidden', fontFamily: fonts.bold, fontSize: 12 },
  dailyName: { color: colors.ink, fontSize: 11, marginTop: 5, fontFamily: fonts.semibold },
  match: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.brand },
  matchTitle: { color: colors.white, fontSize: 40, fontFamily: fonts.display, letterSpacing: -1.5, textAlign: 'center', textShadowColor: colors.ink, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0.1 },
  matchSub: { color: colors.white, fontSize: 16, marginTop: 22, fontFamily: fonts.semibold, textAlign: 'center' },
});
