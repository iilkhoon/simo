import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, gradients, vipColor } from '@/theme';
import { Btn, Card, GradientCard, Header, Loader, Screen, T, Tag } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { Illustration } from '@/components/Illustration';
import { Appear, Pressable3 } from '@/components/motion';
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
    if ((me?.coins ?? 0) < (plan.finalPrice ?? plan.priceCoins)) {
      toast(t('errors.INSUFFICIENT_COINS'), 'error');
      router.push('/wallet');
      return;
    }
    setBuying(true);
    try {
      setMe(await api<Me>('/vip/buy', { body: { tier: plan.tier } }));
      toast('VIP ✓', 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') router.push('/wallet');
    } finally {
      setBuying(false);
    }
  }

  const perks = (p: VipPlan) => ([
    ['verified', `${t('trust.vipVerified')} — ${t('trust.vipInfo')}`],
    ['infinite', t('vip.perks.unlimitedLikes')],
    ['chat', t('vip.perks.freeMessages', { n: p.freeMessagesPerDay })],
    ['call', t('vip.perks.callDiscount', { n: Math.round(p.callDiscount * 100) })],
    ['star', t('vip.perks.superLikes', { n: p.superLikesPerDay })],
    p.seeVisitors && ['eye', t('vip.perks.seeVisitors')],
    p.seeLikes && ['heart', t('vip.perks.seeLikes')],
    p.incognito && ['eyeOff', t('vip.perks.incognito')],
    ['rocket', t('vip.perks.boost', { n: p.discoveryBoost })],
    p.entryEffect && ['sparkles', t('vip.perks.entryEffect')],
    ['crown', t('vip.perks.badge')],
  ].filter(Boolean) as [IconName, string][]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('vip.title')} />
      {!plans ? <Loader full /> : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <Appear i={0}>
              <GradientCard g="night" glow={colors.coin} shine r={28} inner={styles.hero}>
                <View style={styles.heroArt}><Illustration name="crown" bare size={118} /></View>
                <View style={styles.vipTag}><Icon name="crown" size={12} color={colors.ink} /><Text style={styles.vipTagText}>SIMO VIP</Text></View>
                <Text style={styles.title}>{t('vip.heroTitle')}</Text>
                <T v="small" color={colors.nightMuted} style={{ maxWidth: '72%' }}>{t('vip.subtitle')}</T>
              </GradientCard>
            </Appear>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {plans.map((p, i) => {
                const on = sel === p.tier;
                const c = vipColor(p.tier);
                const g = p.tier === 'DIAMOND' ? gradients.diamond : p.tier === 'GOLD' ? gradients.gold : SILVER;
                return (
                  <Appear key={p.tier} i={i + 1} style={{ flex: 1 }}>
                    <Pressable3 onPress={() => setSel(p.tier)} scaleTo={0.95} style={[styles.tierWrap, on && styles.tierOn]}>
                      {on ? <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} /> : null}
                      <View style={styles.tier}>
                        {p.tier === 'GOLD' ? <Tag label={t('vip.best').toUpperCase()} bg={colors.brand} fg={colors.white} style={styles.best} /> : null}
                        {on ? <View style={styles.tick}><Icon name="checkmark" size={12} color={colors.white} /></View> : null}
                        <Text style={[styles.tierName, { color: on ? c.fg : colors.ink }]}>{t(`vip.tiers.${p.tier}`)}</Text>
                        <CoinAmount n={p.finalPrice ?? p.priceCoins} size={15} color={on ? c.fg : colors.ink} />
                        {p.discountPct ? <Text style={{ fontSize: 11, textDecorationLine: 'line-through', color: on ? c.fg : colors.textMuted }}>{p.priceCoins}</Text> : null}
                        <Text style={[styles.days, { color: on ? c.fg : colors.textMuted, opacity: on ? 0.8 : 1 }]}>{t('vip.days', { n: p.days })}</Text>
                      </View>
                    </Pressable3>
                  </Appear>
                );
              })}
            </View>
            {plan ? (
              <Card r={22} sh={3} style={{ marginTop: 12 }}>
                <View style={styles.perks}>
                  {perks(plan).map(([ic, x], i) => (
                    <Appear key={x} i={i + 3} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <View style={styles.check}>
                        <Icon name={ic} size={16} color="#D98A00" />
                      </View>
                      <T v="bodyStrong" style={{ flex: 1 }}>{x}</T>
                    </Appear>
                  ))}
                </View>
              </Card>
            ) : null}
          </ScrollView>
          {plan ? (
            <Btn
              title={`${t('vip.buy', { price: plan.finalPrice ?? plan.priceCoins })}${plan.discountPct ? ` (−${plan.discountPct}%)` : ''}`}
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

const SILVER = ['#F4F6FA', '#D5DBE4', '#AEB6C2'] as const;

const styles = StyleSheet.create({
  hero: { padding: 20, paddingTop: 96, minHeight: 200, justifyContent: 'flex-end' },
  heroArt: { position: 'absolute', right: 6, top: 4, transform: [{ rotate: '12deg' }] },
  vipTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.coin, paddingHorizontal: 9, height: 22, borderRadius: 11 },
  vipTagText: { fontFamily: fonts.black, fontSize: 10.5, letterSpacing: 1, color: colors.ink },
  title: { color: colors.white, fontSize: 28, lineHeight: 32, fontFamily: fonts.display, letterSpacing: -1, marginTop: 10, marginBottom: 6 },
  tierWrap: { borderRadius: 20, backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'rgba(26,21,18,0.06)', shadowColor: '#3B2418', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  tierOn: { borderColor: 'transparent', shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
  tick: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  tier: { padding: 12, paddingTop: 34, alignItems: 'center', gap: 6 },
  tierName: { fontFamily: fonts.displayBold, fontSize: 14 },
  days: { fontFamily: fonts.semibold, fontSize: 11 },
  best: { position: 'absolute', top: 8, alignSelf: 'center' },
  perks: { padding: 18, gap: 14 },
  check: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.coinSoft, alignItems: 'center', justifyContent: 'center' },
});
