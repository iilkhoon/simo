import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { EmptyState, GradientButton, Loader, OutlineButton, Screen } from '@/components/ui';
import { Wordmark } from '@/components/Logo';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { CoinAmount } from '@/components/Badges';
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
        <Wordmark size={30} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.push('/wallet')} style={styles.coins}>
            <CoinAmount n={me?.coins ?? 0} />
            <Icon name="addCircle" size={18} color={colors.gold} />
          </Pressable>
          <Pressable onPress={() => router.push('/nearby')} style={styles.iconBtn}><Icon name="location" size={20} /></Pressable>
          <Pressable onPress={() => router.push('/notifications')} style={styles.iconBtn}>
            <Icon name="bell" size={20} />
            {unreadNotifications ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>
      </View>

      {me && !me.checkin.doneToday ? (
        <Pressable onPress={claim} disabled={claiming}>
          <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.checkin}>
            <Text style={{ fontSize: 22 }}>🎁</Text>
            <Text style={styles.checkinText}>{t('discover.checkinTitle')} · +{nextReward}</Text>
            <Text style={styles.checkinCta}>{t('discover.checkinCta')}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}

      {daily.length ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={[font.h3, { marginBottom: 8 }]}>✨ {t('discover.daily')}</Text>
          <FlatList
            horizontal
            data={daily}
            keyExtractor={(u) => u.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })} style={{ alignItems: 'center', width: 64 }}>
                <Avatar uri={item.avatarUrl} name={item.name} size={58} online={item.online} vipTier={item.isHost ? 'DIAMOND' : item.vipTier} />
                <Text style={styles.dailyName} numberOfLines={1}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}

      <View style={{ flex: 1, marginBottom: 4 }}>
        {loading ? (
          <Loader full />
        ) : deck.length ? (
          <SwipeDeck users={deck} myInterests={me?.interests ?? []} onSwipe={onSwipe} />
        ) : (
          <EmptyState
            icon="compass"
            title={t('discover.emptyTitle')}
            sub={t('discover.emptySub')}
            action={<OutlineButton small title={t('common.retry')} icon="refresh" onPress={() => { setLoading(true); void load(true); }} />}
          />
        )}
      </View>

      <Modal visible={!!match} transparent animationType="fade" onRequestClose={() => setMatch(null)}>
        <LinearGradient colors={['rgba(255,77,141,0.92)', 'rgba(123,92,255,0.95)']} style={styles.match}>
          <Text style={styles.matchTitle}>{t('discover.matchTitle')}</Text>
          <Text style={styles.matchSub}>{t('discover.matchSub', { name: match?.user.name })}</Text>
          <View style={{ flexDirection: 'row', marginVertical: 40 }}>
            <View style={{ transform: [{ rotate: '-8deg' }] }}><Avatar uri={me?.avatarUrl} size={130} /></View>
            <View style={{ transform: [{ rotate: '8deg' }], marginLeft: -24 }}><Avatar uri={match?.user.avatarUrl} size={130} /></View>
          </View>
          <View style={{ width: '100%', gap: 12 }}>
            <GradientButton
              title={t('discover.sayHi')}
              icon="chat"
              colors={['#fff', '#FFE6F0']}
              textStyle={{ color: colors.rose }}
              onPress={() => {
                const id = match?.conversationId;
                setMatch(null);
                if (id) router.push({ pathname: '/chat/[id]', params: { id } });
              }}
            />
            <OutlineButton title={t('discover.keepSwiping')} onPress={() => setMatch(null)} />
          </View>
        </LinearGradient>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 6, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.rose },
  checkin: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, marginBottom: 10 },
  checkinText: { flex: 1, color: '#3A1F00', fontWeight: '800' },
  checkinCta: { color: '#fff', backgroundColor: colors.rose, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, overflow: 'hidden', fontWeight: '800' },
  dailyName: { color: colors.text, fontSize: 11, marginTop: 4, fontWeight: '600' },
  match: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  matchTitle: { color: '#fff', fontSize: 44, fontWeight: '900', fontStyle: 'italic' },
  matchSub: { color: '#fff', fontSize: 16, marginTop: 6, opacity: 0.9 },
});
