import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '@/theme';
import { Header, Loader, Screen } from '@/components/ui';
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
    <Screen>
      <Header />
      <Text style={font.h1}>{t('auth.otpTitle')}</Text>
      <Text style={[font.small, { marginTop: 8 }]}>{t('auth.otpSub', { phone })}</Text>
      <Pressable onPress={() => input.current?.focus()} style={styles.boxes}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.box, code.length === i && { borderColor: colors.rose }]}>
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
        <Text style={{ color: left > 0 ? colors.textDim : colors.rose, fontWeight: '700' }}>
          {left > 0 ? t('auth.resendIn', { s: left }) : t('auth.resend')}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 },
  box: { width: 48, height: 60, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  digit: { color: '#fff', fontSize: 26, fontWeight: '800' },
});
