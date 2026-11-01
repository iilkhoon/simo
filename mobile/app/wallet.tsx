import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { Card, Header, Loader, Screen } from '@/components/ui';
import { CoinIcon } from '@/components/GiftIcon';
import { CoinAmount } from '@/components/Badges';
import { api, ApiError } from '@/lib/api';
import { azn, errorText, timeAgo } from '@/lib/format';
import { buyCoins, storePrices } from '@/lib/payments';
import { useStore } from '@/store';
import { STORE } from '@/config';
import type { CoinPackage } from '@/lib/types';

const CW = (Dimensions.get('window').width - 32 - 10) / 2;

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
      <LinearGradient colors={['#FFE58F', '#F2A100', '#E0115F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Text style={{ color: 'rgba(58,31,0,0.8)', fontWeight: '700' }}>{t('wallet.balance')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <CoinIcon size={44} />
          <Text style={{ color: '#fff', fontSize: 44, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6 }}>{me?.coins ?? data.coins}</Text>
        </View>
      </LinearGradient>

      {!data.firstRechargeDone ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.promo}>
          <Text style={{ fontSize: 26 }}>🔥</Text>
          <Text style={{ color: '#fff', fontWeight: '900', flex: 1, fontSize: 15 }}>{t('wallet.firstBonus')}</Text>
        </LinearGradient>
      ) : null}

      <Text style={[font.h3, { marginVertical: 12 }]}>{t('wallet.recharge')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {data.packages.map((p) => {
          const pid = STORE === 'apple' ? p.appleProductId : p.googleProductId;
          const total = p.coins * mult + p.bonusCoins;
          return (
            <Pressable key={p.id} disabled={!!buying} onPress={() => void buy(p)} style={({ pressed }) => [{ width: CW, opacity: pressed ? 0.8 : 1 }]}>
              <View style={[styles.pkg, p.popular && { borderColor: colors.rose, borderWidth: 2 }]}>
                {p.popular ? (
                  <LinearGradient colors={gradients.primary} style={styles.tag}><Text style={styles.tagText}>{t('wallet.popular')}</Text></LinearGradient>
                ) : null}
                <CoinIcon size={40} />
                <Text style={styles.coins}>{total.toLocaleString()}</Text>
                {p.bonusCoins || mult > 1 ? (
                  <Text style={styles.bonus}>{mult > 1 ? `${p.coins} ×2` : p.coins}{p.bonusCoins ? ` ${t('wallet.bonus', { n: p.bonusCoins })}` : ''}</Text>
                ) : <Text style={styles.bonus}> </Text>}
                <View style={styles.price}>
                  {buying === p.id ? <Loader /> : <Text style={styles.priceText}>{prices[pid] ?? azn(p.priceQepik)}</Text>}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {STORE === 'huawei' ? <Text style={[font.small, { marginTop: 12, textAlign: 'center' }]}>{t('wallet.webTopup')}</Text> : null}

      <Text style={[font.h3, { marginTop: 22, marginBottom: 10 }]}>{t('wallet.history')}</Text>
      <Card>
        {data.history.slice(0, 50).map((h) => (
          <View key={h.id} style={styles.hist}>
            <View style={{ flex: 1 }}>
              <Text style={font.body}>{t(`wallet.types.${h.type}`, { defaultValue: h.type })}</Text>
              <Text style={font.tiny}>{timeAgo(h.createdAt)}</Text>
            </View>
            <Text style={{ color: h.amount > 0 ? colors.online : colors.textMuted, fontWeight: '800' }}>
              {h.amount > 0 ? '+' : ''}{h.amount} {h.currency === 'COIN' ? '🪙' : '💎'}
            </Text>
          </View>
        ))}
        {!data.history.length ? <View style={{ padding: 16 }}><CoinAmount n={0} /></View> : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 22, gap: 6 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, marginTop: 12 },
  pkg: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tag: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 10, paddingVertical: 3, borderBottomLeftRadius: 12 },
  tagText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  coins: { color: colors.gold, fontSize: 24, fontWeight: '900' },
  bonus: { color: colors.peach, fontSize: 11, fontWeight: '700' },
  price: { marginTop: 6, backgroundColor: colors.surface2, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, minWidth: '90%', alignItems: 'center' },
  priceText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  hist: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
});
