import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius } from '@/theme';
import { Btn, Card, Header, Input, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { ECON } from '@/lib/economy';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';

/** Host parametrləri: mesaj qiyməti, pulsuz söhbət rejimi, private content abunəsi */
export default function HostSettings() {
  const { t } = useTranslation();
  const { me, toast, refreshMe } = useStore();
  const [price, setPrice] = useState(String(me?.msgPrice ?? ''));
  const [free, setFree] = useState(!!me?.freeChat);
  const [priv, setPriv] = useState(String(me?.privatePrice ?? ''));
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  async function save() {
    setBusy(true);
    try {
      await api('/host/settings', { method: 'PATCH', body: { msgPrice: price ? Number(price) : null, freeChat: free, privatePrice: priv ? Number(priv) : null } });
      await refreshMe();
      toast('✓', 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Header title={t('hostSettings.title')} />
      <Card style={styles.block}>
        <T v="h3">{t('hostSettings.msgPrice')}</T>
        <T v="small" color={colors.textMuted}>{t('hostSettings.msgPriceSub', { min: ECON.msgPrice.min })}</T>
        <Input value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={t('hostSettings.agencyDefault')} />
      </Card>
      <Card style={[styles.block, styles.row]}>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="h3">{t('hostSettings.freeChat')}</T>
          <T v="small" color={colors.textMuted}>{t('hostSettings.freeChatSub')}</T>
        </View>
        <Switch value={free} onValueChange={setFree} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} />
      </Card>
      <Card style={styles.block}>
        <T v="h3">{t('hostSettings.private')}</T>
        <T v="small" color={colors.textMuted}>{t('hostSettings.privateSub', { min: ECON.privatePrice.min, max: ECON.privatePrice.max, lv: ECON.privatePrice.minLevel })}</T>
        <Input value={priv} onChangeText={(v) => setPriv(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={t('hostSettings.privateOff')} />
        <View style={styles.rule}><T v="tiny" color={colors.danger}>{t('hostSettings.privateRules')}</T></View>
      </Card>
      <Btn style={{ marginTop: 16 }} title={t('common.save')} loading={busy} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { padding: 16, gap: 8, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { backgroundColor: colors.brandSoft, borderRadius: radius.sm, padding: 10 },
});
