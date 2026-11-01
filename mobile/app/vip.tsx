import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radius, vipGradient } from '@/theme';
import { GradientButton, Header, Loader, Screen } from '@/components/ui';
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
    <Screen>
      <Header title="" />
      {!plans ? <Loader full /> : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={{ alignItems: 'center', gap: 6, marginBottom: 18 }}>
              <LinearGradient colors={gradients.vipGold} style={styles.crown}><Icon name="crown" size={40} color="#3A1F00" /></LinearGradient>
              <Text style={styles.title}>{t('vip.title')}</Text>
              <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{t('vip.subtitle')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {plans.map((p) => (
                <Pressable key={p.tier} style={{ flex: 1 }} onPress={() => setSel(p.tier)}>
                  <LinearGradient colors={sel === p.tier ? vipGradient(p.tier) : [colors.surface, colors.surface]} style={styles.tier}>
                    {p.tier === 'GOLD' ? <Text style={styles.best}>★</Text> : null}
                    <Text style={[styles.tierName, sel === p.tier && { color: '#2B1745' }]}>{t(`vip.tiers.${p.tier}`)}</Text>
                    <CoinAmount n={p.priceCoins} size={15} color={sel === p.tier ? '#2B1745' : colors.gold} />
                    <Text style={[{ color: colors.textMuted, fontSize: 11 }, sel === p.tier && { color: '#2B1745' }]}>{t('vip.days', { n: p.days })}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </View>
            {plan ? (
              <View style={styles.perks}>
                {perks(plan).map((x) => (
                  <View key={x} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <Icon name="checkmark" size={18} color={colors.online} />
                    <Text style={{ color: '#fff', fontSize: 15, flex: 1 }}>{x}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
          {plan ? (
            <GradientButton
              title={t('vip.buy', { price: plan.priceCoins })}
              colors={vipGradient(plan.tier)}
              textStyle={{ color: '#2B1745' }}
              loading={buying}
              onPress={buy}
              style={{ marginBottom: 20 }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  crown: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 30, fontWeight: '900' },
  tier: { borderRadius: radius.lg, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border },
  tierName: { color: '#fff', fontWeight: '900', fontSize: 15 },
  best: { position: 'absolute', top: 4, right: 8, color: colors.rose, fontWeight: '900' },
  perks: { marginTop: 18, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 14 },
});
