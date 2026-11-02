import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '@/theme';
import { Box, EmptyState, Header, Loader, Screen, Segmented, Tabs } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { CoinAmount } from '@/components/Badges';
import { api } from '@/lib/api';
import { compact } from '@/lib/format';
import type { PublicUser } from '@/lib/types';

type Kind = 'charm' | 'wealth';
type Period = 'day' | 'week' | 'month';
interface Row { rank: number; score: number; user: PublicUser }

export default function Leaderboard() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<Kind>('charm');
  const [period, setPeriod] = useState<Period>('week');
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    setRows(null);
    void api<{ items: Row[] }>(`/leaderboard?type=${kind}&period=${period}`).then((r) => setRows(r.items)).catch(() => setRows([]));
  }, [kind, period]);

  const podium = rows?.slice(0, 3) ?? [];
  const order = [podium[1], podium[0], podium[2]];

  return (
    <Screen>
      <Header title={t('leaderboard.title')} />
      <Tabs<Kind> value={kind} onChange={setKind} options={[{ key: 'charm', label: `💗 ${t('leaderboard.charm')}` }, { key: 'wealth', label: `👑 ${t('leaderboard.wealth')}` }]} />
      <View style={{ height: 8 }} />
      <Segmented<Period> value={period} onChange={setPeriod} options={(['day', 'week', 'month'] as Period[]).map((p) => ({ key: p, label: t(`leaderboard.${p}`) }))} />
      {!rows ? <Loader full /> : (
        <FlatList
          data={rows.slice(3)}
          keyExtractor={(r) => r.user.id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
          ListHeaderComponent={
            podium.length ? (
              <Box r={26} sh={6} bg={kind === 'charm' ? colors.brand : colors.coin} style={{ marginVertical: 12 }} inner={styles.podium}>
                {order.map((r, i) => r ? (
                  <Pressable key={r.user.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: r.user.id } })} style={{ alignItems: 'center', flex: 1, marginTop: i === 1 ? 0 : 26 }}>
                    <Avatar uri={r.user.avatarUrl} name={r.user.name} size={i === 1 ? 80 : 62} vipTier={r.user.vipTier} />
                    <View style={[styles.medal, { backgroundColor: [colors.card, colors.highlight, colors.coinSoft][i] }]}><Text style={styles.medalText}>{[2, 1, 3][i]}</Text></View>
                    <Text style={[styles.podName, { color: kind === 'charm' ? colors.white : colors.ink }]} numberOfLines={1}>{r.user.name}</Text>
                    <Text style={[styles.podScore, { color: kind === 'charm' ? colors.white : colors.ink }]}>{compact(r.score)}</Text>
                  </Pressable>
                ) : <View key={i} style={{ flex: 1 }} />)}
              </Box>
            ) : undefined
          }
          ListEmptyComponent={podium.length ? undefined : <EmptyState icon="trophy" title={t('leaderboard.title')} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user.id } })} style={styles.row}>
              <Text style={styles.rank}>{item.rank}</Text>
              <Avatar uri={item.user.avatarUrl} name={item.user.name} size={44} />
              <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
              <CoinAmount n={compact(item.score)} size={14} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', padding: 16, paddingTop: 20 },
  medal: { marginTop: -12, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  medalText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  podName: { fontFamily: fonts.bold, marginTop: 6, maxWidth: 90 },
  podScore: { fontFamily: fonts.black, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rank: { color: colors.textMuted, width: 26, fontFamily: fonts.displayBold, textAlign: 'center' },
  name: { color: colors.ink, fontFamily: fonts.bold, flex: 1, fontSize: 15 },
});
