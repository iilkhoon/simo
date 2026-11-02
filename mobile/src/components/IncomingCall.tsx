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
import { Icon } from './Icon';
import { Box, IconBtn, T, Tag } from './ui';
import { LevelBadge, VerifiedBadge } from './Badges';

/** Gələn zəng — tam ekran "kağız" kartı, fotoşəkil stiker kimi, iri qəbul/rədd düymələri */
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

  const rot = pulse.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] });

  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: video ? colors.brandSoft : colors.diamondSoft }}>
        <SafeAreaView style={styles.wrap}>
          <Tag label={video ? t('call.incomingVideo').toUpperCase() : t('call.incomingVoice').toUpperCase()} icon={video ? 'videocam' : 'call'} bg={colors.ink} fg={colors.bg} style={{ alignSelf: 'center', height: 26, paddingHorizontal: 10 }} />
          <View style={{ alignItems: 'center', marginTop: 28 }}>
            <Box r={28} sh={6} bg={tintFor(caller.name)} inner={{ width: 230, height: 290 }} style={{ transform: [{ rotate: '-2deg' }] }}>
              {caller.avatarUrl ? <Image source={{ uri: caller.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><T v="hero">{caller.name.slice(0, 1)}</T></View>
              )}
            </Box>
            <Animated.View style={[styles.ringSticker, { transform: [{ rotate: rot }] }]}>
              <Icon name={video ? 'videocam' : 'call'} size={26} color={colors.white} />
            </Animated.View>
          </View>
          <View style={{ alignItems: 'center', marginTop: 22, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name}>{caller.name}{caller.age ? `, ${caller.age}` : ''}</Text>
              {caller.verified ? <VerifiedBadge size={20} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <LevelBadge level={caller.wealthLevel} kind="wealth" />
              {caller.city ? <Tag label={caller.city} icon="location" bg={colors.card} /> : null}
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <View style={styles.actions}>
            <View style={styles.col}>
              <IconBtn name="close" size={76} sh={5} bg={colors.ink} color={colors.bg} onPress={decline} />
              <T v="bodyStrong">{t('call.decline')}</T>
            </View>
            <View style={styles.col}>
              <IconBtn name={video ? 'videocam' : 'call'} size={76} sh={5} bg={colors.online} color={colors.white} onPress={accept} />
              <T v="bodyStrong">{t('call.accept')}</T>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24 },
  ringSticker: { position: 'absolute', right: '22%', top: -14, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontSize: 28, fontFamily: fonts.display, letterSpacing: -0.8 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  col: { alignItems: 'center', gap: 10 },
});
