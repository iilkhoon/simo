import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, palette } from '@/theme';
import { LogoMark } from '@/components/Logo';
import { GiftIcon } from '@/components/GiftIcon';
import { Burst } from '@/components/Burst';
import { Btn, T } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { LANGUAGES } from '@/i18n';
import { changeLanguage } from '@/lib/session';
import { WEB_URL } from '@/config';

const { width: W, height: H } = Dimensions.get('window');

/** Üzən stiker (hədiyyə və ya ikon) */
function Sticker({ i, x, y, bg, gift, icon, rot }: { i: number; x: number; y: number; bg: string; gift?: string; icon?: IconName; rot: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 2200 + i * 260, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 2200 + i * 260, useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [v, i]);
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: y, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }, { rotate: `${rot}deg` }] }}>
      <View style={styles.stShadow} />
      <View style={[styles.st, { backgroundColor: bg }]}>
        {gift ? <GiftIcon id={gift} size={40} /> : icon ? <Icon name={icon} size={28} color={colors.ink} /> : null}
      </View>
    </Animated.View>
  );
}

export default function Welcome() {
  const { t, i18n } = useTranslation();
  const topH = Math.min(H * 0.56, 480);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.poster, { height: topH }]}>
        <View style={{ position: 'absolute', right: -60, top: topH * 0.18, opacity: 0.95 }}><Burst size={230} color={colors.coin} points={16} /></View>
        <Sticker i={0} x={24} y={topH * 0.24} bg={colors.card} gift="rose" rot={-10} />
        <Sticker i={1} x={W * 0.36} y={topH * 0.14} bg={palette.lime} icon="videocam" rot={8} />
        <Sticker i={2} x={W - 112} y={topH * 0.32} bg={colors.card} gift="crown" rot={12} />
        <Sticker i={3} x={W * 0.12} y={topH * 0.54} bg={palette.xazarSoft} icon="mic" rot={6} />
        <Sticker i={4} x={W * 0.58} y={topH * 0.6} bg={colors.card} gift="pomegranate" rot={-8} />
        <SafeAreaView edges={['top']} style={styles.langs}>
          {LANGUAGES.map((l) => {
            const on = i18n.language === l.code;
            return (
              <Pressable key={l.code} onPress={() => void changeLanguage(l.code)} style={[styles.lang, on && { backgroundColor: colors.ink }]}>
                <Text style={[styles.langText, on && { color: colors.bg }]}>{l.code.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </SafeAreaView>
        <View style={styles.brandRow}>
          <LogoMark size={64} />
          <Text style={styles.brand}>simo</Text>
        </View>
      </View>
      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <T v="h1">{t('auth.tagline')}</T>
        <T v="body" color={colors.textMuted} style={{ marginTop: 8 }}>{t('auth.welcomeSub')}</T>
        <View style={{ flex: 1, minHeight: 16 }} />
        <View style={{ gap: 6 }}>
          <Btn title={t('auth.continuePhone')} icon="phone" onPress={() => router.push('/(auth)/phone')} />
          <Btn kind="light" title={t('auth.continueEmail')} icon="mail" onPress={() => router.push('/(auth)/email')} />
        </View>
        <Text style={styles.terms} onPress={() => void Linking.openURL(`${WEB_URL}/terms.html`)}>{t('auth.terms')}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { backgroundColor: colors.brand, borderBottomWidth: 2.5, borderColor: colors.ink, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  langs: { position: 'absolute', top: 0, right: 16, flexDirection: 'row', gap: 6, paddingTop: 10 },
  lang: { paddingHorizontal: 11, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.ink, marginTop: 8 },
  langText: { color: colors.ink, fontFamily: fonts.black, fontSize: 12 },
  brandRow: { position: 'absolute', left: 20, bottom: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { color: colors.white, fontSize: 64, fontFamily: fonts.display, letterSpacing: -3, textShadowColor: colors.ink, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0.1 },
  st: { width: 66, height: 66, borderRadius: 20, borderWidth: 2.5, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  stShadow: { position: 'absolute', left: 4, top: 4, width: 66, height: 66, borderRadius: 20, backgroundColor: colors.ink },
  bottom: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  terms: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 17, fontFamily: fonts.medium, marginBottom: 6 },
});
