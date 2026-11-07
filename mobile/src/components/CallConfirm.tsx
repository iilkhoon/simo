import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '../theme';
import { fetchQuote, placeCall, useCallConfirm } from '../lib/calls';
import { useStore } from '../store';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './Badges';
import { CoinIcon } from './GiftIcon';
import { Icon } from './Icon';
import { sheetStyles } from './ActionSheet';
import { Btn, T } from './ui';
import { RechargeSheet } from './RechargeSheet';

/**
 * Zəngdən əvvəl qiymət təsdiqi (Chamet / LivU / Tango üslubu): dəqiqəlik qiymət, balans,
 * "≈ N dəqiqəyə çatır", ilk dəqiqənin nə vaxt tutulduğu. Balans çatmırsa — eyni yerdə yükləmə.
 * Kökdə (_layout) bir dəfə qoşulur; `startCall()` açır.
 */
export function CallConfirm() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { quote, userId, open, close } = useCallConfirm();
  const me = useStore((s) => s.me);
  const [recharge, setRecharge] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!quote || !userId) return null;
  const peer = quote.peer;
  const video = quote.type === 'VIDEO';
  const price = quote.price ?? 0;
  const coins = me?.coins ?? quote.coins ?? 0;
  const enough = coins >= price;
  const minutes = price ? Math.floor(coins / price) : 0;
  const accent = video ? colors.brand : colors.diamond;
  const discounted = quote.basePrice != null && quote.basePrice > price;

  async function go() {
    if (!userId || !quote) return;
    setBusy(true);
    const ok = await placeCall(userId, quote.type);
    setBusy(false);
    if (ok) close();
  }

  async function afterRecharge() {
    if (!userId || !quote) return;
    try {
      open(userId, await fetchQuote(userId, quote.type));
    } catch {
      /* balans store-da artıq yenilənib */
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[sheetStyles.sheet, styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={sheetStyles.grip} />
        <View style={styles.peer}>
          <Avatar uri={peer?.avatarUrl} name={peer?.name} size={64} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T v="title" numberOfLines={1} style={{ flexShrink: 1 }}>{peer?.name ?? ''}</T>
              {peer?.verified ? <VerifiedBadge size={18} /> : null}
            </View>
            <View style={styles.kind}>
              <Icon name={video ? 'videocam' : 'call'} size={14} color={accent} />
              <Text style={[styles.kindText, { color: accent }]}>{video ? t('cl.confirmTitleVideo') : t('cl.confirmTitleVoice')}</Text>
              {peer?.online ? <View style={styles.online} /> : null}
            </View>
          </View>
          <View style={styles.priceBox}>
            <CoinIcon size={18} />
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.per}>{t('cl.perMin')}</Text>
          </View>
        </View>
        {discounted ? <T v="tiny" color={colors.textMuted} style={{ marginTop: -4, marginBottom: 6, alignSelf: 'flex-end' }}>{t('cl.vipDiscount', { old: quote.basePrice, price })}</T> : null}

        <View style={[styles.balance, !enough && { backgroundColor: colors.brandSoft }]}>
          <View style={{ flex: 1 }}>
            <T v="tiny" color={colors.textMuted}>{t('cl.balance')}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <CoinIcon size={16} />
              <Text style={styles.balNum}>{coins}</Text>
            </View>
          </View>
          <View style={[styles.minutes, { backgroundColor: enough ? colors.onlineSoft : colors.card }]}>
            <Icon name="time" size={15} color={colors.ink} />
            <Text style={styles.minText}>
              {enough ? (minutes >= 60 ? t('cl.enoughForMany', { n: 60 }) : t('cl.enoughFor', { n: minutes })) : t('cl.notEnough', { n: price })}
            </Text>
          </View>
        </View>
        <T v="tiny" color={colors.textMuted} style={{ marginTop: 10, lineHeight: 16 }}>{t('cl.firstMinute')}</T>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Btn full={false} kind="ghost" title={t('common.cancel')} onPress={close} style={{ minWidth: 100 }} />
          <View style={{ flex: 1 }}>
            {enough ? (
              <Btn kind={video ? 'primary' : 'diamond'} icon={video ? 'videocam' : 'call'} title={t('cl.callNow')} loading={busy} onPress={() => void go()} />
            ) : (
              <Btn kind="coin" icon="coin" title={t('cl.rechargeAndCall')} onPress={() => setRecharge(true)} />
            )}
          </View>
        </View>
      </View>
      <RechargeSheet visible={recharge} need={price} onClose={() => setRecharge(false)} onDone={() => void afterRecharge()} title={t('wallet.recharge')} sub={t('cl.notEnough', { n: price })} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: { paddingTop: 10, paddingHorizontal: 18 },
  peer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 12 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  kindText: { fontFamily: fonts.bold, fontSize: 13 },
  online: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online, marginLeft: 4 },
  priceBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.coin, borderRadius: radius.pill, paddingHorizontal: 12, height: 38 },
  price: { fontFamily: fonts.black, fontSize: 17, color: colors.ink },
  per: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgSunken, borderRadius: 18, padding: 12 },
  balNum: { fontFamily: fonts.black, fontSize: 20, color: colors.ink },
  minutes: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 12, height: 34, maxWidth: '62%' },
  minText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.ink, flexShrink: 1 },
});
