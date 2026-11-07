import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '@/theme';
import { EmptyState, GradientCard, Header, Loader, Screen, Segmented, Tabs } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Appear, Pressable3 } from '@/components/motion';
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
      <Tabs<Kind> value={kind} onChange={setKind} options={[{ key: 'charm', label: t('leaderboard.charm'), icon: 'heart' }, { key: 'wealth', label: t('leaderboard.wealth'), icon: 'crown' }]} />
      <View style={{ height: 8 }} />
      <Segmented<Period> value={period} onChange={setPeriod} options={(['day', 'week', 'month'] as Period[]).map((p) => ({ key: p, label: t(`leaderboard.${p}`) }))} />
      {!rows ? <Loader full variant="list" n={7} /> : (
        <FlatList
          data={rows.slice(3)}
          keyExtractor={(r) => r.user.id}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
          ListHeaderComponent={
            podium.length ? (
              <Appear i={0}>
                <GradientCard g={kind === 'charm' ? 'nar' : 'gold'} glow={colors.white} shine r={28} style={{ marginVertical: 14 }} inner={styles.podium}>
                  {order.map((r, i) => r ? (
                    <Pressable key={r.user.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: r.user.id } })} style={{ alignItems: 'center', flex: 1, marginTop: i === 1 ? 0 : 30 }}>
                      {i === 1 ? <View style={{ marginBottom: -4 }}><Icon name="crown" size={26} color={kind === 'charm' ? colors.coin : colors.white} /></View> : null}
                      <View style={[styles.avRing, { borderColor: MEDAL[i] }]}>
                        <Avatar uri={r.user.avatarUrl} name={r.user.name} size={i === 1 ? 78 : 60} ring={false} />
                      </View>
                      <View style={[styles.medal, { backgroundColor: MEDAL[i] }]}><Text style={styles.medalText}>{[2, 1, 3][i]}</Text></View>
                      <Text style={[styles.podName, { color: kind === 'charm' ? colors.white : colors.ink }]} numberOfLines={1}>{r.user.name}</Text>
                      <View style={[styles.podScoreWrap, { backgroundColor: kind === 'charm' ? 'rgba(255,255,255,0.2)' : 'rgba(26,21,18,0.1)' }]}>
                        <Icon name={kind === 'charm' ? 'heart' : 'diamond'} size={11} color={kind === 'charm' ? colors.white : colors.ink} />
                        <Text style={[styles.podScore, { color: kind === 'charm' ? colors.white : colors.ink }]}>{compact(r.score)}</Text>
                      </View>
                    </Pressable>
                  ) : <View key={i} style={{ flex: 1 }} />)}
                </GradientCard>
              </Appear>
            ) : undefined
          }
          ListEmptyComponent={podium.length ? undefined : <EmptyState icon="trophy" title={t('ui.lbEmpty')} sub={t('ui.lbEmptySub')} />}
          renderItem={({ item, index }) => (
            <Appear i={index + 1}>
              <Pressable3 onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user.id } })} style={styles.row} scaleTo={0.98}>
                <Text style={styles.rank}>{item.rank}</Text>
                <Avatar uri={item.user.avatarUrl} name={item.user.name} size={44} vipTier={item.user.vipTier} />
                <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
                <CoinAmount n={compact(item.score)} size={14} />
              </Pressable3>
            </Appear>
          )}
        />
      )}
    </Screen>
  );
}

const MEDAL = ['#E3E8EF', '#FFD34D', '#E8A66B'];

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', padding: 16, paddingTop: 18, paddingBottom: 18 },
  avRing: { borderWidth: 3, borderRadius: 999, padding: 2 },
  medal: { marginTop: -12, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  medalText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  podName: { fontFamily: fonts.bold, marginTop: 6, maxWidth: 90 },
  podScoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11, marginTop: 4 },
  podScore: { fontFamily: fonts.black, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, marginBottom: 8, borderRadius: radius.md, backgroundColor: colors.card },
  rank: { color: colors.textMuted, width: 26, fontFamily: fonts.displayBold, textAlign: 'center' },
  name: { color: colors.ink, fontFamily: fonts.bold, flex: 1, fontSize: 15 },
});
