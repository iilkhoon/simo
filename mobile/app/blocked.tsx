import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { font } from '@/theme';
import { Btn, EmptyState, Header, Screen } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { api } from '@/lib/api';
import type { PublicUser } from '@/lib/types';

export default function Blocked() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const load = useCallback(() => void api<{ users: PublicUser[] }>('/me/blocks').then((r) => setUsers(r.users)).catch(() => {}), []);
  useEffect(load, [load]);
  return (
    <Screen>
      <Header title={t('settings.blockList')} />
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ flexGrow: 1, gap: 10 }}
        ListEmptyComponent={<EmptyState icon="ban" title={t('settings.blockEmpty')} sub={t('settings.blockEmptySub')} />}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar uri={item.avatarUrl} name={item.name} size={46} />
            <Text style={[font.body, { flex: 1 }]}>{item.name}</Text>
            <Btn full={false} size="sm" kind="light" title={t('common.unblock')} onPress={() => void api(`/users/${item.id}/block`, { method: 'DELETE' }).then(load)} />
          </View>
        )}
      />
    </Screen>
  );
}
