import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, noPad } from '@/theme';
import { Header, Loader, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { startSession } from '@/lib/session';
import { useStore } from '@/store';

export default function Otp() {
  const { t, i18n } = useTranslation();
  const { phone, dev } = useLocalSearchParams<{ phone: string; dev?: string }>();
  const toast = useStore((s) => s.toast);
  const [code, setCode] = useState(dev ?? '');
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(60);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (code.length === 6 && !loading) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function verify(c: string) {
    setLoading(true);
    try {
      const r = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', { body: { phone, code: c, locale: i18n.language }, auth: false });
      await startSession(r);
    } catch (e) {
      toast(errorText(e), 'error');
      setCode('');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await api('/auth/otp/request', { body: { phone, locale: i18n.language }, auth: false });
      setLeft(60);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  return (
    <Screen keyboard>
      <Header />
      <T v="h1">{t('auth.otpTitle')}</T>
      <T v="body" color={colors.textMuted} style={{ marginTop: 8 }}>{t('auth.otpSub', { phone })}</T>
      <Pressable onPress={() => input.current?.focus()} style={styles.boxes}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.box, code[i] ? { backgroundColor: colors.coinSoft } : null, code.length === i && styles.boxActive]}>
            <Text style={styles.digit}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        autoFocus
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />
      {loading ? <Loader /> : null}
      <Pressable disabled={left > 0} onPress={resend} style={{ marginTop: 24, alignSelf: 'center' }}>
        <Text style={{ color: left > 0 ? colors.textDim : colors.brand, fontFamily: fonts.bold, fontSize: 15 }}>
          {left > 0 ? t('auth.resendIn', { s: left }) : t('auth.resend')}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', gap: 8, marginTop: 32 },
  box: { flex: 1, height: 62, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: colors.brand },
  digit: { ...noPad, color: colors.ink, fontSize: 26, lineHeight: 32, fontFamily: fonts.display },
});
