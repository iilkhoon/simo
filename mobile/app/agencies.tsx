import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius, tintFor } from '@/theme';
import { EmptyState, Header, Input, Loader, PressBox, Screen, T } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';

export interface AgencyCard {
  id: string; name: string; code: string; logoUrl: string | null; description: string; city: string;
  defaultMsgPrice: number; members: number; monthlyDiamonds: number; tier: number; tierName: string; agencyShare: number; hostShare: number;
}

export const TIER_COLORS = ['#C8875A', '#AEB6C2', '#FFC23D', '#8ED1FF', '#CDB8FF'];

export function TierPill({ tier, name }: { tier: number; name: string }) {
  const { t } = useTranslation();
  const label = t(`ag.tiers.${tier}`, { defaultValue: name });
  return (
    <View style={[styles.tier, { backgroundColor: TIER_COLORS[tier - 1] ?? TIER_COLORS[0] }]}>
      <Icon name="trophy" size={11} color={colors.ink} />
      <Text style={styles.tierText}>{label}</Text>
    </View>
  );
}

/** Agentlik kataloqu: agentliklərə baxıb müraciət etmək */
export default function Agencies() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<AgencyCard[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (query: string) => {
    try {
      const r = await api<{ items: AgencyCard[] }>(`/agencies${query ? `?q=${encodeURIComponent(query)}` : ''}`);
      setItems(r.items);
    } catch {
      setItems((x) => x ?? []);
    }
  }, []);
  useEffect(() => {
    const id = setTimeout(() => void load(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q, load]);

  return (
    <Screen>
      <Header title={t('agency.browse')} />
      <Input value={q} onChangeText={setQ} placeholder={t('agency.search')} autoCorrect={false} returnKeyType="search" left={<Icon name="search" size={18} color={colors.textDim} />} />
      <View style={styles.info}>
        <Icon name="sparkles" size={16} color={colors.brand} />
        <T v="tiny" color={colors.textMuted} style={{ flex: 1 }}>{t('agency.directoryInfo')}</T>
      </View>
      {items === null ? <Loader full variant="list" n={5} /> : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 40, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.brand} colors={[colors.brand]} onRefresh={async () => { setRefreshing(true); await load(q.trim()); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState icon="business" art="search" title={t('agency.none')} sub={t('u2.agenciesEmptySub')} />}
          renderItem={({ item, index }) => (
            <Appear i={index}>
            <PressBox r={radius.lg} sh={1} onPress={() => router.push({ pathname: '/agency/[id]', params: { id: item.id } })} inner={styles.card}>
              <View style={[styles.logo, { backgroundColor: tintFor(item.name) }]}>
                {item.logoUrl ? <Image source={{ uri: item.logoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.logoText}>{item.name.slice(0, 1)}</Text>}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {index < 3 ? <Text style={styles.rank}>#{index + 1}</Text> : null}
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TierPill tier={item.tier} name={item.tierName} />
                  <T v="tiny" color={colors.textMuted}>{t('agency.hostsCount', { n: item.members })}{item.city ? ` · ${item.city}` : ''}</T>
                </View>
              </View>
              <View style={styles.share}>
                <Text style={styles.shareNum}>{Math.round(item.hostShare * 100)}%</Text>
                <T v="tiny" color={colors.textMuted}>{t('agency.hostShareShort')}</T>
              </View>
            </PressBox>
            </Appear>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  logo: { width: 52, height: 52, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoText: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 22, lineHeight: 28, color: colors.ink },
  rank: { ...noPad, fontFamily: fonts.black, fontSize: 13, lineHeight: 17, color: colors.brand },
  name: { ...noPad, fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.ink, flexShrink: 1 },
  share: { alignItems: 'center', minWidth: 52 },
  shareNum: { ...noPad, fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: colors.online },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 20, borderRadius: 10, paddingHorizontal: 7 },
  tierText: { ...noPad, fontFamily: fonts.black, fontSize: 10, lineHeight: 13, color: colors.ink },
});
