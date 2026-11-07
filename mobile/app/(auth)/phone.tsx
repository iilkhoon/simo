import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { KeyboardAvoidingView } from '../../src/lib/keyboard';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, elev, fonts, noPad, radius, webNoOutline } from '@/theme';
import { Btn, Header, Screen, T } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { AuthSteps, AzFlag, FieldError, useShake } from '@/components/AuthKit';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';

/** Azərbaycan mobil operator prefiksləri: 50, 51, 10 (Azercell), 55, 99 (Bakcell), 70, 77 (Nar), 60 (Naxtel), 12 (Bakı) */
const PREFIXES = ['10', '12', '50', '51', '55', '60', '70', '77', '99'];

/** Yapışdırılan "+994 50…", "050…" və ya "50…" formatlarını 9 rəqəmə gətirir və qruplaşdırır */
function normalizeAz(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('994') && d.length > 9) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 9);
}
function formatAz(d: string) {
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

export default function Phone() {
  const { t, i18n } = useTranslation();
  const [digits, setDigits] = useState('');
  const [focus, setFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { style: shakeStyle, shake } = useShake();
  const badPrefix = digits.length >= 2 && !PREFIXES.includes(digits.slice(0, 2));
  const ok = digits.length === 9 && !badPrefix;

  async function send() {
    if (!ok) { shake(); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ phone: string; devCode?: string }>('/auth/otp/request', { body: { phone: `+994${digits}`, locale: i18n.language }, auth: false });
      router.push({ pathname: '/(auth)/otp', params: { phone: r.phone, dev: r.devCode ?? '' } });
    } catch (e) {
      setError(errorText(e));
      shake();
    } finally {
      setLoading(false);
    }
  }

  const err = error ?? (badPrefix ? t('u2.phoneInvalid') : null);
  return (
    <Screen>
      <Header />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <AuthSteps step={0} />
        <Appear i={0}><T v="h1">{t('auth.phoneTitle')}</T></Appear>
        <Appear i={1}><T v="body" color={colors.textMuted} style={{ marginTop: 8 }}>{t('auth.phoneSub')}</T></Appear>
        <Appear i={2} style={{ marginTop: 24, gap: 8 }}>
          <Animated.View style={[styles.row, elev(focus ? 2 : 1), focus && { borderColor: colors.brand }, err ? { borderColor: colors.danger } : null, shakeStyle]}>
            <View style={styles.prefix}>
              <AzFlag w={24} />
              <Text style={styles.prefixText}>+994</Text>
            </View>
            <TextInput
              autoFocus
              value={formatAz(digits)}
              onChangeText={(v) => { setDigits(normalizeAz(v)); setError(null); }}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              onSubmitEditing={send}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              placeholder="50 123 45 67"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              maxLength={16}
              selectionColor={colors.brand}
              accessibilityLabel={t('auth.phoneTitle')}
            />
            {ok ? <View style={styles.ok}><Icon name="checkmark" size={14} color={colors.white} /></View> : null}
          </Animated.View>
          <FieldError text={err} />
          {!err && digits.length > 0 && digits.length < 9 ? <T v="small" color={colors.textDim}>{t('u2.phoneShort', { n: 9 - digits.length })}</T> : null}
        </Appear>
        <View style={{ flex: 1 }} />
        <View style={styles.privacy}>
          <Icon name="lock" size={14} color={colors.textMuted} />
          <T v="small" color={colors.textMuted}>{t('u2.phonePrivate')}</T>
        </View>
        <Btn title={t('auth.sendCode')} disabled={!ok} loading={loading} onPress={send} iconRight={<Icon name="arrowRight" size={18} color={ok ? colors.white : colors.textDim} />} style={{ marginBottom: 16 }} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 68, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'transparent', overflow: 'hidden' },
  prefix: { height: '100%', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0, borderRightWidth: 1, borderColor: colors.hairline, backgroundColor: colors.bgSunken },
  prefixText: { ...noPad, color: colors.ink, fontSize: 17, lineHeight: 22, fontFamily: fonts.black },
  // minWidth: 0 — sahə sıxıla bilsin (əks halda vebdə fokusda konteyner sürüşür və +994 prefiksi gizlənir)
  input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 24, fontFamily: fonts.displayBold, paddingHorizontal: 16, height: '100%', letterSpacing: 0.5, ...webNoOutline },
  ok: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.online, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 },
});
