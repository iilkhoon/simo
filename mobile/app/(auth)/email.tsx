import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, font } from '@/theme';
import { GradientButton, Header, Input, Screen } from '@/components/ui';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { startSession } from '@/lib/session';
import { useStore } from '@/store';

export default function Email() {
  const { t, i18n } = useTranslation();
  const toast = useStore((s) => s.toast);
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const r = await api<{ accessToken: string; refreshToken: string }>(mode === 'login' ? '/auth/email/login' : '/auth/email/register', {
        body: mode === 'login' ? { email, password } : { email, password, referralCode: referral || undefined, locale: i18n.language },
        auth: false,
      });
      await startSession(r);
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, gap: 14 }}>
        <Text style={font.h1}>{mode === 'login' ? t('auth.login') : t('auth.register')}</Text>
        <Input placeholder={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Input placeholder={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'password' : 'new-password'} />
        {mode === 'register' ? <Input placeholder={t('auth.referral')} value={referral} onChangeText={setReferral} autoCapitalize="none" /> : null}
        <GradientButton title={mode === 'login' ? t('auth.login') : t('auth.register')} loading={loading} disabled={!email.includes('@') || password.length < 8} onPress={submit} />
        <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={{ color: colors.rose, fontWeight: '700' }}>{mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
