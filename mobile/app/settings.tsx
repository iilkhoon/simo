import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, fonts } from '@/theme';
import { Card, Header, MenuRow, Screen, Tabs } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LANGUAGES } from '@/i18n';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { changeLanguage } from '@/lib/session';
import { useStore } from '@/store';
import { WEB_URL } from '@/config';
import type { Me } from '@/lib/types';

function Stepper({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={() => onChange(Math.max(min, value - step))} style={styles.step}><Text style={styles.stepText}>−</Text></Pressable>
      <Text style={{ color: colors.ink, fontFamily: fonts.black, fontSize: 15, minWidth: 34, textAlign: 'center' }}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + step))} style={styles.step}><Text style={styles.stepText}>+</Text></Pressable>
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
      <Text style={styles.section}>{t('settings.language')}</Text>
      <Tabs<string> value={i18n.language} onChange={(c) => void changeLanguage(c as never)} options={LANGUAGES.map((l) => ({ key: l.code as string, label: l.label }))} />

      <Text style={styles.section}>{t('settings.discovery')}</Text>
      <Card style={{ padding: 16, gap: 16 }}>
        <Text style={font.small}>{t('settings.interestedIn')}</Text>
        <Tabs<'FEMALE' | 'MALE' | 'ALL'>
          value={prefs.interestedIn ?? 'ALL'}
          onChange={(k) => setPref('interestedIn', k === 'ALL' ? null : k)}
          options={[{ key: 'FEMALE', label: t('settings.women') }, { key: 'MALE', label: t('settings.men') }, { key: 'ALL', label: t('settings.everyone') }]}
        />
        <View style={styles.line}>
          <Text style={[font.body, { flex: 1 }]}>{t('settings.ageRange', { min: prefs.ageMin, max: prefs.ageMax })}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Stepper value={prefs.ageMin} min={18} max={80} onChange={(v) => setPref('ageMin', v)} />
          <Stepper value={prefs.ageMax} min={18} max={99} onChange={(v) => setPref('ageMax', v)} />
        </View>
        <View style={styles.line}>
          <Text style={[font.body, { flex: 1 }]}>{t('settings.distance', { n: prefs.maxDistanceKm })}</Text>
          <Stepper value={prefs.maxDistanceKm} min={5} max={500} step={5} onChange={(v) => setPref('maxDistanceKm', v)} />
        </View>
        <View style={styles.line}>
          <Text style={[font.body, { flex: 1 }]}>{t('settings.incognito')}</Text>
          <Switch
            value={me.incognito}
            trackColor={{ true: colors.brand, false: colors.bgSunken }}
            thumbColor={colors.card}
            onValueChange={(v) => (me.vip?.incognito ? void patch({ incognito: v }) : router.push('/vip'))}
          />
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <MenuRow icon="ban" label={t('settings.blockList')} tint={colors.brandSoft} onPress={() => router.push('/blocked')} />
        <MenuRow icon="document" label={t('settings.terms')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/terms.html`)} />
        <MenuRow icon="shield" label={t('settings.privacy')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/privacy.html`)} />
        <MenuRow icon="people" label={t('safety.guidelines')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/community-guidelines.html`)} />
        <MenuRow icon="document" label={t('safety.hostAgreement')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/host-agreement.html`)} />
        <MenuRow icon="document" label={t('safety.agencyAgreement')} tint={colors.bgSunken} onPress={() => void Linking.openURL(`${WEB_URL}/agency-agreement.html`)} />
        <MenuRow icon="help" label={t('settings.support')} tint={colors.bgSunken} onPress={() => void Linking.openURL('mailto:support@simo.az')} last />
      </Card>
      <Card style={{ marginTop: 16 }}>
        <MenuRow icon="logout" label={t('settings.logout')} tint={colors.bgSunken} right={<View />} onPress={() => void logout()} />
        <MenuRow icon="trash" label={t('settings.deleteAccount')} tint={colors.brandSoft} danger right={<View />} onPress={del} last />
      </Card>
      <Text style={[font.tiny, { textAlign: 'center', marginTop: 20 }]}>{t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })} · {t('common.id', { id: me.shortId })}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.brand, fontFamily: fonts.bold, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.1 },
  line: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.ink, fontSize: 20, lineHeight: 24, fontFamily: fonts.bold, textAlign: 'center' },
});
