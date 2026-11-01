import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font } from '@/theme';
import { EmptyState, GradientButton, Loader, Screen } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

interface Conv { id: string; user: PublicUser; lastMessageText: string; lastMessageAt: string; unread: number }

export default function Chats() {
  const { t } = useTranslation();
  const setUnread = useStore((s) => s.setUnreadChats);
  const [items, setItems] = useState<Conv[] | null>(null);
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

  useFocusEffect(
    useCallback(() => {
      void load();
      const s = getSocket();
      const h = () => void load();
      s?.on('message:new', h);
      return () => {
        s?.off('message:new', h);
      };
    }, [load]),
  );

  async function openMatch(u: PublicUser) {
    const r = await api<{ id: string }>(`/conversations/with/${u.id}`, { method: 'POST', body: {} });
    router.push({ pathname: '/chat/[id]', params: { id: r.id } });
  }

  return (
    <Screen>
      <Text style={[font.h1, { paddingVertical: 8 }]}>{t('chat.title')}</Text>
      {items === null ? (
        <Loader full />
      ) : (
        <FlatList
          data={items.filter((c) => c.lastMessageText)}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl tintColor={colors.rose} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
          ListHeaderComponent={
            matches.length ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={[font.h3, { marginBottom: 10 }]}>💞 {t('chat.matches')}</Text>
                <FlatList
                  horizontal
                  data={matches}
                  keyExtractor={(u) => u.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 14 }}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => void openMatch(item)} style={{ alignItems: 'center', width: 68 }}>
                      <Avatar uri={item.avatarUrl} name={item.name} size={62} online={item.online} live />
                      <Text style={{ color: '#fff', fontSize: 12, marginTop: 6 }} numberOfLines={1}>{item.name}</Text>
                    </Pressable>
                  )}
                />
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState icon="chat" title={t('chat.empty')} sub={t('chat.emptySub')} action={<GradientButton small title={t('tabs.discover')} onPress={() => router.push('/(tabs)')} />} />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
              <Avatar uri={item.user.avatarUrl} name={item.user.name} size={56} online={item.user.online} vipTier={item.user.vipTier} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
                  {item.user.verified ? <VerifiedBadge size={14} /> : null}
                </View>
                <Text style={[styles.last, item.unread > 0 && { color: '#fff', fontWeight: '600' }]} numberOfLines={1}>{item.lastMessageText}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
                {item.unread > 0 ? (
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700', flexShrink: 1 },
  last: { color: colors.textMuted, fontSize: 14 },
  time: { color: colors.textDim, fontSize: 12 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
