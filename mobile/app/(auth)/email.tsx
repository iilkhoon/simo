import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { colors, fonts } from '@/theme';
import { Btn, Header, Input, Screen, T, Tabs } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { FieldError, useShake } from '@/components/AuthKit';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { startSession } from '@/lib/session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Email() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const { style: shakeStyle, shake } = useShake();

  const emailOk = EMAIL_RE.test(email.trim());
  const passOk = password.length >= 8;
  const emailErr = touched.email && email && !emailOk ? t('u2.emailInvalid') : null;
  const passErr = touched.password && password && !passOk && mode === 'register' ? t('u2.passShort', { n: password.length }) : null;

  async function submit() {
    if (!emailOk || !passOk) { setTouched({ email: true, password: true }); shake(); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ accessToken: string; refreshToken: string }>(mode === 'login' ? '/auth/email/login' : '/auth/email/register', {
        body: mode === 'login' ? { email: email.trim(), password } : { email: email.trim(), password, referralCode: referral || undefined, locale: i18n.language },
        auth: false,
      });
      await startSession(r);
    } catch (e) {
      setError(errorText(e));
      shake();
    } finally {
      setLoading(false);
    }
  }

  const eye = (
    <Pressable onPress={() => setShow((x) => !x)} hitSlop={10} accessibilityRole="button" accessibilityLabel={show ? t('u2.hidePass') : t('u2.showPass')}>
      <Icon name={show ? 'eyeOff' : 'eye'} size={20} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Screen scroll bottom={32}>
      <Header />
      <View style={{ gap: 14 }}>
        <Appear i={0}><T v="h1">{mode === 'login' ? t('auth.login') : t('auth.register')}</T></Appear>
        <Appear i={1}><Tabs value={mode} onChange={(m) => { setMode(m); setError(null); }} options={[{ key: 'register', label: t('auth.register') }, { key: 'login', label: t('auth.login') }]} /></Appear>
        <Appear i={2} style={{ gap: 14 }}>
          <Animated.View style={[{ gap: 14 }, shakeStyle]}>
            <View style={{ gap: 6 }}>
              <Input
                label={t('auth.email')}
                placeholder="ad@mail.az"
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                onBlur={() => setTouched((x) => ({ ...x, email: true }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                left={<Icon name="mail" size={18} color={colors.textDim} />}
              />
              <FieldError text={emailErr} />
            </View>
            <View style={{ gap: 6 }}>
              <Input
                label={t('auth.password')}
                placeholder="••••••••"
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                onBlur={() => setTouched((x) => ({ ...x, password: true }))}
                secureTextEntry={!show}
                autoCapitalize="none"
                autoComplete={mode === 'login' ? 'password' : 'new-password'}
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
                onSubmitEditing={submit}
                left={<Icon name="lock" size={18} color={colors.textDim} />}
              />
              <View style={{ position: 'absolute', right: 16, top: 37 }}>{eye}</View>
              <FieldError text={passErr} />
            </View>
            {mode === 'register' ? <Input label={t('auth.referral')} placeholder="123456" value={referral} onChangeText={setReferral} autoCapitalize="none" left={<Icon name="gift" size={18} color={colors.textDim} />} /> : null}
          </Animated.View>
          <FieldError text={error} />
          <Btn title={mode === 'login' ? t('auth.login') : t('auth.register')} loading={loading} disabled={!emailOk || !passOk} onPress={submit} />
          <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} style={{ alignSelf: 'center', padding: 8 }}>
            <Text style={{ color: colors.brand, fontFamily: fonts.bold }}>{mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}</Text>
          </Pressable>
        </Appear>
      </View>
    </Screen>
  );
}
