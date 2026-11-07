import React, { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import { Card, Header, Screen, T } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';
import type { Me, NotifPrefs } from '@/lib/types';

const ITEMS: { key: keyof NotifPrefs; icon: IconName; tint: string }[] = [
  { key: 'messages', icon: 'chat', tint: colors.brandSoft },
  { key: 'calls', icon: 'call', tint: colors.skySoft },
  { key: 'likes', icon: 'heart', tint: colors.brandSoft },
  { key: 'follows', icon: 'userAdd', tint: colors.lilac },
  { key: 'visits', icon: 'eye', tint: colors.highlight },
  { key: 'subscriptions', icon: 'star', tint: colors.highlight },
  { key: 'lives', icon: 'radio', tint: colors.brandSoft },
  { key: 'offers', icon: 'gift', tint: colors.highlight },
  { key: 'smart', icon: 'sparkles', tint: colors.skySoft },
];

/** Bildiriş üstünlükləri: hər kateqoriya ayrıca (dəyişiklik dərhal yadda saxlanır) */
export default function NotifSettings() {
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [prefs, setPrefs] = useState<NotifPrefs>(me?.notifPrefs ?? {});
  async function toggle(k: keyof NotifPrefs, v: boolean) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try { setMe(await api<Me>('/me', { method: 'PATCH', body: { notifPrefs: { [k]: v } } })); } catch (e) { setPrefs(prefs); toast(errorText(e), 'error'); }
  }
  return (
    <Screen scroll>
      <Header title={t('notifSettings.title')} />
      <Appear i={0}>
        <View style={styles.hint}>
          <Icon name="bell" size={18} color={colors.coin} />
          <T v="small" color={colors.textMuted} style={{ flex: 1 }}>{t('notifSettings.sub')}</T>
        </View>
      </Appear>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {ITEMS.map((it, i) => (
          <Appear key={it.key} i={i + 1} from="fade">
          <View style={[styles.row, i < ITEMS.length - 1 && styles.divider]}>
            <View style={[styles.icon, { backgroundColor: it.tint }]}><Icon name={it.icon} size={18} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">{t(`notifSettings.items.${it.key}`)}</T>
              <T v="tiny" color={colors.textMuted}>{t(`notifSettings.subs.${it.key}`)}</T>
            </View>
            <Switch value={prefs[it.key] !== false} onValueChange={(v) => void toggle(it.key, v)} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} accessibilityLabel={t(`notifSettings.items.${it.key}`)} />
          </View>
          </Appear>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 14, borderRadius: 20, backgroundColor: colors.coinSoft },
  icon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
