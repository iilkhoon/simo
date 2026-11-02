import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, palette, type BlockName } from '@/theme';
import { LogoMark, Mascot, Nazar } from '@/components/Logo';
import { GiftIcon } from '@/components/GiftIcon';
import { Btn, SpeechBlock, T } from '@/components/ui';
import { LANGUAGES } from '@/i18n';
import { changeLanguage } from '@/lib/session';
import { WEB_URL } from '@/config';

const { width: W, height: H } = Dimensions.get('window');

/** Üzən element (yavaş yuxarı-aşağı) */
function Float({ i, style, children }: { i: number; style: object; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 2000 + i * 300, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 2000 + i * 300, useNativeDriver: true }),
    ]));
    l.start();
    return () => l.stop();
  }, [v, i]);
  return <Animated.View style={[{ position: 'absolute' }, style, { transform: [...((style as { transform?: object[] }).transform ?? []), { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]}>{children}</Animated.View>;
}

export default function Welcome() {
  const { t, i18n } = useTranslation();
  const topH = Math.min(H * 0.5, 430);
  const words = t('auth.tagline').split(/(?<=\.)\s+/);
  const wc: BlockName[] = ['nar', 'ink', 'lime'];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ height: topH }}>
        <SafeAreaView edges={['top']} style={styles.langs}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <LogoMark size={30} />
            <Text style={styles.brandSm}>simo</Text>
          </View>
          {LANGUAGES.map((l) => {
            const on = i18n.language === l.code;
            return (
              <Pressable key={l.code} onPress={() => void changeLanguage(l.code)} style={[styles.lang, on && { backgroundColor: colors.ink }]}>
                <Text style={[styles.langText, on && { color: colors.bg }]}>{l.code.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </SafeAreaView>
        <View style={[styles.disc, { top: topH * 0.2, left: W / 2 - topH * 0.36, width: topH * 0.72, height: topH * 0.72, borderRadius: topH }]} />
        <Float i={0} style={{ top: topH * 0.3, left: W / 2 - topH * 0.25 }}><Mascot size={topH * 0.5} mood="happy" /></Float>
        <Float i={1} style={{ top: topH * 0.2, left: 18, transform: [{ rotate: '-6deg' }] }}><SpeechBlock color="lime" size="sm" tail="right">{t('auth.bubble1')}</SpeechBlock></Float>
        <Float i={2} style={{ top: topH * 0.36, right: 14, transform: [{ rotate: '5deg' }] }}><SpeechBlock color="lilac" size="sm">{t('auth.bubble2')}</SpeechBlock></Float>
        <Float i={3} style={{ top: topH * 0.74, left: 26, transform: [{ rotate: '4deg' }] }}><SpeechBlock color="saffron" size="sm" tail="right">{t('auth.bubble3')}</SpeechBlock></Float>
        <Float i={4} style={{ top: topH * 0.7, right: 34 }}><Nazar size={44} /></Float>
        <Float i={5} style={{ top: topH * 0.16, right: 64, transform: [{ rotate: '14deg' }] }}><View style={styles.giftDot}><GiftIcon id="rose" size={30} /></View></Float>
      </View>
      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <View style={{ gap: 4 }}>
          {words.map((w, i) => (
            <SpeechBlock key={i} color={wc[i % 3]} tail="none" size="md" rotate={[-2, 1.5, -1][i % 3]} style={{ marginLeft: i * 18 }}>{w}</SpeechBlock>
          ))}
        </View>
        <T v="body" color={colors.textMuted} style={{ marginTop: 14 }}>{t('auth.welcomeSub')}</T>
        <View style={{ flex: 1, minHeight: 16 }} />
        <View style={{ gap: 10 }}>
          <Btn title={t('auth.continuePhone')} icon="phone" onPress={() => router.push('/(auth)/phone')} />
          <Btn kind="light" title={t('auth.continueEmail')} icon="mail" onPress={() => router.push('/(auth)/email')} />
        </View>
        <Text style={styles.terms} onPress={() => void Linking.openURL(`${WEB_URL}/terms.html`)}>{t('auth.terms')}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  langs: { position: 'absolute', top: 0, left: 20, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, zIndex: 2 },
  lang: { paddingHorizontal: 11, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: colors.card, marginTop: 8 },
  langText: { color: colors.ink, fontFamily: fonts.black, fontSize: 12 },
  brandSm: { color: colors.ink, fontSize: 26, fontFamily: fonts.displayBlack, letterSpacing: -1.2, marginTop: -3 },
  disc: { position: 'absolute', backgroundColor: palette.narSoft },
  giftDot: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  bottom: { flex: 1, paddingHorizontal: 22, paddingTop: 8 },
  terms: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 17, fontFamily: fonts.medium, marginBottom: 6 },
});
