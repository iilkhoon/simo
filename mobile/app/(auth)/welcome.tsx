import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, elev, fonts } from '@/theme';
import { LogoMark, Nazar } from '@/components/Logo';
import { Mascot } from '@/components/Mascot';
import { GiftIcon } from '@/components/GiftIcon';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Btn, T } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { Appear } from '@/components/motion';
import { useStore } from '@/store';
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

/** Emoji-ni mətndən çıxarır (ikonla göstərilir) */
const plain = (s: string) => s.replace(/\s*\p{Extended_Pictographic}\uFE0F?/gu, '').trim();

/** Ağ "söhbət" kartı: solda rəngli ikon dairəsi */
function Bubble({ icon, text, tint, gift }: { icon?: IconName; text: string; tint: string; gift?: boolean }) {
  return (
    <View style={styles.bubble}>
      <View style={[styles.bubbleIcon, { backgroundColor: tint }]}>{gift ? <GiftIcon id="rose" size={20} /> : <Icon name={icon!} size={14} color={colors.ink} />}</View>
      <Text style={styles.bubbleText}>{text}</Text>
    </View>
  );
}

export default function Welcome() {
  const { t, i18n } = useTranslation();
  // App Store 1.2 / EULA: 18+ və Şərtlərə aydın razılıq — işarələnmədən davam etmək olmur
  const [agree, setAgree] = useState(false);
  const toast = useStore((s) => s.toast);
  const go = (path: '/(auth)/phone' | '/(auth)/email') => { if (!agree) { toast(t('consent.need'), 'error'); return; } router.push(path); };
  // Kiçik ekranlarda (360×740) aşağı hissə sığsın deyə yuxarı səhnə hündürlükdən asılıdır
  const topH = Math.max(300, Math.min(H * 0.48, 430));
  const words = t('auth.tagline').split(/(?<=\.)\s+/);
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
        {/* Arxa fon: yumşaq nar işığı + konsentrik halqalar */}
        <View pointerEvents="none" style={{ position: 'absolute', top: topH * 0.1, left: W / 2 - topH * 0.48 }}>
          <Svg width={topH * 0.96} height={topH * 0.96} viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id="wglow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FF8FA2" stopOpacity={0.55} />
                <Stop offset="0.55" stopColor="#FFC2CC" stopOpacity={0.35} />
                <Stop offset="1" stopColor="#FFE1E5" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={50} fill="url(#wglow)" />
            <Circle cx={50} cy={50} r={36} fill="none" stroke="rgba(242,52,79,0.14)" strokeWidth={0.5} />
            <Circle cx={50} cy={50} r={46} fill="none" stroke="rgba(242,52,79,0.08)" strokeWidth={0.5} strokeDasharray="1.5 2.5" />
          </Svg>
        </View>
        <Float i={0} style={{ top: topH * 0.28, left: W / 2 - topH * 0.27 }}><Appear from="fade"><Mascot size={topH * 0.58} pose="hero" float={false} /></Appear></Float>
        <Float i={1} style={{ top: topH * 0.19, left: 16, transform: [{ rotate: '-4deg' }] }}><Appear i={2}><Bubble icon="chat" tint={colors.highlight} text={plain(t('auth.bubble1'))} /></Appear></Float>
        <Float i={2} style={{ top: topH * 0.4, right: 12, transform: [{ rotate: '4deg' }] }}><Appear i={3}><Bubble icon="videocam" tint={colors.violet} text={plain(t('auth.bubble2'))} /></Appear></Float>
        <Float i={3} style={{ top: topH * 0.76, left: 22, transform: [{ rotate: '3deg' }] }}><Appear i={4}><Bubble gift tint={colors.coinSoft} text={plain(t('auth.bubble3'))} /></Appear></Float>
        <Float i={4} style={{ top: topH * 0.7, right: 30 }}><Appear i={5}><Nazar size={42} /></Appear></Float>
        <Float i={5} style={{ top: topH * 0.17, right: 70 }}><Appear i={6}><View style={styles.heartDot}><Icon name="heart" size={18} color={colors.white} /></View></Appear></Float>
      </View>
      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <Appear i={1}>
          <Text style={styles.headline}>
            {words.map((w, i) => <Text key={i} style={{ color: i === 0 ? colors.brand : colors.ink }}>{w}{i < words.length - 1 ? ' ' : ''}</Text>)}
          </Text>
        </Appear>
        <Appear i={2}><T v="body" color={colors.textMuted} style={{ marginTop: 10 }}>{t('auth.welcomeSub')}</T></Appear>
        <View style={{ flex: 1, minHeight: 16 }} />
        <Pressable onPress={() => setAgree((v) => !v)} style={styles.consent} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
          <View style={[styles.box, agree && styles.boxOn]}>{agree ? <Icon name="checkmark" size={16} color={colors.white} /> : null}</View>
          <Text style={styles.consentText}>
            {t('consent.pre')}
            <Text style={styles.link} onPress={() => void Linking.openURL(`${WEB_URL}/terms.html`)}>{t('consent.terms')}</Text>
            {t('consent.mid')}
            <Text style={styles.link} onPress={() => void Linking.openURL(`${WEB_URL}/privacy.html`)}>{t('consent.privacy')}</Text>
            {t('consent.post')}
          </Text>
        </Pressable>
        <View style={{ gap: 10, opacity: agree ? 1 : 0.5 }}>
          <Btn title={t('auth.continuePhone')} icon="phone" onPress={() => go('/(auth)/phone')} />
          <Btn kind="light" title={t('auth.continueEmail')} icon="mail" onPress={() => go('/(auth)/email')} />
        </View>
        <Text style={styles.terms}>{t('consent.zero')}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  langs: { position: 'absolute', top: 0, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, zIndex: 2 },
  lang: { paddingHorizontal: 11, height: 32, justifyContent: 'center', borderRadius: 16, backgroundColor: colors.card, marginTop: 8 },
  langText: { color: colors.ink, fontFamily: fonts.black, fontSize: 12 },
  brandSm: { color: colors.ink, fontSize: 26, fontFamily: fonts.displayBlack, letterSpacing: -1.2, marginTop: -3 },
  heartDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', ...elev(2, colors.brand) },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 18, borderBottomLeftRadius: 6, paddingLeft: 6, paddingRight: 14, height: 40, ...elev(2) },
  bubbleIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bubbleText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.ink },
  headline: { fontFamily: fonts.displayBlack, fontSize: 38, lineHeight: 42, letterSpacing: -1.6 },
  bottom: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  consentText: { flex: 1, color: colors.ink, fontSize: 13.5, lineHeight: 19, fontFamily: fonts.semibold },
  link: { color: colors.brand, textDecorationLine: 'underline' },
  terms: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 17, fontFamily: fonts.medium, marginBottom: 6 },
});
