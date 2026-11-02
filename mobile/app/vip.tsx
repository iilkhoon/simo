import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, vipColor } from '@/theme';
import { Box, Btn, Card, Header, Loader, PressBox, Screen, T, Tag } from '@/components/ui';
import { Burst } from '@/components/Burst';
import { Icon } from '@/components/Icon';
import { CoinAmount } from '@/components/Badges';
import { api, ApiError } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';
import type { Me, VipPlan } from '@/lib/types';

export default function Vip() {
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [plans, setPlans] = useState<VipPlan[] | null>(null);
  const [sel, setSel] = useState<VipPlan['tier']>('GOLD');
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    void api<{ plans: VipPlan[] }>('/vip/plans', { auth: false }).then((r) => setPlans(r.plans)).catch(() => setPlans([]));
  }, []);

  const plan = plans?.find((p) => p.tier === sel);

  async function buy() {
    if (!plan) return;
    if ((me?.coins ?? 0) < plan.priceCoins) {
      toast(t('errors.INSUFFICIENT_COINS'), 'error');
      router.push('/wallet');
      return;
    }
    setBuying(true);
    try {
      setMe(await api<Me>('/vip/buy', { body: { tier: plan.tier } }));
      toast('👑 VIP!', 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') router.push('/wallet');
    } finally {
      setBuying(false);
    }
  }

  const perks = (p: VipPlan) => [
    t('vip.perks.unlimitedLikes'),
    t('vip.perks.freeMessages', { n: p.freeMessagesPerDay }),
    t('vip.perks.callDiscount', { n: Math.round(p.callDiscount * 100) }),
    t('vip.perks.superLikes', { n: p.superLikesPerDay }),
    p.seeVisitors && t('vip.perks.seeVisitors'),
    p.seeLikes && t('vip.perks.seeLikes'),
    p.incognito && t('vip.perks.incognito'),
    t('vip.perks.boost', { n: p.discoveryBoost }),
    p.entryEffect && t('vip.perks.entryEffect'),
    t('vip.perks.badge'),
  ].filter(Boolean) as string[];

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('vip.title')} />
      {!plans ? <Loader full /> : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <Box r={26} sh={6} bg={colors.ink} inner={styles.hero}>
              <View style={{ position: 'absolute', right: -30, top: -30 }}><Burst size={150} color={colors.coin} points={14} /></View>
              <View style={{ position: 'absolute', right: 22, top: 22 }}><Icon name="crown" size={46} color={colors.ink} /></View>
              <T v="label" color={colors.coin}>SIMO VIP</T>
              <Text style={[styles.title, { maxWidth: '68%' }]}>{t('vip.heroTitle')}</Text>
              <T v="small" color={colors.nightMuted} style={{ maxWidth: '62%' }}>{t('vip.subtitle')}</T>
            </Box>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              {plans.map((p) => {
                const on = sel === p.tier;
                const c = vipColor(p.tier);
                return (
                  <PressBox key={p.tier} style={{ flex: 1 }} r={20} sh={on ? 5 : 2} bg={on ? c.bg : colors.card} onPress={() => setSel(p.tier)} inner={styles.tier}>
                    {p.tier === 'GOLD' ? <Tag label={t('vip.best').toUpperCase()} bg={colors.brand} fg={colors.white} style={styles.best} /> : null}
                    <Text style={[styles.tierName, { color: on ? c.fg : colors.ink }]}>{t(`vip.tiers.${p.tier}`)}</Text>
                    <CoinAmount n={p.priceCoins} size={15} color={on ? c.fg : colors.ink} />
                    <Text style={[styles.days, { color: on ? c.fg : colors.textMuted }]}>{t('vip.days', { n: p.days })}</Text>
                  </PressBox>
                );
              })}
            </View>
            {plan ? (
              <Card r={22} sh={3} style={{ marginTop: 12 }}>
                <View style={styles.perks}>
                  {perks(plan).map((x, i) => (
                    <View key={x} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <View style={[styles.check, { backgroundColor: [colors.brandSoft, colors.coinSoft, colors.diamondSoft, colors.onlineSoft, colors.lilac][i % 5] }]}>
                        <Icon name="checkmark" size={14} color={colors.ink} />
                      </View>
                      <T v="bodyStrong" style={{ flex: 1 }}>{x}</T>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}
          </ScrollView>
          {plan ? (
            <Btn
              title={t('vip.buy', { price: plan.priceCoins })}
              kind={plan.tier === 'DIAMOND' ? 'diamond' : plan.tier === 'GOLD' ? 'coin' : 'light'}
              icon="crown"
              loading={buying}
              onPress={buy}
              style={{ marginBottom: 8 }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, paddingTop: 96, minHeight: 170, justifyContent: 'flex-end' },
  title: { color: colors.white, fontSize: 26, fontFamily: fonts.display, letterSpacing: -1, marginVertical: 6, maxWidth: '70%' },
  tier: { padding: 12, paddingTop: 34, alignItems: 'center', gap: 6 },
  tierName: { fontFamily: fonts.displayBold, fontSize: 14 },
  days: { fontFamily: fonts.semibold, fontSize: 11 },
  best: { position: 'absolute', top: 8, alignSelf: 'center' },
  perks: { padding: 18, gap: 14 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
