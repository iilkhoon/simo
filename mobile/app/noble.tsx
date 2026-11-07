import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius, type GradientName } from '@/theme';
import { Btn, GradientCard, Header, Screen, T } from '@/components/ui';
import { Appear, Skeleton } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { CoinIcon } from '@/components/GiftIcon';
import { NobleBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { dateOnly, errorText } from '@/lib/format';
import { useStore } from '@/store';
import type { Me } from '@/lib/types';

interface Plan { tier: 'BEY' | 'XAN' | 'SAH'; priceCoins: number; days: number; perks: string[] }
const LOOK: Record<string, { g: GradientName; fg: string; accent: string; glow: string }> = {
  BEY: { g: 'bronze', fg: colors.white, accent: '#FFE2C4', glow: '#FFD9B8' },
  XAN: { g: 'violet', fg: colors.white, accent: '#E2D6FF', glow: '#CDB8FF' },
  SAH: { g: 'night', fg: '#FFC23D', accent: '#FFC23D', glow: '#FFB21E' },
};
const PERK_ICON: Record<string, IconName> = { frame: 'person', badge: 'crown', entry: 'sparkles', bubble: 'chat', mount: 'rocket', gifts: 'gift', top: 'trophy', antikick: 'shield' };

/** Zadəganlıq: Bəy · Xan · Şah — aylıq status, giriş effekti, çərçivə, eksklüziv hədiyyələr */
export default function Noble() {
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { void api<{ plans: Plan[] }>('/noble/plans').then((r) => setPlans(r.plans)).catch(() => {}); }, []);
  async function buy(tier: Plan['tier']) {
    setBusy(tier);
    try {
      setMe(await api<Me>('/noble/buy', { body: { tier } }));
      toast(t('noble.title') + ' ✓', 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  }
  return (
    <Screen scroll>
      <Header title={t('noble.title')} />
      <T v="small" color={colors.textMuted} style={{ marginBottom: 14 }}>{t('noble.sub')}</T>
      {me?.noble ? <View style={styles.current}><NobleBadge tier={me.noble.tier} /><T v="small">{t('noble.until', { d: me.nobleUntil ? dateOnly(me.nobleUntil) : '' })}</T></View> : null}
      <View style={{ gap: 14 }}>
        {!plans.length ? [0, 1, 2].map((i) => <Skeleton key={i} h={220} r={radius.xl} />) : null}
        {plans.map((p, i) => {
          const l = LOOK[p.tier];
          return (
            <Appear key={p.tier} i={i}>
            <GradientCard g={l.g} glow={l.glow} shine={p.tier === 'SAH'} r={radius.xl} inner={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.crown, { backgroundColor: 'rgba(255,255,255,0.15)' }]}><Icon name="crown" size={26} color={l.accent} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: l.fg }]}>{t(`noble.tiers.${p.tier}`)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><CoinIcon size={16} /><Text style={[styles.price, { color: l.fg }]}>{p.priceCoins.toLocaleString('en-US')} / {p.days} {t('noble.days')}</Text></View>
                </View>
              </View>
              <View style={styles.perks}>
                {p.perks.map((k) => (
                  <View key={k} style={styles.perk}><Icon name={PERK_ICON[k] ?? 'checkmark'} size={13} color={l.accent} /><Text style={[styles.perkText, { color: l.fg }]}>{t(`noble.perks.${k}`)}</Text></View>
                ))}
              </View>
              <Btn kind={p.tier === 'SAH' ? 'coin' : 'light'} title={me?.noble?.tier === p.tier ? t('noble.extend') : t('noble.buy')} loading={busy === p.tier} onPress={() => void buy(p.tier)} />
            </GradientCard>
            </Appear>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  current: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  card: { padding: 18, gap: 14 },
  crown: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  name: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 24, lineHeight: 30 },
  price: { ...noPad, fontFamily: fonts.bold, fontSize: 13, lineHeight: 17 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.12)' },
  perkText: { ...noPad, fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14 },
});
