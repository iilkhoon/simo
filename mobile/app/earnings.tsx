import { ECON, almazToUnits, diamondsToAzn, fmtAlmaz } from '@/lib/economy';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { colors, font, fonts, noPad, radius } from '@/theme';
import { Btn, Card, Chip, Header, Input, PressBox, Screen, T, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { CoinIcon, DiamondIcon } from '@/components/GiftIcon';
import { api } from '@/lib/api';
import { big, errorText, timeAgo } from '@/lib/format';
import { useStore } from '@/store';
import type { Me } from '@/lib/types';
import { Almaz, PeriodTabs, Progress, SourceBreakdown, minutesLabel, type Period } from '@/components/AgencyKit';
import { TIER_COLORS } from './agencies';

interface HostEarnings {
  periods: Record<Period, { total: number; bySource: Record<string, number>; paidCoins: number; onlineMin: number; callMin: number; calls: number; gifts: number }>;
  level: { level: number; name: string; minMonthly: number; next: { level: number; name: string; minMonthly: number } | null };
  monthly: number;
  targets: { targets: { dailyOnlineMin: number; dailyCallMin: number; weeklyActiveDays: number }; today: { onlineMin: number; callMin: number; done: boolean }; activeDays: number };
  agency: { id: string; name: string; tierName: string; tier: number; hostShare: number; isOwner: boolean } | null;
  lifetime: number;
  monthCommission: number;
}

const METHODS = ['CARD', 'M10', 'EMANAT', 'AGENCY'] as const;
interface W { id: string; diamonds: number; amountQepik: number; method: string; status: string; createdAt: string; rejectReason?: string }

export default function Earnings() {
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof METHODS)[number]>('CARD');
  const [account, setAccount] = useState('');
  const [exchange, setExchange] = useState('');
  const [list, setList] = useState<W[]>([]);
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState(String(me?.videoCallPrice ?? 60));
  const [voice, setVoice] = useState(String(me?.voiceCallPrice ?? 30));

  const [wallet, setWallet] = useState<{ held: number; withdrawable: number } | null>(null);
  const [he, setHe] = useState<HostEarnings | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const load = useCallback(() => {
    void api<HostEarnings>('/host/earnings').then(setHe).catch(() => {});
    void api<{ items: W[] }>('/wallet/withdrawals').then((r) => setList(r.items)).catch(() => {});
    void api<{ held: number; withdrawable: number }>('/wallet').then(setWallet).catch(() => {});
  }, []);
  useEffect(load, [load]);
  if (!me) return null;
  const isHost = me.hostStatus === 'APPROVED';

  async function withdraw() {
    setBusy(true);
    try {
      await api('/wallet/withdraw', { body: { diamonds: almazToUnits(Number(amount)), method, account } });
      toast(t('earnings.sent'), 'success');
      setAmount('');
      setMe(await api<Me>('/me'));
      load();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function doExchange() {
    try {
      setMe(await api<Me>('/wallet/exchange', { body: { diamonds: almazToUnits(Number(exchange)) } }));
      setExchange('');
      toast(t('u2.saved'), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  async function savePrices() {
    try {
      setMe(await api<Me>('/me/call-prices', { method: 'PATCH', body: { videoCallPrice: Number(video), voiceCallPrice: Number(voice) } }));
      toast(t('u2.saved'), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  const held = wallet?.held ?? 0;
  // Nağdlaşan: qazanılmış Almaz − gözləmədə (alınmış Almaz çıxmır) — daxili vahid
  const available = wallet?.withdrawable ?? Math.max(0, me.diamonds - held);
  const minAlmaz = ECON.minWithdrawDiamonds / ECON.almazUnit;
  const kycOk = me.kycStatus === 'APPROVED';
  const inAgency = !!me.agency || !!me.ownedAgency;

  return (
    <Screen scroll>
      <Header title={t('earnings.title')} />
      {/* Almaz kartı: tünd premium */}
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <DiamondIcon size={56} />
          <View style={{ flex: 1 }}>
            <T v="label" color={colors.nightMuted}>{t('earnings.diamonds')}</T>
            <Text style={styles.heroNum} numberOfLines={1}>{fmtAlmaz(me.diamonds)}</Text>
          </View>
          <View style={styles.cash}><Text style={styles.cashText}>≈ {big(Math.round(diamondsToAzn(available, false)))} ₼</Text></View>
        </View>
        <View style={styles.split}>
          <View style={styles.splitItem}><T v="tiny" color={colors.nightMuted}>{t('earnings.available')}</T><Text style={styles.splitNum}>{fmtAlmaz(available)}</Text></View>
          <View style={styles.splitDivider} />
          <View style={styles.splitItem}><T v="tiny" color={colors.nightMuted}>{t('earnings.held', { n: ECON.withdrawHoldDays })}</T><Text style={styles.splitNum}>{fmtAlmaz(held)}</Text></View>
        </View>
      </View>

      {he && (he.agency || he.lifetime > 0) ? (
        <>
          {he.agency ? (
            <PressBox style={{ marginTop: 12 }} r={radius.lg} sh={1} onPress={() => router.push('/agency')} inner={styles.notice}>
              <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[he.agency.tier - 1] ?? TIER_COLORS[0] }]}><Icon name="business" size={16} color={colors.ink} /></View>
              <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{t('earn.agencyRow', { name: he.agency.name, n: Math.round(he.agency.hostShare * 100) })}</T>
              <Icon name="chevron" size={16} color={colors.textDim} />
            </PressBox>
          ) : null}
          <Card style={styles.block}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={font.h3}>{t('earn.breakdown')}</Text>
              <Almaz units={he.periods[period].total} size={16} cash />
            </View>
            <PeriodTabs value={period} onChange={setPeriod} />
            <SourceBreakdown bySource={he.periods[period].bySource} total={he.periods[period].total} />
            {he.agency?.isOwner && he.monthCommission ? <T v="tiny" color={colors.online}>+ {t('ag.commission')} ({t('ag.period.month')}): {fmtAlmaz(he.monthCommission)}</T> : null}
          </Card>
          <Card style={styles.block}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={font.h3}>{t('earn.level')}</Text>
              <Tag label={`${t(`earn.levelNames.${he.level.level}`)} · Lv.${he.level.level}`} bg={colors.lilac} />
            </View>
            <Progress value={he.monthly} max={he.level.next?.minMonthly ?? he.monthly} color={colors.violet} />
            <T v="tiny" color={colors.textMuted}>{he.level.next ? t('earn.levelNext', { name: t(`earn.levelNames.${he.level.next.level}`), n: fmtAlmaz(he.level.next.minMonthly - he.monthly) }) : t('earn.levelMax')}</T>
            <View style={styles.sep} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={font.h3}>{t('earn.targets')}</Text>
              <T v="tiny" color={colors.textMuted}>{t('earn.weekDays', { n: he.targets.activeDays, t: he.targets.targets.weeklyActiveDays })}</T>
            </View>
            {[
              { k: 'targetOnline', icon: 'time' as const, v: he.targets.today.onlineMin, max: he.targets.targets.dailyOnlineMin, c: colors.online },
              { k: 'targetCalls', icon: 'videocam' as const, v: he.targets.today.callMin, max: he.targets.targets.dailyCallMin, c: colors.diamond },
            ].map((x) => (
              <View key={x.k} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name={x.icon} size={14} color={x.c} />
                  <T v="bodyStrong" style={{ flex: 1 }}>{t(`earn.${x.k}`)}</T>
                  <T v="tiny" color={x.v >= x.max ? colors.online : colors.textMuted}>{minutesLabel(Math.min(x.v, x.max), t)} / {minutesLabel(x.max, t)}</T>
                </View>
                <Progress value={x.v} max={x.max} color={x.c} />
              </View>
            ))}
            <T v="tiny" color={colors.textDim}>{t('earn.targetsHint')}</T>
          </Card>
        </>
      ) : null}

      {!inAgency ? (
        <PressBox style={{ marginTop: 12 }} r={radius.lg} sh={0} bg={colors.highlight} onPress={() => router.push('/agencies')} inner={styles.notice}>
          <Icon name="business" size={20} color={colors.ink} />
          <T v="small" style={{ flex: 1, fontFamily: fonts.bold }}>{t('earnings.needAgency')}</T>
          <Icon name="chevron" size={16} color={colors.ink} />
        </PressBox>
      ) : null}
      {!kycOk ? (
        <PressBox style={{ marginTop: 12 }} r={radius.lg} sh={0} bg={colors.skySoft} onPress={() => router.push('/verify')} inner={styles.notice}>
          <Icon name="shield" size={20} color={colors.diamond} />
          <T v="small" style={{ flex: 1, fontFamily: fonts.bold }}>{me.kycStatus === 'PENDING' ? t('kyc.pending') : t('earnings.needKyc')}</T>
          <Icon name="chevron" size={16} color={colors.ink} />
        </PressBox>
      ) : null}

      {isHost ? (
        <PressBox style={{ marginTop: 12 }} r={radius.lg} sh={1} onPress={() => router.push('/host-settings')} inner={styles.notice}>
          <Icon name="settings" size={20} color={colors.ink} />
          <T v="bodyStrong" style={{ flex: 1 }}>{t('hostSettings.title')}</T>
          <Icon name="chevron" size={16} color={colors.textDim} />
        </PressBox>
      ) : null}

      {isHost ? (
        <Card style={styles.block}>
          <Text style={font.h3}>{t('earnings.callPrices')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Input label={t('earnings.videoPrice')} value={video} onChangeText={setVideo} keyboardType="number-pad" /></View>
            <View style={{ flex: 1 }}><Input label={t('earnings.voicePrice')} value={voice} onChangeText={setVoice} keyboardType="number-pad" /></View>
          </View>
          <Btn size="md" kind="dark" title={t('common.save')} onPress={savePrices} />
        </Card>
      ) : null}

      <Card style={styles.block}>
        <Text style={font.h3}>{t('earnings.exchange')}</Text>
        <Text style={font.small}>{t('earnings.exchangeSub', { rate: ECON.almazUnit })}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Input value={exchange} onChangeText={(v) => setExchange(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="10" /></View>
          <Btn full={false} size="lg" kind="coin" iconRight={<CoinIcon size={18} />} title={exchange ? `${almazToUnits(Number(exchange)).toLocaleString('en-US')}` : t('earnings.exchangeBtn')} onPress={doExchange} />
        </View>
      </Card>

      <Card style={styles.block}>
        <Text style={font.h3}>{t('earnings.withdraw')}</Text>
        <View style={styles.rules}>
          {[t('earnings.min', { n: minAlmaz }), `${ECON.diamondsPerAzn / ECON.almazUnit} ${t('common.diamonds')} = 1 ₼`, t('earnings.fee', { n: ECON.withdrawFeeRate * 100 }), t('earnings.weekly'), t('earnings.kycRule')].map((r) => (
            <View key={r} style={styles.rule}><Icon name="checkmark" size={13} color={colors.online} /><T v="tiny" color={colors.textMuted}>{r}</T></View>
          ))}
        </View>
        <Input label={t('earnings.amount')} value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={String(minAlmaz)} />
        <T v="label" color={colors.textMuted}>{t('earnings.method')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {METHODS.filter((m) => m !== 'AGENCY' || me.agency).map((m) => <Chip key={m} label={t(`earnings.methods.${m}`)} active={method === m} onPress={() => setMethod(m)} />)}
        </View>
        <Input label={t('earnings.account')} value={account} onChangeText={setAccount} placeholder="4169 •••• •••• ••••" />
        <Btn title={`${t('earnings.withdraw')}${amount ? ` · ${diamondsToAzn(almazToUnits(Number(amount))).toFixed(2)} ₼` : ''}`} loading={busy} disabled={!kycOk || Number(amount) < minAlmaz || account.length < 4 || almazToUnits(Number(amount)) > available} onPress={withdraw} />
      </Card>

      {list.length ? (
        <>
          <Text style={[font.h3, { marginTop: 16, marginBottom: 8 }]}>{t('earnings.requests')}</Text>
          <Card>
            {list.map((w) => (
              <View key={w.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={font.body}>{(w.amountQepik / 100).toFixed(2)} ₼ · {t(`earnings.methods.${w.method}`)}</Text>
                  <Text style={font.tiny}>{timeAgo(w.createdAt)} · {fmtAlmaz(w.diamonds)} {t('common.diamonds')}</Text>
                  {w.status === 'REJECTED' && w.rejectReason ? <Text style={[font.tiny, { color: colors.danger }]}>{t('earn.rejectReason', { r: w.rejectReason })} · {t('earn.refunded')}</Text> : null}
                </View>
                <Tag label={t(`earnings.status.${w.status}`)} bg={w.status === 'PAID' ? colors.onlineSoft : w.status === 'REJECTED' ? colors.brandSoft : colors.coinSoft} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.night, borderRadius: radius.xl, padding: 20, overflow: 'hidden' },
  heroGlow: { position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(242,52,79,0.22)' },
  heroNum: { ...noPad, color: colors.white, fontFamily: fonts.displayBlack, fontSize: 38, lineHeight: 44, letterSpacing: -1.4 },
  cash: { backgroundColor: colors.highlight, borderRadius: 14, paddingHorizontal: 10, height: 28, justifyContent: 'center' },
  cashText: { ...noPad, color: colors.ink, fontFamily: fonts.black, fontSize: 12.5, lineHeight: 16 },
  split: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 12 },
  splitItem: { flex: 1, gap: 2 },
  splitDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 12 },
  splitNum: { ...noPad, color: colors.white, fontFamily: fonts.display, fontSize: 18, lineHeight: 23 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  block: { padding: 16, gap: 10, marginTop: 14 },
  rules: { gap: 4 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: colors.hairline },
  tierDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: colors.hairline, marginVertical: 4 },
});
