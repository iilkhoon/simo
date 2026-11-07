import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { colors, elev, fonts, radius, noPad, webNoOutline } from '@/theme';
import { Header, Screen, T } from '@/components/ui';
import { Appear, Pulse } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { AuthSteps, FieldError, useShake } from '@/components/AuthKit';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { startSession } from '@/lib/session';
import { useStore } from '@/store';

const LEN = 6;
const WAIT = 60;

/** "+994501234567" → "+994 50 123 45 67" */
function prettyPhone(p?: string) {
  const d = (p ?? '').replace(/\D/g, '');
  if (d.length !== 12 || !d.startsWith('994')) return p ?? '';
  return `+994 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

export default function Otp() {
  const { t, i18n } = useTranslation();
  const { phone, dev } = useLocalSearchParams<{ phone: string; dev?: string }>();
  const toast = useStore((s) => s.toast);
  const [code, setCode] = useState(dev ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState(true);
  const [left, setLeft] = useState(WAIT);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const { style: shakeStyle, shake } = useShake();

  useEffect(() => {
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // 6 rəqəm daxil olan kimi avtomatik yoxlanılır (SMS-dən avtodoldurma və yapışdırma da daxil)
  useEffect(() => {
    if (code.length === LEN && !loading) void verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function verify(c: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', { body: { phone, code: c, locale: i18n.language }, auth: false });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await startSession(r);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(errorText(e));
      shake();
      setCode('');
      input.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await api('/auth/otp/request', { body: { phone, locale: i18n.language }, auth: false });
      setLeft(WAIT);
      setError(null);
      toast(t('u2.codeResent'), 'success');
    } catch (e) {
      setError(errorText(e));
    }
  }

  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <Screen keyboard>
      <Header />
      <AuthSteps step={1} />
      <Appear i={0}><T v="h1">{t('auth.otpTitle')}</T></Appear>
      <Appear i={1} style={styles.sentRow}>
        <T v="body" color={colors.textMuted} style={{ flexShrink: 1 }}>{t('auth.otpSub', { phone: prettyPhone(phone) })}</T>
      </Appear>
      <Appear i={1}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.change}>
          <Icon name="refresh" size={13} color={colors.brand} />
          <Text style={styles.changeText}>{t('u2.changeNumber')}</Text>
        </Pressable>
      </Appear>
      <Appear i={2}>
        <Animated.View style={shakeStyle}>
          <Pressable onPress={() => input.current?.focus()} style={styles.boxes} accessibilityLabel={t('auth.otpTitle')}>
            {Array.from({ length: LEN }).map((_, i) => {
              const filled = !!code[i];
              const active = focus && !loading && code.length === i;
              return (
                <View key={i} style={[styles.box, elev(filled || active ? 2 : 1), filled && styles.boxFilled, active && styles.boxActive, error ? styles.boxError : null]}>
                  {active ? <Caret /> : <Text style={styles.digit}>{code[i] ?? ''}</Text>}
                </View>
              );
            })}
          </Pressable>
        </Animated.View>
      </Appear>
      <TextInput
        ref={input}
        autoFocus
        value={code}
        onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, LEN)); if (error) setError(null); }}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={LEN}
        style={styles.hidden}
      />
      <View style={{ minHeight: 30, marginTop: 12 }}>
        {loading ? (
          <View style={styles.verifying}><ActivityIndicator size="small" color={colors.brand} /><T v="small" color={colors.textMuted}>{t('u2.verifying')}</T></View>
        ) : <FieldError text={error} />}
      </View>
      <View style={styles.resendWrap}>
        {left > 0 ? (
          <View style={styles.timer}>
            <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
              <Pulse size={10} color={colors.brand} duration={1400} />
              <View style={styles.timerDot} />
            </View>
            <Text style={styles.timerText}>{t('u2.resendIn', { time: mm })}</Text>
          </View>
        ) : (
          <Pressable onPress={resend} style={({ pressed }) => [styles.resend, pressed && { opacity: 0.7 }]}>
            <Icon name="refresh" size={16} color={colors.white} />
            <Text style={styles.resendText}>{t('auth.resend')}</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

/** Aktiv xanada yanıb-sönən kursor */
function Caret() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setOn((x) => !x), 530);
    return () => clearInterval(id);
  }, []);
  return <View style={{ width: 2, height: 26, borderRadius: 1, backgroundColor: colors.brand, opacity: on ? 1 : 0 }} />;
}

const styles = StyleSheet.create({
  sentRow: { marginTop: 8 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4 },
  changeText: { ...noPad, color: colors.brand, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  boxes: { flexDirection: 'row', gap: 8, marginTop: 28 },
  box: { flex: 1, height: 64, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  boxFilled: { borderColor: 'rgba(26,21,18,0.14)' },
  boxActive: { borderColor: colors.brand },
  boxError: { borderColor: colors.danger, backgroundColor: '#FFF6F7' },
  digit: { ...noPad, color: colors.ink, fontSize: 28, lineHeight: 34, fontFamily: fonts.display },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1, ...webNoOutline },
  verifying: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resendWrap: { marginTop: 18, alignItems: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.bgSunken },
  timerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  timerText: { ...noPad, color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, fontVariant: ['tabular-nums'] },
  resend: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 20, borderRadius: radius.pill, backgroundColor: colors.ink },
  resendText: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 15, lineHeight: 19 },
});
