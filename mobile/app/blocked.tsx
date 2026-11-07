import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius } from '@/theme';
import { Btn, EmptyState, Header, Loader, Screen, T } from '@/components/ui';
import { Appear, Pressable3 } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

export default function Blocked() {
  const { t } = useTranslation();
  const toast = useStore((s) => s.toast);
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => api<{ users: PublicUser[] }>('/me/blocks').then((r) => setUsers(r.users)).catch(() => setUsers((u) => u ?? [])), []);
  useEffect(() => { void load(); }, [load]);

  async function unblock(u: PublicUser) {
    setBusy(u.id);
    try {
      await api(`/users/${u.id}/block`, { method: 'DELETE' });
      setUsers((x) => x?.filter((y) => y.id !== u.id) ?? null);
      toast(t('u2.unblocked'), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Header title={t('settings.blockList')} />
      {users === null ? <Loader full variant="list" n={5} /> : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ flexGrow: 1, gap: 10, paddingTop: 4, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.brand} colors={[colors.brand]} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="ban" title={t('settings.blockEmpty')} sub={t('settings.blockEmptySub')} />}
          renderItem={({ item, index }) => (
            <Appear i={index}>
              <View style={styles.row}>
                <Pressable3 scaleTo={0.97} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })} style={styles.who}>
                  <Avatar uri={item.avatarUrl} name={item.name} size={48} ring={false} />
                  <View style={{ flex: 1 }}>
                    <T v="bodyStrong" numberOfLines={1}>{item.name}</T>
                    {item.age || item.city ? <T v="tiny" color={colors.textMuted} numberOfLines={1}>{[item.age, item.city].filter(Boolean).join(' · ')}</T> : null}
                  </View>
                </Pressable3>
                <Btn full={false} size="sm" kind="ghost" title={t('common.unblock')} loading={busy === item.id} onPress={() => void unblock(item)} />
              </View>
            </Appear>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingRight: 12, borderRadius: radius.lg, backgroundColor: colors.card },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
