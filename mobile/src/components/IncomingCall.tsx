import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { api } from '../lib/api';
import { errorText } from '../lib/format';
import { colors } from '../theme';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { CoinAmount } from './Badges';

export function IncomingCall() {
  const { t } = useTranslation();
  const incoming = useStore((s) => s.incomingCall);
  const setIncoming = useStore((s) => s.setIncomingCall);
  const toast = useStore((s) => s.toast);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!incoming) return;
    Vibration.vibrate([0, 800, 600], true);
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }));
    loop.start();
    return () => {
      Vibration.cancel();
      loop.stop();
      pulse.setValue(0);
    };
  }, [incoming, pulse]);

  if (!incoming) return null;
  const { call, caller } = incoming;

  async function accept() {
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

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Modal visible transparent animationType="fade">
      <View style={StyleSheet.absoluteFill}>
        {caller.avatarUrl ? <Image source={{ uri: caller.avatarUrl }} style={StyleSheet.absoluteFill} blurRadius={30} /> : null}
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(43,16,85,0.6)', 'rgba(18,7,31,0.95)']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.wrap}>
        <Text style={styles.kind}>{call.type === 'VIDEO' ? t('call.incomingVideo') : t('call.incomingVoice')}</Text>
        <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 36 }}>
          <Animated.View style={[styles.ring, { transform: [{ scale }], opacity }]} />
          <Avatar uri={caller.avatarUrl} name={caller.name} size={130} vipTier={caller.vipTier} />
        </View>
        <Text style={styles.name}>{caller.name}{caller.age ? `, ${caller.age}` : ''}</Text>
        {caller.city ? <Text style={styles.city}>{caller.city}</Text> : null}
        {call.pricePerMin > 0 && useStore.getState().me?.id === call.callerId ? <CoinAmount n={t('call.price', { price: call.pricePerMin })} /> : null}
        <View style={styles.actions}>
          <Pressable onPress={decline} style={[styles.btn, { backgroundColor: colors.danger }]}>
            <Icon name="call" size={30} color="#fff" />
          </Pressable>
          <Pressable onPress={accept} style={[styles.btn, { backgroundColor: colors.online }]}>
            <Icon name={call.type === 'VIDEO' ? 'videocam' : 'call'} size={30} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.labels}>
          <Text style={styles.label}>{t('call.decline')}</Text>
          <Text style={styles.label}>{t('call.accept')}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  kind: { color: colors.textMuted, fontSize: 16, fontWeight: '600', letterSpacing: 1 },
  ring: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: colors.rose },
  name: { color: '#fff', fontSize: 28, fontWeight: '800' },
  city: { color: colors.textMuted, marginTop: 4, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 90, marginTop: 60 },
  btn: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  labels: { flexDirection: 'row', gap: 90, marginTop: 10 },
  label: { color: '#fff', width: 76, textAlign: 'center', fontWeight: '600' },
});
