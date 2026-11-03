import { firstBonus } from '@/lib/economy';
import React, { useCallback, useEffect, useState } from 'react';
import { fmtAlmaz } from '@/lib/economy';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '@/theme';
import { Card, Header, Loader, PressBox, Screen, SectionTitle, T, Tabs } from '@/components/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { track } from '@/lib/track';
import { Icon } from '@/components/Icon';
import { CoinIcon, DiamondIcon } from '@/components/GiftIcon';
import { Coin3D } from '@/components/Coin3D';
import { api, ApiError } from '@/lib/api';
import { azn, errorText, timeAgo } from '@/lib/format';
import { buyCoins, storePrices } from '@/lib/payments';
import { useStore } from '@/store';
import { STORE } from '@/config';
import type { CoinPackage } from '@/lib/types';

const CW = (Dimensions.get('window').width - 32 - 12) / 2;

interface Offer { id: string; kind: string; bonusPct: number; discountPct: number; expiresAt: string; package: { id: string; coins: number; priceQepik: number; bonus: number } | null }

interface WalletData {
  coins: number; diamonds: number; firstRechargeDone: boolean;
  packages: CoinPackage[];
  almazPackages?: CoinPackage[];
  history: { id: string; currency: 'COIN' | 'DIAMOND'; amount: number; type: string; createdAt: string }[];
  rates: { firstRechargeBonus?: { rate: number; max: number } };
}

