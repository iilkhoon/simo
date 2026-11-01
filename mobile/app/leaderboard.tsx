import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radius } from '@/theme';
import { EmptyState, Header, Loader, Screen, Segmented } from '@/components/ui';
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
      <Segmented<Kind> value={kind} onChange={setKind} options={[{ key: 'charm', label: `💗 ${t('leaderboard.charm')}` }, { key: 'wealth', label: `👑 ${t('leaderboard.wealth')}` }]} />
      <Segmented<Period> value={period} onChange={setPeriod} options={(['day', 'week', 'month'] as Period[]).map((p) => ({ key: p, label: t(`leaderboard.${p}`) }))} />
      {!rows ? <Loader full /> : (
        <FlatList
          data={rows.slice(3)}
          keyExtractor={(r) => r.user.id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
          ListHeaderComponent={
            podium.length ? (
              <LinearGradient colors={kind === 'charm' ? gradients.primary : gradients.gold} style={styles.podium}>
                {order.map((r, i) => r ? (
                  <Pressable key={r.user.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: r.user.id } })} style={{ alignItems: 'center', flex: 1, marginTop: i === 1 ? 0 : 26 }}>
                    <Text style={{ fontSize: i === 1 ? 30 : 24 }}>{['🥈', '🥇', '🥉'][i]}</Text>
                    <Avatar uri={r.user.avatarUrl} name={r.user.name} size={i === 1 ? 80 : 62} vipTier={r.user.vipTier} />
                    <Text style={styles.podName} numberOfLines={1}>{r.user.name}</Text>
                    <Text style={styles.podScore}>{compact(r.score)}</Text>
                  </Pressable>
                ) : <View key={i} style={{ flex: 1 }} />)}
              </LinearGradient>
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
  podium: { flexDirection: 'row', borderRadius: radius.xl, padding: 16, marginVertical: 12 },
  podName: { color: '#fff', fontWeight: '800', marginTop: 6, maxWidth: 90 },
  podScore: { color: '#fff', opacity: 0.9, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rank: { color: colors.textMuted, width: 26, fontWeight: '800', textAlign: 'center' },
  name: { color: '#fff', fontWeight: '700', flex: 1 },
});
