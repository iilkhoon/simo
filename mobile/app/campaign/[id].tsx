import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '@/theme';
import { EmptyState, Header, Loader, Screen, Tabs } from '@/components/ui';
import { Appear, Pressable3, Shine } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { CoinAmount } from '@/components/Badges';
import { GiftIcon } from '@/components/GiftIcon';
import { api } from '@/lib/api';
import { compact, giftName } from '@/lib/format';
import { leftText, loc, type CampaignDetail } from '@/lib/campaigns';
import { useStore } from '@/store';

type Board = 'senders' | 'hosts';
const MEDAL = ['#FFD54A', '#DCE3EC', '#E8A87C'];

/** Mövsümi kampaniya səhifəsi: başlıq, qalan vaxt, mükafatlar, kampaniya hədiyyələri, iki canlı reytinq */
export default function CampaignScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const gifts = useStore((s) => s.gifts);
  const loadGifts = useStore((s) => s.loadGifts);
  const [d, setD] = useState<CampaignDetail | null | undefined>(undefined);
  const [board, setBoard] = useState<Board>('senders');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setD(await api<CampaignDetail>(`/campaigns/${id}`)); } catch { setD(null); }
  }, [id]);
  useEffect(() => { void load(); void loadGifts(); const i = setInterval(() => void load(), 30_000); return () => clearInterval(i); }, [load, loadGifts]);

  if (d === undefined) return <Screen><Header /><Loader full variant="list" n={6} /></Screen>;
  if (d === null) return <Screen><Header /><EmptyState icon="trophy" title={t('growth.notFound')} /></Screen>;

  const c = d.campaign;
  const rows = board === 'senders' ? d.senders : d.hosts;
  const prizes = loc(c.prizes);
  const campaignGifts = c.giftIds.map((g) => gifts.find((x) => x.id === g)).filter((x): x is NonNullable<typeof x> => !!x);

  const head = (
    <View>
      <Appear i={0}>
        <View style={styles.hero}>
          <LinearGradient colors={[c.color, c.color2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Shine />
          <Text style={styles.heroEmoji}>{c.emoji}</Text>
          <Text style={styles.heroTitle}>{loc(c.title)}</Text>
          {loc(c.subtitle) ? <Text style={styles.heroSub}>{loc(c.subtitle)}</Text> : null}
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              {c.status === 'live' ? t('growth.endsIn', { t: leftText(c.endsAt) }) : c.status === 'upcoming' ? t('growth.startsIn', { t: leftText(c.startsAt) }) : t('growth.ended')}
            </Text>
          </View>
        </View>
      </Appear>

      <View style={styles.myRow}>
        <View style={styles.myCell}><Text style={styles.myLabel}>{t('growth.sent')}</Text><CoinAmount n={compact(d.me.sent)} /></View>
        <View style={styles.myCell}><Text style={styles.myLabel}>{t('growth.received')}</Text><CoinAmount n={compact(d.me.received)} /></View>
      </View>

      {prizes ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏆 {t('growth.prizes')}</Text>
          <Text style={styles.cardText}>{prizes}</Text>
        </View>
      ) : null}

      {campaignGifts.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎁 {t('growth.giftsTitle')}</Text>
          <View style={styles.giftRow}>
            {campaignGifts.map((g) => (
              <View key={g.id} style={styles.gift}>
                <GiftIcon id={g.id} size={44} />
                <Text style={styles.giftName} numberOfLines={1}>{giftName(g)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.rules}>{t('growth.rules')}</Text>
        </View>
      ) : null}

      <Tabs<Board> value={board} onChange={setBoard} options={[{ key: 'senders', label: t('growth.senders'), icon: 'crown' }, { key: 'hosts', label: t('growth.hosts'), icon: 'heart' }]} />
      <View style={{ height: 8 }} />
    </View>
  );

  return (
    <Screen>
      <Header title={loc(c.title)} />
      <FlatList
        data={rows}
        keyExtractor={(r) => r.user.id}
        ListHeaderComponent={head}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState compact icon="trophy" title={t('growth.empty')} />}
        ListFooterComponent={<Text style={styles.legal}>{t('growth.legal')}</Text>}
        renderItem={({ item, index }) => (
          <Appear i={index}>
            <Pressable3 scaleTo={0.98} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user.id } })} style={styles.row}>
              <View style={[styles.rank, item.rank <= 3 && { backgroundColor: MEDAL[item.rank - 1] }]}><Text style={styles.rankText}>{item.rank}</Text></View>
              <Avatar uri={item.user.avatarUrl} name={item.user.name} size={44} online={item.user.online} />
              <Text style={styles.name} numberOfLines={1}>{item.user.name}</Text>
              <CoinAmount n={compact(item.score)} size={14} />
            </Pressable3>
          </Appear>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 28, overflow: 'hidden', padding: 20, alignItems: 'center', marginBottom: 12 },
  heroEmoji: { fontSize: 54 },
  heroTitle: { color: '#fff', fontFamily: fonts.displayBlack, fontSize: 24, textAlign: 'center', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.92)', fontFamily: fonts.semibold, fontSize: 13.5, textAlign: 'center', marginTop: 4 },
  heroPill: { marginTop: 12, backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  heroPillText: { color: '#fff', fontFamily: fonts.bold, fontSize: 12.5 },
  myRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  myCell: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, gap: 4 },
  myLabel: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 12 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 12 },
  cardTitle: { color: colors.ink, fontFamily: fonts.black, fontSize: 15, marginBottom: 6 },
  cardText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19 },
  giftRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gift: { width: 64, alignItems: 'center', gap: 2 },
  giftName: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 10.5 },
  rules: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 12, marginTop: 8, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 8, borderRadius: radius.md, backgroundColor: colors.card },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSunken },
  rankText: { color: colors.ink, fontFamily: fonts.black, fontSize: 13 },
  name: { flex: 1, color: colors.ink, fontFamily: fonts.bold, fontSize: 14.5 },
  legal: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center', marginTop: 16, paddingHorizontal: 12 },
});