export default function Wallet() {
  const { t } = useTranslation();
  const { me, toast, refreshMe } = useStore();
  const [data, setData] = useState<WalletData | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'nar' | 'almaz'>(params.tab === 'almaz' ? 'almaz' : 'nar');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(i); }, []);

  const load = useCallback(async () => {
    try {
      const d = await api<WalletData>('/wallet');
      setData(d);
      void storePrices([...d.packages, ...(d.almazPackages ?? [])]).then(setPrices);
      void api<{ items: Offer[] }>('/me/offers').then((r) => { setOffers(r.items); if (r.items.length) track({ kind: 'offer_view', meta: { n: r.items.length } }); }).catch(() => {});
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function buy(pkg: CoinPackage) {
    if (!me) return;
    setBuying(pkg.id);
    try {
      let credited: number;
      if (me.isTester) {
        // Test hesabı: real ödəniş yoxdur, demo alış
        credited = (await api<{ credited: number }>('/payments/dev/purchase', { body: { packageId: pkg.id } })).credited;
      } else try {
        credited = await buyCoins(pkg, me.id);
      } catch (e) {
        // Yalnız inkişaf rejimində: mağaza olmadıqda test alışı
        if (__DEV__ && e instanceof ApiError && e.code === 'STORE_UNAVAILABLE') {
          credited = (await api<{ credited: number }>('/payments/dev/purchase', { body: { packageId: pkg.id } })).credited;
        } else throw e;
      }
      toast(t('wallet.success', { n: credited }), 'success');
      await Promise.all([refreshMe(), load()]);
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'CANCELLED')) {
        toast(e instanceof ApiError && e.code === 'STORE_UNAVAILABLE' ? t('wallet.storeUnavailable') : errorText(e), 'error');
      }
    } finally {
      setBuying(null);
    }
  }

  if (!data) return <Screen><Header title={t('wallet.title')} /><Loader full /></Screen>;
  const first = !data.firstRechargeDone;
  const coins = me?.coins ?? data.coins;
  const promo = me?.promoCoins ?? 0;

  return (
    <Screen scroll>
      <Header title={t('wallet.title')} />
      {/* Balans kartı: tünd premium, iri Nar sikkəsi */}
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Coin3D size={92} style={{ marginVertical: -12, marginLeft: -10 }} />
          <View style={{ flex: 1 }}>
            <T v="label" color={colors.nightMuted}>{t('wallet.balance')}</T>
            <Text style={styles.heroNum} numberOfLines={1}>{coins.toLocaleString('en-US')}</Text>
          </View>
        </View>
        {promo > 0 ? <T v="tiny" color={colors.nightMuted} style={{ marginTop: 6 }}>{t('wallet.promoPart', { n: promo.toLocaleString('en-US') })}</T> : null}
        <View style={styles.usage}>
          {([['chat', 'usage1'], ['videocam', 'usage2'], ['gift', 'usage3']] as const).map(([ic, k]) => (
            <View key={k} style={styles.usageItem}><Icon name={ic} size={14} color={colors.white} /><Text style={styles.usageText}>{t(`wallet.${k}`)}</Text></View>
          ))}
        </View>
      </View>

      {first ? (
        <View style={styles.promo}>
          <View style={styles.promoIcon}><Icon name="gift" size={20} color={colors.ink} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoTitle}>{t('wallet.firstBonus')}</Text>
            <T v="tiny" color="rgba(255,255,255,0.85)">{t('wallet.promoNote')}</T>
          </View>
        </View>
      ) : null}

      {offers.length ? (
        <View style={{ gap: 10, marginTop: 14 }}>
          {offers.map((o) => {
            const left = Math.max(0, new Date(o.expiresAt).getTime() - now);
            const h = Math.floor(left / 3600_000), m = Math.floor((left % 3600_000) / 60_000);
            const pkg = o.package ? data.packages.find((p) => p.id === o.package!.id) : null;
            return (
              <PressBox key={o.id} r={22} sh={2} bg={colors.ink} disabled={!!buying} onPress={() => (pkg ? void buy(pkg) : router.push('/vip'))} inner={styles.offer}>
                <View style={styles.offerBadge}><Text style={styles.offerPct}>{o.bonusPct ? `+${o.bonusPct}%` : `-${o.discountPct}%`}</Text></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="label" color={colors.coin}>{t('offers.title')} · {t('offers.endsIn', { t: h ? `${h}s ${m}d` : `${m}d` })}</T>
                  <Text style={styles.offerTitle} numberOfLines={2}>{t(`offers.kinds.${o.kind}`, { defaultValue: t('offers.title') })}</Text>
                  <T v="tiny" color={colors.nightMuted}>{o.package ? `${o.package.coins.toLocaleString('en-US')} Nar ${t('offers.extra', { n: o.package.bonus })} · ${azn(o.package.priceQepik)}` : t('offers.vipDisc', { n: o.discountPct })}</T>
                </View>
                <View style={styles.offerCta}>{buying && pkg && buying === pkg.id ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.offerCtaText}>{t('offers.take')}</Text>}</View>
              </PressBox>
            );
          })}
        </View>
      ) : null}

      <Tabs value={tab} onChange={setTab} options={[{ key: 'nar', label: `🪙 Nar` }, { key: 'almaz', label: `💎 ${t('almaz.title')}` }]} />
      {tab === 'almaz' ? (
        <>
          <View style={styles.almazInfo}>
            <DiamondIcon size={28} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="bodyStrong">{t('almaz.balance', { n: fmtAlmaz(me?.diamonds ?? data.diamonds) })}</T>
              <T v="tiny" color={colors.textMuted}>{t('almaz.what')}</T>
              <T v="tiny" color={colors.textMuted}>{t('almaz.bought')}</T>
            </View>
          </View>
          <SectionTitle title={t('almaz.packs')} />
          <View style={styles.grid}>
            {(data.almazPackages ?? []).map((p) => {
              const pid = STORE === 'apple' ? p.appleProductId : p.googleProductId;
              return (
                <PressBox key={p.id} disabled={!!buying} onPress={() => void buy(p)} style={{ width: CW }} r={22} sh={1} bg={colors.card} inner={styles.pkg}>
                  <DiamondIcon size={40} />
                  <Text style={styles.coins}>{fmtAlmaz(p.coins)}</Text>
                  <Text style={styles.bonus} numberOfLines={1}>= {(p.coins).toLocaleString('en-US')} Nar</Text>
                  <View style={{ height: 22 }} />
                  <View style={[styles.price, { backgroundColor: colors.diamond }]}>
                    {buying === p.id ? <ActivityIndicator color={colors.white} /> : <Text style={styles.priceText}>{prices[pid] ?? azn(p.priceQepik)}</Text>}
                  </View>
                </PressBox>
              );
            })}
          </View>
        </>
      ) : null}
      {tab === 'nar' ? <SectionTitle title={t('wallet.recharge')} /> : null}
      {tab === 'nar' ? <View style={styles.grid}>
        {data.packages.map((p) => {
          const pid = STORE === 'apple' ? p.appleProductId : p.googleProductId;
          const total = p.coins + p.bonusCoins;
          const offer = offers.find((o) => o.package?.id === p.id);
          const gift = first ? firstBonus(total) : offer?.package?.bonus ?? 0;
          const pop = !!p.popular;
          return (
            <PressBox key={p.id} disabled={!!buying} onPress={() => void buy(p)} style={{ width: CW }} r={22} sh={pop ? 2 : 1} bg={colors.card} inner={[styles.pkg, pop && styles.pkgPop]}>
              {pop ? <View style={styles.popTag}><Text style={styles.popText}>{t('wallet.popular').toUpperCase()}</Text></View> : null}
              <CoinIcon size={40} />
              <Text style={styles.coins}>{total.toLocaleString('en-US')}</Text>
              <Text style={styles.bonus} numberOfLines={1}>{p.bonusCoins ? t('wallet.bonus', { n: p.bonusCoins }) : ' '}</Text>
              {gift ? <View style={styles.giftTag}><Icon name="gift" size={11} color={colors.ink} /><Text style={styles.giftText}>{t('wallet.firstGift', { n: gift })}</Text></View> : <View style={{ height: 22 }} />}
              <View style={[styles.price, pop && { backgroundColor: colors.brand }]}>
                {buying === p.id ? <ActivityIndicator color={colors.white} /> : <Text style={styles.priceText}>{prices[pid] ?? azn(p.priceQepik)}</Text>}
              </View>
            </PressBox>
          );
        })}
      </View> : null}
      {STORE === 'huawei' ? <T v="small" color={colors.textMuted} center style={{ marginTop: 12 }}>{t('wallet.webTopup')}</T> : null}
      <View style={styles.secure}>
        <Icon name="shield" size={16} color={colors.online} />
        <T v="tiny" color={colors.textMuted} style={{ flex: 1 }}>{t('wallet.secure')}</T>
      </View>

      <SectionTitle title={t('wallet.history')} />
      <Card>
        {data.history.length === 0 ? <T v="small" color={colors.textMuted} center style={{ padding: 20 }}>{t('wallet.noHistory')}</T> : null}
        {data.history.slice(0, 40).map((h, i) => (
          <View key={h.id} style={[styles.hist, i === Math.min(data.history.length, 40) - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.histIcon, { backgroundColor: h.amount > 0 ? colors.onlineSoft : colors.bgSunken }]}>
              <Icon name={h.amount > 0 ? 'add' : 'arrowUp'} size={15} color={h.amount > 0 ? colors.online : colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="bodyStrong" numberOfLines={1}>{t(`wallet.types.${h.type}`, { defaultValue: h.type })}</T>
              <T v="tiny" color={colors.textDim}>{timeAgo(h.createdAt)}</T>
            </View>
            <Text style={[styles.histAmt, { color: h.amount > 0 ? colors.online : colors.ink }]}>{h.amount > 0 ? '+' : ''}{h.currency === 'DIAMOND' ? fmtAlmaz(h.amount) : h.amount}</Text>
            {h.currency === 'COIN' ? <CoinIcon size={16} /> : <DiamondIcon size={16} />}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.night, borderRadius: radius.xl, padding: 20, overflow: 'hidden' },
  heroGlow: { position: 'absolute', left: -40, top: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,194,61,0.10)' },
  heroNum: { ...noPad, color: colors.white, fontFamily: fonts.displayBlack, fontSize: 40, lineHeight: 46, letterSpacing: -1.5 },
  usage: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  usageItem: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' },
  usageText: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14 },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  offerBadge: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.coin, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  offerPct: { ...noPad, color: colors.ink, fontFamily: fonts.displayBlack, fontSize: 17, lineHeight: 21 },
  offerTitle: { ...noPad, color: colors.white, fontFamily: fonts.display, fontSize: 15, lineHeight: 19 },
  offerCta: { height: 38, minWidth: 64, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.coin, alignItems: 'center', justifyContent: 'center' },
  offerCtaText: { ...noPad, color: colors.ink, fontFamily: fonts.black, fontSize: 13, lineHeight: 16 },
  almazInfo: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: colors.skySoft, borderRadius: radius.lg, padding: 14, marginTop: 14 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.brand },
  promoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.coin, alignItems: 'center', justifyContent: 'center' },
  promoTitle: { ...noPad, color: colors.white, fontFamily: fonts.display, fontSize: 14, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pkg: { padding: 14, paddingTop: 30, alignItems: 'center', gap: 2 },
  pkgPop: { borderWidth: 2, borderColor: colors.brand, borderRadius: 22 },
  popTag: { position: 'absolute', top: 8, alignSelf: 'center', backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 8, height: 20, justifyContent: 'center' },
  popText: { ...noPad, color: colors.white, fontFamily: fonts.black, fontSize: 9.5, lineHeight: 12, letterSpacing: 0.6 },
  coins: { ...noPad, color: colors.ink, fontFamily: fonts.displayBlack, fontSize: 24, lineHeight: 30, marginTop: 6, letterSpacing: -0.8 },
  bonus: { ...noPad, color: colors.online, fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 15 },
  giftTag: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: colors.highlight, marginTop: 4 },
  giftText: { ...noPad, color: colors.ink, fontFamily: fonts.black, fontSize: 10.5, lineHeight: 13 },
  price: { marginTop: 10, backgroundColor: colors.ink, borderRadius: radius.pill, height: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  priceText: { ...noPad, color: colors.white, fontFamily: fonts.black, fontSize: 15, lineHeight: 19 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.hairline },
  histIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  histAmt: { ...noPad, fontFamily: fonts.black, fontSize: 15, lineHeight: 19 },
});
