import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, Vibration, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { api } from '../lib/api';
import { errorText } from '../lib/format';
import { colors, fonts, tintFor } from '../theme';
import { GlassPill, IconBtn, T } from './ui';
import { LevelBadge, VerifiedBadge } from './Badges';

/** Gələn zəng — tünd premium ekran (zəng ekranı ilə eyni dil): bulanıq foto fon, döyünən halqa, iri rədd/qəbul düymələri */
export function IncomingCall() {
  const { t } = useTranslation();
  const incoming = useStore((s) => s.incomingCall);
  const setIncoming = useStore((s) => s.setIncomingCall);
  const toast = useStore((s) => s.toast);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!incoming) return;
    Vibration.vibrate([0, 800, 600], true);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => {
      Vibration.cancel();
      loop.stop();
      pulse.setValue(0);
    };
  }, [incoming, pulse]);

  if (!incoming) return null;
  const { call, caller } = incoming;
  const video = call.type === 'VIDEO';

  function accept() {
    setIncoming(null);
    router.push({ pathname: '/call/[id]', params: { id: call.id, accept: '1' } });
  }
  async function decline() {
    setIncoming(null);
    try {
      await api(`/calls/${call.id}/reject`, { method: 'POST', body: {} });
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  const halo = (i: number) => ({
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55 - i * 0.2, 0.15 - i * 0.05] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1 + i * 0.12, 1.12 + i * 0.12] }) }],
  });
  const accent = video ? colors.brand : colors.sky;

  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: colors.night }}>
        {caller.avatarUrl ? <Image source={{ uri: caller.avatarUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} contentFit="cover" blurRadius={40} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,14,13,0.55)' }]} />
        <SafeAreaView style={styles.wrap}>
          <GlassPill label={video ? t('call.incomingVideo') : t('call.incomingVoice')} icon={video ? 'videocam' : 'call'} bg={colors.glassLight} style={{ alignSelf: 'center', height: 30, paddingHorizontal: 12 }} />
          <View style={styles.stage}>
            {[1, 0].map((i) => <Animated.View key={i} style={[styles.halo, { borderColor: accent }, halo(i)]} />)}
            <View style={[styles.photo, { backgroundColor: tintFor(caller.name) }]}>
              {caller.avatarUrl ? <Image source={{ uri: caller.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
                <T v="hero">{caller.name.slice(0, 1)}</T>
              )}
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.name} numberOfLines={1}>{caller.name}{caller.age ? `, ${caller.age}` : ''}</Text>
              {caller.verified ? <VerifiedBadge size={22} color={colors.sky} /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <LevelBadge level={caller.wealthLevel} kind="wealth" />
              {caller.city ? <GlassPill label={caller.city} icon="location" bg={colors.glassLight} /> : null}
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.actions}>
            <View style={styles.col}>
              <IconBtn name="close" size={72} sh={0} bg={colors.brand} color={colors.white} iconSize={32} onPress={decline} />
              <T v="bodyStrong" color={colors.nightText}>{t('call.decline')}</T>
            </View>
            <View style={styles.col}>
              <IconBtn name={video ? 'videocam' : 'call'} size={72} sh={0} bg={colors.online} color={colors.white} iconSize={30} onPress={accept} />
              <T v="bodyStrong" color={colors.nightText}>{t('call.accept')}</T>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24 },
  stage: { alignSelf: 'center', width: 230, height: 230, alignItems: 'center', justifyContent: 'center', marginTop: 36, marginBottom: 28 },
  halo: { position: 'absolute', width: 210, height: 210, borderRadius: 105, borderWidth: 3 },
  photo: { width: 190, height: 190, borderRadius: 95, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.white, fontSize: 30, fontFamily: fonts.display, letterSpacing: -1, flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 20 },
  col: { alignItems: 'center', gap: 10, width: 110 },
});
