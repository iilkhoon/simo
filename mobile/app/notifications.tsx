import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Appear, Pressable3 } from '@/components/motion';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, fonts, radius } from '@/theme';
import { EmptyState, Header, Loader, Screen } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { GiftIcon } from '@/components/GiftIcon';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

interface N { id: string; type: string; read: boolean; createdAt: string; data: Record<string, string> | null; actor: PublicUser | null }

export default function Notifications() {
  const { t } = useTranslation();
  const setUnread = useStore((s) => s.setUnreadNotifications);
  const [items, setItems] = useState<N[] | null>(null);
  useEffect(() => {
    void api<{ items: N[] }>('/notifications').then((r) => setItems(r.items)).catch(() => setItems([]));
    void api('/notifications/read', { body: {} }).then(() => setUnread(0)).catch(() => {});
  }, [setUnread]);

  function open(n: N) {
    if (n.type === 'match' && n.data?.conversationId) router.push({ pathname: '/chat/[id]', params: { id: n.data.conversationId } });
    else if (n.type === 'live' && n.data?.roomId) router.push({ pathname: '/live/[id]', params: { id: n.data.roomId } });
    else if (n.type === 'gift' && n.data?.conversationId) router.push({ pathname: '/chat/[id]', params: { id: n.data.conversationId } });
    else if (n.type === 'offer') router.push('/wallet');
    else if (n.type === 'order') router.push({ pathname: '/orders', params: { as: 'seller' } });
    else if (n.type === 'order_update') router.push('/orders');
    else if (n.type === 'visit_digest') router.push('/visitors');
    else if (n.type === 'like_digest') router.push('/likes');
    else if (n.type === 'picks') router.push('/(tabs)');
    else if ((n.type === 'comment' || n.type === 'post_live') && n.data?.videoId) router.push({ pathname: '/post/[id]', params: { id: String(n.data.videoId) } });
    else if (n.actor) router.push({ pathname: '/user/[id]', params: { id: n.actor.id } });
  }

  return (
    <Screen>
      <Header title={t('notifications.title')} />
      {!items ? <Loader full variant="list" n={8} /> : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="bell" title={t('notifications.empty')} sub={t('ui.notifSub')} />}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item, index }) => (
            <Appear i={index}>
            <Pressable3 onPress={() => open(item)} scaleTo={0.98} style={[styles.row, !item.read && styles.unread]}>
              <Avatar uri={item.actor?.avatarUrl} name={item.actor?.name} size={48} online={item.actor?.online} />
              <View style={{ flex: 1 }}>
                <Text style={font.body}>
                  <Text style={{ fontFamily: fonts.black }}>{item.actor?.name ?? 'Simo'} </Text>
                  {t(`notifications.types.${item.type}`, { defaultValue: '' }) || t(`notifTypes.${item.type}`, { ...(item.data ?? {}), defaultValue: '' })}
                </Text>
                <Text style={font.tiny}>{timeAgo(item.createdAt)}</Text>
              </View>
              {item.type === 'gift' && item.data?.giftId ? <GiftIcon id={item.data.giftId} size={36} /> : null}
              {!item.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand }} /> : null}
            </Pressable3>
            </Appear>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 8, borderRadius: radius.md, backgroundColor: colors.card },
  unread: { backgroundColor: '#FFF6F7', borderWidth: 1, borderColor: 'rgba(242,52,79,0.12)' },
});
