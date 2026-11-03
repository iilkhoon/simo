import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from '../../src/lib/keyboard';
import { Box } from '@/components/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, webNoOutline } from '@/theme';
import { Btn, Header, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';

/** Azərbaycan mobil operator prefiksləri: 50, 51, 10 (Azercell), 55, 99 (Bakcell), 70, 77 (Nar), 60 (Naxtel) */
function formatAz(d: string) {
  const s = d.replace(/\D/g, '').slice(0, 9);
  const parts = [s.slice(0, 2), s.slice(2, 5), s.slice(5, 7), s.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}

export default function Phone() {
  const { t, i18n } = useTranslation();
  const toast = useStore((s) => s.toast);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const digits = phone.replace(/\D/g, '');

  async function send() {
    setLoading(true);
    try {
      const r = await api<{ phone: string; devCode?: string }>('/auth/otp/request', { body: { phone: `+994${digits}`, locale: i18n.language }, auth: false });
      router.push({ pathname: '/(auth)/otp', params: { phone: r.phone, dev: r.devCode ?? '' } });
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, gap: 16 }}>
        <T v="h1">{t('auth.phoneTitle')}</T>
        <T v="body" color={colors.textMuted}>{t('auth.phoneSub')}</T>
        <Box r={20} sh={2} inner={styles.row}>
          <View style={styles.prefix}><Text style={styles.prefixText}>🇦🇿 +994</Text></View>
          <TextInput
            autoFocus
            value={phone}
            onChangeText={(v) => setPhone(formatAz(v))}
            keyboardType="phone-pad"
            placeholder="50 123 45 67"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            maxLength={12}
            selectionColor={colors.brand}
          />
        </Box>
        <T v="tiny" color={colors.textDim}>Azercell · Bakcell · Nar · Naxtel</T>
        <View style={{ flex: 1 }} />
        <Btn title={t('auth.sendCode')} disabled={digits.length !== 9} loading={loading} onPress={send} style={{ marginBottom: 16 }} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 66 },
  prefix: { height: '100%', paddingHorizontal: 16, justifyContent: 'center', flexShrink: 0, borderRightWidth: 1, borderColor: colors.hairline, backgroundColor: colors.bgSunken },
  prefixText: { color: colors.ink, fontSize: 17, fontFamily: fonts.black },
  // minWidth: 0 — sahə sıxıla bilsin (əks halda vebdə fokusda konteyner sürüşür və +994 prefiksi gizlənir)
  input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 24, fontFamily: fonts.displayBold, paddingHorizontal: 16, height: '100%', letterSpacing: 0.5, ...webNoOutline },
});
