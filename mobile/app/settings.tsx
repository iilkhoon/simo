import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '@/theme';
import { Card, Header, MenuRow, PressBox, Screen, T, Tabs, tap } from '@/components/ui';
import { Appear, Pressable3 } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { LogoMark } from '@/components/Logo';
import { LANGUAGES } from '@/i18n';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { changeLanguage } from '@/lib/session';
import { useStore } from '@/store';
import { WEB_URL } from '@/config';
import type { Me } from '@/lib/types';

function Stepper({ value, onChange, min, max, step = 1, label }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; label?: string }) {
  const btn = (d: number, icon: 'remove' | 'add') => {
    const off = d < 0 ? value <= min : value >= max;
    return (
      <Pressable3 disabled={off} scaleTo={0.88} onPress={() => { tap(); onChange(Math.min(max, Math.max(min, value + d))); }} hitSlop={6} style={[styles.step, off && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel={`${label ?? ''} ${icon === 'add' ? '+' : '-'}`}>
        <Icon name={icon} size={18} color={colors.ink} />
      </Pressable3>
    );
  };
  return (
    <View style={styles.stepper}>
      {btn(-step, 'remove')}
      <Text style={styles.stepVal}>{value}</Text>
      {btn(step, 'add')}
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <T v="label" color={colors.textMuted} style={styles.section}>{title}</T>
      {children}
    </View>
  );
}

function Row({ icon, tint, title, sub, right, last }: { icon: IconName; tint: string; title: string; sub?: string; right: React.ReactNode; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}><Icon name={icon} size={18} color={colors.ink} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyStrong">{title}</T>
        {sub ? <T v="tiny" color={colors.textMuted}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { me, setMe, toast, logout } = useStore();
  const [prefs, setPrefs] = useState({ ageMin: me?.ageMin ?? 18, ageMax: me?.ageMax ?? 45, maxDistanceKm: me?.maxDistanceKm ?? 100, interestedIn: me?.interestedIn ?? null });
  if (!me) return null;

  async function patch(body: Partial<Me> & Record<string, unknown>) {
    try {
      setMe(await api<Me>('/me', { method: 'PATCH', body }));
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  function setPref<K extends keyof typeof prefs>(k: K, v: (typeof prefs)[K]) {
    const next = { ...prefs, [k]: v };
    if (next.ageMin > next.ageMax) return;
    setPrefs(next);
    void patch({ [k]: v });
  }

  function del() {
    Alert.alert(t('settings.deleteAccount'), t('settings.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/me', { method: 'DELETE' });
            await logout();
          } catch (e) {
            toast(errorText(e), 'error');
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <Header title={t('settings.title')} />
      <Appear i={0}>
        <PressBox r={radius.lg} sh={1} onPress={() => router.push('/edit-profile')} inner={styles.account}>
          <Avatar uri={me.avatarUrl} name={me.name} size={56} vipTier={me.vip?.tier} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3" numberOfLines={1}>{me.name}</T>
            <T v="small" color={colors.textMuted}>{t('common.id', { id: me.shortId })}</T>
          </View>
          <View style={styles.editPill}><Icon name="person" size={14} color={colors.ink} /><T v="tiny">{t('me.editProfile')}</T></View>
        </PressBox>
      </Appear>

      <Appear i={1}>
        <Group title={t('settings.language')}>
          <Tabs<string> value={i18n.language} onChange={(c) => void changeLanguage(c as never)} options={LANGUAGES.map((l) => ({ key: l.code as string, label: l.label }))} />
        </Group>
      </Appear>

      <Appear i={2}>
        <Group title={t('settings.discovery')}>
          <Card style={{ paddingVertical: 4 }}>
            <View style={{ padding: 14, paddingBottom: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.rowIcon, { backgroundColor: colors.brandSoft }]}><Icon name="people" size={18} color={colors.ink} /></View>
                <T v="bodyStrong" style={{ flex: 1 }}>{t('settings.interestedIn')}</T>
              </View>
              <Tabs<'FEMALE' | 'MALE' | 'ALL'>
                value={prefs.interestedIn ?? 'ALL'}
                onChange={(k) => setPref('interestedIn', k === 'ALL' ? null : k)}
                options={[{ key: 'FEMALE', label: t('settings.women') }, { key: 'MALE', label: t('settings.men') }, { key: 'ALL', label: t('settings.everyone') }]}
              />
            </View>
            <View style={styles.rowLine} />
            <View style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.rowIcon, { backgroundColor: colors.coinSoft }]}><Icon name="calendar" size={18} color={colors.ink} /></View>
                <T v="bodyStrong" style={{ flex: 1 }}>{t('u2.ageLabel')}</T>
                <T v="h3" color={colors.brand}>{prefs.ageMin}–{prefs.ageMax}</T>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Stepper label={t('u2.ageLabel')} value={prefs.ageMin} min={18} max={prefs.ageMax} onChange={(v) => setPref('ageMin', v)} />
                <Stepper label={t('u2.ageLabel')} value={prefs.ageMax} min={prefs.ageMin} max={99} onChange={(v) => setPref('ageMax', v)} />
              </View>
            </View>
            <View style={styles.rowLine} />
            <View style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.rowIcon, { backgroundColor: colors.skySoft }]}><Icon name="location" size={18} color={colors.ink} /></View>
                <T v="bodyStrong" style={{ flex: 1 }}>{t('u2.distanceLabel')}</T>
                <T v="h3" color={colors.brand}>{t('common.km', { n: prefs.maxDistanceKm })}</T>
              </View>
              <Stepper label={t('u2.distanceLabel')} value={prefs.maxDistanceKm} min={5} max={500} step={5} onChange={(v) => setPref('maxDistanceKm', v)} />
            </View>
            <View style={styles.rowLine} />
            <Row
              icon="eyeOff"
              tint={colors.lilac}
              title={t('settings.incognito')}
              sub={t('u2.incognitoSub')}
              last
              right={me.vip?.incognito ? (
                <Switch value={me.incognito} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} onValueChange={(v) => void patch({ incognito: v })} />
              ) : (
                <Pressable3 onPress={() => router.push('/vip')} scaleTo={0.92} style={styles.vipPill}><Icon name="crown" size={13} color={colors.ink} /><T v="tiny">{t('u2.vipOnly')}</T></Pressable3>
              )}
            />
          </Card>
        </Group>
      </Appear>

      <Appear i={3}>
        <Group title={t('u2.settingsLegal')}>
          <Card>
            <MenuRow icon="ban" label={t('settings.blockList')} tint={colors.brandSoft} onPress={() => router.push('/blocked')} />
            <MenuRow icon="document" label={t('settings.terms')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/terms.html`)} />
            <MenuRow icon="shield" label={t('settings.privacy')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/privacy.html`)} />
            <MenuRow icon="people" label={t('safety.guidelines')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/community-guidelines.html`)} />
            <MenuRow icon="document" label={t('safety.hostAgreement')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/host-agreement.html`)} />
            <MenuRow icon="document" label={t('safety.agencyAgreement')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/agency-agreement.html`)} />
            <MenuRow icon="help" label={t('settings.support')} tint={colors.bgSunken} onPress={() => void Linking.openURL('mailto:support@simo.az')} last />
          </Card>
        </Group>
      </Appear>
      <Appear i={4}>
        <Group title={t('u2.settingsAccount')}>
          <Card>
            <MenuRow icon="logout" label={t('settings.logout')} tint={colors.bgSunken} right={<View />} onPress={() => void logout()} />
            <MenuRow icon="trash" label={t('settings.deleteAccount')} tint={colors.brandSoft} danger right={<View />} onPress={del} last />
          </Card>
        </Group>
      </Appear>
      <View style={styles.footer}>
        <LogoMark size={22} />
        <T v="tiny" color={colors.textDim}>{t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22, marginBottom: 10, marginLeft: 4 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: colors.bgSunken },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSunken, borderRadius: 16, height: 48, paddingHorizontal: 5 },
  step: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepVal: { ...noPad, flex: 1, textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 24, color: colors.ink },
  vipPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.coin },
  footer: { alignItems: 'center', gap: 6, marginTop: 28 },
});
