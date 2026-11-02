import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, fonts, radius } from '@/theme';
import { Card, Chip, Header, MenuRow, Screen } from '@/components/ui';
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LANGUAGES.map((l) => <Chip key={l.code} label={`${l.flag} ${l.label}`} active={i18n.language === l.code} onPress={() => void changeLanguage(l.code)} />)}
      </View>

      <Text style={styles.section}>{t('settings.discovery')}</Text>
      <Card style={{ padding: 16, gap: 16 }}>
        <Text style={font.small}>{t('settings.interestedIn')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label={t('settings.women')} active={prefs.interestedIn === 'FEMALE'} onPress={() => setPref('interestedIn', 'FEMALE')} />
          <Chip label={t('settings.men')} active={prefs.interestedIn === 'MALE'} onPress={() => setPref('interestedIn', 'MALE')} />
          <Chip label={t('settings.everyone')} active={prefs.interestedIn === null} onPress={() => setPref('interestedIn', null)} />
        </View>
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
        <MenuRow icon="help" label={t('settings.support')} tint={colors.bgSunken} onPress={() => void Linking.openURL('mailto:support@simo.az')} last />
      </Card>
      <Card style={{ marginTop: 16 }}>
        <Pressable onPress={() => void logout()} style={styles.danger}><Icon name="logout" color={colors.text} /><Text style={font.body}>{t('settings.logout')}</Text></Pressable>
        <Pressable onPress={del} style={[styles.danger, { borderBottomWidth: 0 }]}><Icon name="trash" color={colors.danger} /><Text style={[font.body, { color: colors.danger }]}>{t('settings.deleteAccount')}</Text></Pressable>
      </Card>
      <Text style={[font.tiny, { textAlign: 'center', marginTop: 20 }]}>{t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })} · {t('common.id', { id: me.shortId })}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.brand, fontFamily: fonts.bold, marginTop: 20, marginBottom: 10, textTransform: 'uppercase', fontSize: 11, letterSpacing: 1.1 },
  line: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.ink, fontSize: 20, fontFamily: fonts.bold, marginTop: -2 },
  danger: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1.5, borderColor: colors.hairline, borderRadius: radius.md },
});
