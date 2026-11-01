import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '@/theme';
import { GradientButton, Header, Screen } from '@/components/ui';
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, gap: 16 }}>
        <Text style={font.h1}>{t('auth.phoneTitle')}</Text>
        <Text style={font.small}>{t('auth.phoneSub')}</Text>
        <View style={styles.row}>
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
          />
        </View>
        <View style={{ flex: 1 }} />
        <GradientButton title={t('auth.sendCode')} disabled={digits.length !== 9} loading={loading} onPress={send} style={{ marginBottom: 16 }} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  prefix: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  prefixText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, color: '#fff', fontSize: 22, fontWeight: '700', paddingHorizontal: 16, height: 60, borderWidth: 1, borderColor: colors.border, letterSpacing: 1 },
});
