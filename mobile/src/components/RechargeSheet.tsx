import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '../theme';
import { api, ApiError } from '../lib/api';
import { azn, errorText } from '../lib/format';
import { buyCoins, storePrices } from '../lib/payments';
import { useStore } from '../store';
import type { CoinPackage } from '../lib/types';
import { CoinIcon } from './GiftIcon';
import { sheetStyles } from './ActionSheet';
import { T, Tag } from './ui';

/**
 * Cəld yükləmə vərəqəsi — zəngi/yayını tərk etmədən Nar almaq (Chamet/LivU "Recharge" pop-up kimi).
 * Ən uyğun 6 paket; `need` verilsə, ona çatan ən kiçik paket vurğulanır.
 * Ödəniş məntiqi pul kisəsi ekranı ilə eynidir (IAP / Google Play / Epoint; test hesabında demo alış).
 */
export function RechargeSheet({ visible, onClose, onDone, need, title, sub, night }: {
  visible: boolean; onClose: () => void; onDone?: (credited: number) => void; need?: number; title?: string; sub?: string; night?: boolean;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { me, toast, refreshMe } = useStore();
  const [pkgs, setPkgs] = useState<CoinPackage[] | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || pkgs) return;
    api<{ packages: CoinPackage[] }>('/wallet')
      .then((d) => {
        const list = [...d.packages].sort((a, b) => a.coins - b.coins).slice(0, 6);
        setPkgs(list);
        void storePrices(list).then(setPrices);
      })
      .catch((e) => toast(errorText(e), 'error'));
  }, [visible, pkgs, toast]);

  async function buy(pkg: CoinPackage) {
    if (!me || buying) return;
    setBuying(pkg.id);
    try {
      let credited: number;
      if (me.isTester) {
        credited = (await api<{ credited: number }>('/payments/dev/purchase', { body: { packageId: pkg.id } })).credited;
      } else try {
        credited = await buyCoins(pkg, me.id);
      } catch (e) {
        if (__DEV__ && e instanceof ApiError && e.code === 'STORE_UNAVAILABLE') {
          credited = (await api<{ credited: number }>('/payments/dev/purchase', { body: { packageId: pkg.id } })).credited;
        } else throw e;
      }
      await refreshMe();
      toast(t('cl.bought', { n: credited }), 'success');
      onDone?.(credited);
      onClose();
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'CANCELLED')) {
        toast(e instanceof ApiError && e.code === 'STORE_UNAVAILABLE' ? t('wallet.storeUnavailable') : errorText(e), 'error');
      }
    } finally {
      setBuying(null);
    }
  }

  const best = need && pkgs ? pkgs.find((p) => p.coins + p.bonusCoins >= need)?.id : undefined;
  const bg = night ? colors.night2 : colors.bg;
  const fg = night ? colors.nightText : colors.ink;
  const muted = night ? colors.nightMuted : colors.textMuted;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[sheetStyles.sheet, styles.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16 }]}>
        <View style={[sheetStyles.grip, night && { backgroundColor: colors.nightLine }]} />
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <T v="title" color={fg}>{title ?? t('cl.rechargeTitle')}</T>
            <T v="small" color={muted}>{sub ?? t('cl.rechargeSub')}</T>
          </View>
          <View style={[styles.bal, { backgroundColor: night ? colors.night3 : colors.coinSoft }]}>
            <CoinIcon size={16} />
            <Text style={[styles.balText, { color: fg }]}>{me?.coins ?? 0}</Text>
          </View>
        </View>
        {!pkgs ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 30 }} /> : (
          <View style={styles.grid}>
            {pkgs.map((p) => {
              const hl = p.id === best;
              return (
                <Pressable
                  key={p.id}
                  disabled={!!buying}
                  onPress={() => void buy(p)}
                  style={({ pressed }) => [styles.pkg, { backgroundColor: night ? colors.night3 : colors.card }, hl && styles.pkgHl, pressed && { opacity: 0.8 }]}
                >
                  {hl ? <Tag label="✓" bg={colors.coin} style={styles.hlTag} /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <CoinIcon size={18} />
                    <Text style={[styles.coins, { color: fg }]}>{p.coins}</Text>
                  </View>
                  {p.bonusCoins ? <Text style={styles.bonus}>+{p.bonusCoins}</Text> : <Text style={styles.bonus}> </Text>}
                  {buying === p.id ? <ActivityIndicator size="small" color={colors.brand} /> : (
                    <Text style={[styles.price, { color: muted }]}>{prices[p.id] ?? azn(p.priceQepik)}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,14,13,0.35)' },
  sheet: { paddingTop: 10, paddingHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 14 },
  bal: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.pill, paddingHorizontal: 10, height: 32 },
  balText: { fontFamily: fonts.black, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pkg: { width: '31%', flexGrow: 1, borderRadius: 18, paddingVertical: 14, alignItems: 'center', gap: 4 },
  pkgHl: { borderWidth: 2, borderColor: colors.coin },
  hlTag: { position: 'absolute', top: -8, right: -4, height: 20, paddingHorizontal: 6 },
  coins: { fontFamily: fonts.black, fontSize: 17 },
  bonus: { fontFamily: fonts.bold, fontSize: 12, color: colors.online },
  price: { fontFamily: fonts.bold, fontSize: 12.5 },
});
