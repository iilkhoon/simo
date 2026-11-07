import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius } from '@/theme';
import { Btn, Card, Header, Input, Screen, T } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
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
      toast(t('u2.saved'), 'success');
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
      <Appear i={0}>
      <Card style={styles.block}>
        <BlockTitle icon="chat" tint={colors.lilac} title={t('hostSettings.msgPrice')} />
        <T v="small" color={colors.textMuted}>{t('hostSettings.msgPriceSub', { min: ECON.msgPrice.min })}</T>
        <Input value={price} onChangeText={(v) => setPrice(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={t('hostSettings.agencyDefault')} />
      </Card>
      </Appear>
      <Appear i={1}>
      <Card style={[styles.block, styles.row]}>
        <View style={{ flex: 1, gap: 4 }}>
          <BlockTitle icon="heart" tint={colors.brandSoft} title={t('hostSettings.freeChat')} />
          <T v="small" color={colors.textMuted}>{t('hostSettings.freeChatSub')}</T>
        </View>
        <Switch value={free} onValueChange={setFree} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} />
      </Card>
      </Appear>
      <Appear i={2}>
      <Card style={styles.block}>
        <BlockTitle icon="lock" tint={colors.coinSoft} title={t('hostSettings.private')} />
        <T v="small" color={colors.textMuted}>{t('hostSettings.privateSub', { min: ECON.privatePrice.min, max: ECON.privatePrice.max, lv: ECON.privatePrice.minLevel })}</T>
        <Input value={priv} onChangeText={(v) => setPriv(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder={t('hostSettings.privateOff')} />
        <View style={styles.rule}><Icon name="shield" size={14} color={colors.danger} /><T v="tiny" color={colors.danger} style={{ flex: 1 }}>{t('hostSettings.privateRules')}</T></View>
      </Card>
      </Appear>
      <Btn style={{ marginTop: 16 }} title={t('common.save')} loading={busy} onPress={save} />
    </Screen>
  );
}

function BlockTitle({ icon, tint, title }: { icon: IconName; tint: string; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={17} color={colors.ink} /></View>
      <T v="h3" style={{ flex: 1 }}>{title}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { padding: 16, gap: 8, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.brandSoft, borderRadius: radius.sm, padding: 10 },
});
