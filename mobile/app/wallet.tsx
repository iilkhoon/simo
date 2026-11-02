import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '@/theme';
import { Box, Card, Header, Loader, PressBox, Screen, SectionTitle, T, Tag } from '@/components/ui';
import { Burst } from '@/components/Burst';
import { Icon } from '@/components/Icon';
import { CoinIcon } from '@/components/GiftIcon';
import { api, ApiError } from '@/lib/api';
import { azn, errorText, timeAgo } from '@/lib/format';
import { buyCoins, storePrices } from '@/lib/payments';
import { useStore } from '@/store';
import { STORE } from '@/config';
import type { CoinPackage } from '@/lib/types';

const CW = (Dimensions.get('window').width - 32 - 6 - 8) / 2;

interface WalletData {
  coins: number; diamonds: number; firstRechargeDone: boolean;
  packages: CoinPackage[];
  history: { id: string; currency: 'COIN' | 'DIAMOND'; amount: number; type: string; createdAt: string }[];
  rates: { firstRechargeMultiplier: number };
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
  const mult = data.firstRechargeDone ? 1 : data.rates.firstRechargeMultiplier;

  return (
    <Screen scroll>
      <Header title={t('wallet.title')} />
      <Box r={26} sh={6} bg={colors.coin} inner={styles.hero}>
        <View style={{ position: 'absolute', right: -46, top: -46 }}><Burst size={130} color={colors.coinSoft} points={16} /></View>
        <T v="label">{t('wallet.balance')}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <CoinIcon size={46} />
          <Text style={styles.heroNum}>{(me?.coins ?? data.coins).toLocaleString('en-US')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
          <Tag label={t('wallet.usage1')} icon="chat" bg={colors.card} />
          <Tag label={t('wallet.usage2')} icon="videocam" bg={colors.card} />
          <Tag label={t('wallet.usage3')} icon="gift" bg={colors.card} />
        </View>
      </Box>

      {!data.firstRechargeDone ? (
        <Box r={18} sh={3} bg={colors.brand} style={{ marginTop: 10 }} inner={styles.promo}>
          <View style={styles.x2}><Text style={styles.x2Text}>×2</Text></View>
          <Text style={styles.promoText}>{t('wallet.firstBonus')}</Text>
        </Box>
      ) : null}

      <SectionTitle title={t('wallet.recharge')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {data.packages.map((p) => {
          const pid = STORE === 'apple' ? p.appleProductId : p.googleProductId;
          const total = p.coins * mult + p.bonusCoins;
          const pop = !!p.popular;
          return (
            <PressBox key={p.id} disabled={!!buying} onPress={() => void buy(p)} style={{ width: CW }} r={20} sh={pop ? 5 : 3} bg={pop ? colors.coinSoft : colors.card} inner={styles.pkg}>
              {pop ? <Tag label={t('wallet.popular').toUpperCase()} bg={colors.brand} fg={colors.white} style={styles.popTag} /> : null}
              <CoinIcon size={38} />
              <Text style={styles.coins}>{total.toLocaleString('en-US')}</Text>
              <Text style={styles.bonus} numberOfLines={1}>
                {mult > 1 ? `${p.coins} ×2` : p.bonusCoins ? `${p.coins}` : ' '}
                {p.bonusCoins ? ` ${t('wallet.bonus', { n: p.bonusCoins })}` : ''}
              </Text>
              <View style={[styles.price, pop && { backgroundColor: colors.brand }]}>
                {buying === p.id ? <ActivityIndicator color={pop ? colors.white : colors.bg} /> : <Text style={styles.priceText}>{prices[pid] ?? azn(p.priceQepik)}</Text>}
              </View>
            </PressBox>
          );
        })}
      </View>
      {STORE === 'huawei' ? <T v="small" color={colors.textMuted} center style={{ marginTop: 12 }}>{t('wallet.webTopup')}</T> : null}
      <View style={styles.secure}>
        <Icon name="shield" size={16} color={colors.textMuted} />
        <T v="tiny" color={colors.textMuted} style={{ flex: 1 }}>{t('wallet.secure')}</T>
      </View>

      <SectionTitle title={t('wallet.history')} />
      <Card r={20} sh={3}>
        {data.history.slice(0, 50).map((h, i, arr) => (
          <View key={h.id} style={[styles.hist, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.histIcon, { backgroundColor: h.amount > 0 ? colors.onlineSoft : colors.bgSunken }]}>
              <Icon name={h.amount > 0 ? 'add' : 'arrowUp'} size={15} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">{t(`wallet.types.${h.type}`, { defaultValue: h.type })}</T>
              <T v="tiny" color={colors.textDim}>{timeAgo(h.createdAt)}</T>
            </View>
            <Text style={[styles.histAmt, { color: h.amount > 0 ? colors.online : colors.ink }]}>
              {h.amount > 0 ? '+' : ''}{h.amount} {h.currency === 'COIN' ? '🪙' : '💎'}
            </Text>
          </View>
        ))}
        {!data.history.length ? <View style={{ padding: 16 }}><T v="small" color={colors.textMuted}>{t('wallet.noHistory')}</T></View> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20 },
  heroNum: { color: colors.ink, fontSize: 44, fontFamily: fonts.display, letterSpacing: -1.5 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  x2: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.highlight, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  x2Text: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  promoText: { color: colors.white, fontFamily: fonts.black, flex: 1, fontSize: 14 },
  pkg: { padding: 14, alignItems: 'center', gap: 4 },
  popTag: { position: 'absolute', top: 8, left: 8 },
  coins: { color: colors.ink, fontSize: 24, fontFamily: fonts.display, letterSpacing: -0.8, marginTop: 4 },
  bonus: { color: colors.brand, fontSize: 11, fontFamily: fonts.bold, minHeight: 15 },
  price: { marginTop: 8, backgroundColor: colors.ink, borderRadius: radius.pill, height: 38, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  priceText: { color: colors.white, fontFamily: fonts.black, fontSize: 15 },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 4 },
  hist: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1.5, borderColor: colors.hairline },
  histIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  histAmt: { fontFamily: fonts.black, fontSize: 14 },
});
