import { firstBonus } from '@/lib/economy';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '@/theme';
import { Card, Header, Loader, PressBox, Screen, SectionTitle, T } from '@/components/ui';
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

interface WalletData {
  coins: number; diamonds: number; firstRechargeDone: boolean;
  packages: CoinPackage[];
  history: { id: string; currency: 'COIN' | 'DIAMOND'; amount: number; type: string; createdAt: string }[];
  rates: { firstRechargeBonus?: { rate: number; max: number } };
}

export default function Wallet() {
  const { t } = useTranslation();
  const { me, toast, refreshMe } = useStore();
  const [data, setData] = useState<WalletData | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<WalletData>('/wallet');
      setData(d);
      void storePrices(d.packages).then(setPrices);
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
      try {
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
        {promo > 0 ? <T v="tiny" color={colors.nightMuted} style={{ marginTop: 6 }}>{t('wallet.promoPart', { n: promo })}</T> : null}
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

      <SectionTitle title={t('wallet.recharge')} />
      <View style={styles.grid}>
        {data.packages.map((p) => {
          const pid = STORE === 'apple' ? p.appleProductId : p.googleProductId;
          const total = p.coins + p.bonusCoins;
          const gift = first ? firstBonus(total) : 0;
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
      </View>
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
            <Text style={[styles.histAmt, { color: h.amount > 0 ? colors.online : colors.ink }]}>{h.amount > 0 ? '+' : ''}{h.amount}</Text>
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
