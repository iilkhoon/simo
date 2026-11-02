import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, font } from '@/theme';
import { Btn, EmptyState, Header, Loader, Screen, Segmented } from '@/components/ui';
import { UserTile } from '@/components/UserTile';
import { api } from '@/lib/api';
import { syncLocation } from '@/lib/media';
import type { PublicUser } from '@/lib/types';

const TW = (Dimensions.get('window').width - 32 - 10) / 2;
const RADII = ['5', '20', '50', '200'] as const;

export default function Nearby() {
  const { t } = useTranslation();
  const [radius, setRadius] = useState<(typeof RADII)[number]>('50');
  const [online, setOnline] = useState(false);
  const [items, setItems] = useState<PublicUser[] | null>(null);
  const [noLocation, setNoLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: PublicUser[] }>(`/nearby?radius=${radius}&online=${online}`);
      setItems(r.items);
    } catch {
      setItems([]);
    }
  }, [radius, online]);

  useEffect(() => {
    void syncLocation(true).then((ok) => {
      setNoLocation(!ok);
      void load();
    });
  }, [load]);

  return (
    <Screen>
      <Header title={t('discover.nearby')} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Segmented value={radius} onChange={setRadius} options={RADII.map((r) => ({ key: r, label: t('common.km', { n: r }) }))} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 }}>
        <Switch value={online} onValueChange={setOnline} trackColor={{ true: colors.online, false: colors.bgSunken }} thumbColor={colors.card} />
        <Text style={font.small}>{t('discover.onlineNow')}</Text>
      </View>
      {noLocation ? (
        <EmptyState icon="location" title={t('common.permissionDenied')} action={<Btn full={false} size="md" kind="dark" title={t('common.retry')} onPress={() => void syncLocation(true).then((ok) => { setNoLocation(!ok); void load(); })} />} />
      ) : !items ? <Loader full /> : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={(u) => u.id}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 30, flexGrow: 1 }}
          refreshControl={<RefreshControl tintColor={colors.brand} refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="location" title={t('discover.emptyTitle')} sub={t('discover.emptySub')} />}
          renderItem={({ item }) => <UserTile user={item} width={TW} />}
        />
      )}
    </Screen>
  );
}
