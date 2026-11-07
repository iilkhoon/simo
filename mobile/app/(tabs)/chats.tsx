import React, { useCallback, useState } from 'react';
import { useTabSpace } from '@/components/Glass';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts } from '@/theme';
import { Badge, Btn, EmptyState, IconBtn, Loader, Screen, T, Tabs, TitleBar } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/Badges';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { duration, timeAgo } from '@/lib/format';
import { startCall } from '@/lib/calls';
import { useSocket } from '@/lib/socket';
import { useStore } from '@/store';
import type { Call, PublicUser } from '@/lib/types';

interface Conv { id: string; user: PublicUser; lastMessageText: string; lastMessageAt: string; unread: number }
interface CallRow extends Call { createdAt: string; endedAt: string | null; peer: PublicUser | null }

export default function Chats() {
  const { t } = useTranslation();
  const tabSpace = useTabSpace();
  const setUnread = useStore((s) => s.setUnreadChats);
  const myId = useStore((s) => s.me?.id);
  const [tab, setTab] = useState<'chats' | 'calls'>('chats');
  const [items, setItems] = useState<Conv[] | null>(null);
  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [matches, setMatches] = useState<PublicUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([api<{ items: Conv[] }>('/conversations'), api<{ items: PublicUser[] }>('/matches')]);
      setItems(c.items);
      setUnread(c.items.reduce((a, x) => a + x.unread, 0));
      const withChat = new Set(c.items.filter((x) => x.lastMessageText).map((x) => x.user.id));
      setMatches(m.items.filter((u) => !withChat.has(u.id)));
    } catch {
      setItems((cur) => cur ?? []);
    }
  }, [setUnread]);

  const loadCalls = useCallback(async () => {
    try {
      setCalls((await api<{ items: CallRow[] }>('/calls')).items);
    } catch {
      setCalls((cur) => cur ?? []);
    }
  }, []);

  // useSocket: ekran socket yaranmamışdan əvvəl açıla bilər (soyuq başlanğıc) — getSocket() o an null idi və
  // siyahı yeni mesaj/uyğunluqda yenilənmirdi (badge artırdı, siyahı boş qalırdı)
  const sock = useSocket();
  useFocusEffect(
    useCallback(() => {
      void load();
      void loadCalls();
      const s = sock;
      const h = () => void load();
      s?.on('message:new', h);
      s?.on('match', h);
      return () => {
        s?.off('message:new', h);
        s?.off('match', h);
      };
    }, [load, loadCalls, sock]),
  );

  async function openMatch(u: PublicUser) {
    const r = await api<{ id: string }>(`/conversations/with/${u.id}`, { method: 'POST', body: {} });
    router.push({ pathname: '/chat/[id]', params: { id: r.id } });
  }

  const refresh = async () => {
    setRefreshing(true);
    await (tab === 'chats' ? load() : loadCalls());
    setRefreshing(false);
  };

  return (
    <Screen>
      <TitleBar title={t('chat.title')} right={<IconBtn name="people" size={40} onPress={() => router.push('/likes')} />} />
      <Tabs value={tab} onChange={setTab} options={[{ key: 'chats', label: t('chat.tabChats') }, { key: 'calls', label: t('chat.tabCalls') }]} />
      <View style={{ height: 10 }} />
      {tab === 'chats' ? (
        items === null ? (
          <Loader full variant="list" n={7} />
        ) : (
          <FlatList
            data={items.filter((c) => c.lastMessageText)}
            keyExtractor={(c) => c.id}
            refreshControl={<RefreshControl tintColor={colors.brand} refreshing={refreshing} onRefresh={refresh} />}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: tabSpace }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              matches.length ? (
                <View style={{ marginBottom: 8, marginTop: 4 }}>
                  <T v="label" color={colors.brand} style={{ marginBottom: 10 }}>{t('chat.matches')}</T>
                  <FlatList
                    horizontal
                    data={matches}
                    keyExtractor={(u) => u.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12, paddingRight: 8 }}
                    renderItem={({ item }) => (
                      <Pressable onPress={() => void openMatch(item)} style={{ alignItems: 'center', width: 64 }}>
                        <Avatar uri={item.avatarUrl} name={item.name} size={64} online={item.online} vipTier="GOLD" />
                        <Text style={styles.matchName} numberOfLines={1}>{item.name}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              <EmptyState icon="chat" title={t('chat.empty')} sub={t('chat.emptySub')} action={<Btn full={false} size="md" kind="dark" title={t('tabs.discover')} onPress={() => router.push('/(tabs)/discover')} />} />
            }
            renderItem={({ item, index }) => (
              <Appear i={index} from="fade">
              <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgSunken }]}>
                <Avatar uri={item.user.avatarUrl} name={item.user.name} size={54} online={item.user.online} vipTier={item.user.vipTier} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
                    {item.user.verified ? <VerifiedBadge size={14} /> : null}
                    {item.user.isHost ? <View style={styles.hostDot} /> : null}
                  </View>
                  <Text style={[styles.last, item.unread > 0 && { color: colors.ink, fontFamily: fonts.bold }]} numberOfLines={1}>{item.lastMessageText}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={[styles.time, item.unread > 0 && { color: colors.brand }]}>{timeAgo(item.lastMessageAt)}</Text>
                  {item.unread > 0 ? <Badge n={item.unread} /> : <Icon name="check2" size={14} color={colors.textDim} />}
                </View>
              </Pressable>
              </Appear>
            )}
          />
        )
      ) : calls === null ? (
        <Loader full variant="list" n={7} />
      ) : (
        <FlatList
          data={calls.filter((c) => c.peer)}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl tintColor={colors.brand} refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: tabSpace }}
          ListEmptyComponent={<EmptyState icon="call" title={t('chat.noCalls')} sub={t('chat.noCallsSub')} tint={colors.diamondSoft} action={<Btn full={false} size="md" kind="primary" icon="videocam" title={t('live.quickVideo')} onPress={() => router.push({ pathname: '/match', params: { type: 'VIDEO' } })} />} />}
          renderItem={({ item }) => {
            const out = item.callerId === myId;
            const missed = !item.startedAt;
            const secs = item.startedAt && item.endedAt ? Math.round((new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime()) / 1000) : 0;
            const peer = item.peer!;
            return (
              <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: peer.id } })} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgSunken }]}>
                <Avatar uri={peer.avatarUrl} name={peer.name} size={50} online={peer.online} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.name, missed && !out && { color: colors.brand }]} numberOfLines={1}>{peer.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon name={out ? 'arrowUp' : 'arrowRight'} size={13} color={missed ? colors.brand : colors.online} />
                    <Text style={styles.last}>
                      {item.type === 'VIDEO' ? t('chat.callVideo') : t('chat.callVoice')}
                      {secs ? ` · ${duration(secs)}` : missed ? ` · ${t(out ? 'chat.cancelled' : 'chat.missed')}` : ''}
                    </Text>
                  </View>
                </View>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                <IconBtn name={item.type === 'VIDEO' ? 'videocam' : 'call'} size={38} bg={item.type === 'VIDEO' ? colors.brandSoft : colors.diamondSoft} onPress={() => void startCall(peer.id, item.type)} />
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Sətir ekran enində: sol kənar başlıqla (16) eyni xətdə, basılanda fon tam en boyu
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, marginHorizontal: -16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  matchName: { color: colors.ink, fontSize: 12, lineHeight: 15, marginTop: 6, fontFamily: fonts.semibold, maxWidth: 64, textAlign: 'center' },
  name: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold, flexShrink: 1 },
  last: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.regular },
  time: { color: colors.textDim, fontSize: 12, fontFamily: fonts.semibold },
  hostDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.coin },
});
