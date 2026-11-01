import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import { LogoMark } from '@/components/Logo';
import { GiftIcon } from '@/components/GiftIcon';
import { GradientButton, OutlineButton } from '@/components/ui';
import { LANGUAGES } from '@/i18n';
import { changeLanguage } from '@/lib/session';
import { WEB_URL } from '@/config';

const { width: W } = Dimensions.get('window');
const FLOATERS = ['rose', 'heart', 'kiss', 'teddy', 'ring', 'tea', 'pomegranate', 'crown'];

function Floater({ id, i }: { id: string; i: number }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 2600 + i * 300, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 2600 + i * 300, useNativeDriver: true }),
      ]),
    ).start();
  }, [y, i]);
  const left = ((i * 37) % 90) * (W / 100);
  const top = 60 + ((i * 53) % 260);
  return (
    <Animated.View style={{ position: 'absolute', left, top, opacity: 0.85, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }, { rotate: `${(i % 2 ? 1 : -1) * 12}deg` }] }}>
      <GiftIcon id={id} size={36 + (i % 3) * 10} />
    </Animated.View>
  );
}

export default function Welcome() {
  const { t, i18n } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#3A1366', '#1E0B35', colors.bg]} style={StyleSheet.absoluteFill} />
      {FLOATERS.map((id, i) => <Floater key={id} id={id} i={i} />)}
      <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'flex-end' }}>
        <View style={styles.langs}>
          {LANGUAGES.map((l) => (
            <Pressable key={l.code} onPress={() => void changeLanguage(l.code)} style={[styles.lang, i18n.language === l.code && styles.langActive]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{l.flag} {l.code.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <LogoMark size={96} />
          <Text style={styles.brand}>simo</Text>
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
          <Text style={styles.sub}>{t('auth.welcomeSub')}</Text>
        </View>
        <View style={{ gap: 12 }}>
          <GradientButton title={t('auth.continuePhone')} icon="phone" onPress={() => router.push('/(auth)/phone')} />
          <OutlineButton title={t('auth.continueEmail')} icon="mail" onPress={() => router.push('/(auth)/email')} />
        </View>
        <Text style={styles.terms} onPress={() => void Linking.openURL(`${WEB_URL}/terms.html`)}>
          {t('auth.terms')}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  langs: { position: 'absolute', top: 56, right: 20, flexDirection: 'row', gap: 6 },
  lang: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  langActive: { backgroundColor: colors.rose },
  brand: { color: '#fff', fontSize: 56, fontWeight: '900', letterSpacing: -2, marginTop: 8 },
  tagline: { fontSize: 22, fontWeight: '800', color: colors.peach, marginTop: 2 },
  sub: { color: colors.textMuted, textAlign: 'center', marginTop: 10, fontSize: 15, lineHeight: 21, paddingHorizontal: 10 },
  terms: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 17 },
});
