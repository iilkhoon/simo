import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useTranslation } from 'react-i18next';
import { colors, fonts, glow, tintFor } from '@/theme';
import { Box, GlassPill, Loader, PressBox, T, Tag, tap } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/Badges';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { api } from '@/lib/api';
import { duration, errorText } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import * as rtc from '@/lib/rtc';
import { useStore } from '@/store';
import type { Call, GiftEvent, PublicUser, RtcCreds } from '@/lib/types';

function Ctrl({ icon, onPress, active = true, label, tint }: { icon: IconName; onPress: () => void; active?: boolean; label?: string; tint?: string }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => [{ alignItems: 'center', gap: 5 }, pressed && { transform: [{ translateY: 2 }] }]}>
      <View style={[styles.ctrl, { backgroundColor: tint ?? (active ? colors.glassLight : colors.white) }]}>
        <Icon name={icon} size={22} color={tint || !active ? colors.ink : colors.white} />
      </View>
      {label ? <Text style={styles.ctrlLabel} numberOfLines={1}>{label}</Text> : null}
    </Pressable>
  );
}

export default function CallScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const { id, accept } = useLocalSearchParams<{ id: string; accept?: string }>();
  const { me, toast } = useStore();
  const [call, setCall] = useState<Call | null>(null);
  const [peer, setPeer] = useState<PublicUser | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [muted, setMuted] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [speaker, setSpeaker] = useState(true);
  const [beauty, setBeauty] = useState(true);
  const [lowBalance, setLowBalance] = useState<number | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [rtcError, setRtcError] = useState(false);
  const overlay = useRef<GiftOverlayHandle>(null);
  const ended = useRef(false);

  const isVideo = call?.type === 'VIDEO';
  const isCaller = call?.callerId === me?.id;

  function close(reason?: string) {
    if (ended.current) return;
    ended.current = true;
    rtc.leave();
    if (reason) toast(t(`call.reasons.${reason}`, { defaultValue: t('call.ended') }));
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  useEffect(() => {
    let alive = true;
    const unsub = rtc.subscribe({
      onRemoteJoined: (uid) => setRemoteUid(uid),
      onRemoteLeft: () => setRemoteUid(null),
      onError: () => setRtcError(true),
    });
    (async () => {
      try {
        const r = await api<{ call: Call; peer: PublicUser; rtc: RtcCreds; role: string }>(`/calls/${id}`);
        if (!alive) return;
        setCall(r.call);
        setPeer(r.peer);
        let creds = r.rtc;
        if (r.role === 'callee' && accept === '1' && r.call.status === 'RINGING') {
          const a = await api<{ call: Call; rtc: RtcCreds }>(`/calls/${id}/accept`, { body: {} });
          setCall(a.call);
          creds = a.rtc;
          setStartedAt(Date.now());
        } else if (r.call.status === 'ACTIVE' && r.call.startedAt) {
          setStartedAt(new Date(r.call.startedAt).getTime());
        } else if (r.call.status !== 'RINGING') {
          close();
          return;
        }
        try {
          await rtc.join(creds, { video: r.call.type === 'VIDEO', publish: true });
          rtc.controls.beauty(true);
        } catch {
          setRtcError(true);
        }
      } catch (e) {
        toast(errorText(e), 'error');
        close();
      }
    })();
    return () => {
      alive = false;
      unsub();
      rtc.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onAccepted = (p: { callId: string }) => {
      if (p.callId === id) setStartedAt(Date.now());
    };
    const onEnded = (p: { callId: string; reason: string }) => {
      if (p.callId === id) close(p.reason);
    };
    const onLow = (p: { callId: string; minutesLeft: number }) => {
      if (p.callId === id) setLowBalance(p.minutesLeft);
    };
    const onGift = (e: GiftEvent) => overlay.current?.push(e);
    s.on('call:accepted', onAccepted);
    s.on('call:ended', onEnded);
    s.on('call:low-balance', onLow);
    s.on('call:gift', onGift);
    return () => {
      s.off('call:accepted', onAccepted);
      s.off('call:ended', onEnded);
      s.off('call:low-balance', onLow);
      s.off('call:gift', onGift);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  async function hangup() {
    try {
      await api(`/calls/${id}/${startedAt ? 'end' : 'reject'}`, { body: {} });
    } catch {
      /* ignore */
    }
    close();
  }

  if (!call || !peer) return <View style={{ flex: 1, backgroundColor: colors.night }}><Loader full night /></View>;
  const connected = !!startedAt;
  const Surface = rtc.RtcSurfaceView;
  const remoteVideo = isVideo && connected && remoteUid != null && !!Surface;
  const elapsed = connected ? duration(Math.floor((now - startedAt!) / 1000)) : '';
  const soft = isVideo ? colors.brandSoft : colors.diamondSoft;

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar style="light" />
      {!remoteVideo && peer.avatarUrl ? <Image source={{ uri: peer.avatarUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} contentFit="cover" blurRadius={40} /> : null}
      {!remoteVideo ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,14,13,0.55)' }]} /> : null}
      {remoteVideo ? (
        <Surface style={StyleSheet.absoluteFill} canvas={{ uid: remoteUid! }} />
      ) : (
        <SafeAreaView edges={['top']} style={styles.center}>
          <GlassPill label={isVideo ? t('chat.callVideo') : t('chat.callVoice')} icon={isVideo ? 'videocam' : 'call'} bg={colors.glassLight} style={{ alignSelf: 'center', height: 30, paddingHorizontal: 12, marginBottom: 30 }} />
          <View style={[styles.halo, { borderColor: isVideo ? colors.brand : colors.sky }]} />
          <Box r={110} sh={0} bg={tintFor(peer.name)} inner={{ width: 200, height: 200 }}>
            {peer.avatarUrl ? <Image source={{ uri: peer.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><T v="hero">{peer.name.slice(0, 1)}</T></View>
            )}
          </Box>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 }}>
            <Text style={styles.name}>{peer.name}</Text>
            {peer.verified ? <VerifiedBadge size={20} /> : null}
          </View>
          <View style={styles.statusPill}>
            {connected ? <Wave /> : <Dots />}
            <Text style={styles.status}>{connected ? elapsed : t('call.calling')}</Text>
          </View>
          {rtcError ? <Text style={styles.warn}>{t('call.rtcMissing')}</Text> : null}
        </SafeAreaView>
      )}

      {isVideo && camOn && Surface && !rtcError ? (
        <View style={styles.pipWrap}>
          <View style={styles.pip}>
            <Surface style={{ flex: 1 }} canvas={{ uid: 0 }} zOrderMediaOverlay />
          </View>
        </View>
      ) : null}

      <SafeAreaView style={styles.top} edges={['top']} pointerEvents="box-none">
        {remoteVideo ? (
          <View style={styles.peerPill}>
            <Avatar uri={peer.avatarUrl} name={peer.name} size={30} />
            <View>
              <Text style={styles.peerName} numberOfLines={1}>{peer.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={styles.rec} />
                <Text style={styles.peerTime}>{elapsed}</Text>
              </View>
            </View>
          </View>
        ) : <View />}
        {call.pricePerMin > 0 && isCaller ? <Tag label={t('call.price', { price: call.pricePerMin })} icon="cash" bg={colors.coin} style={{ height: 26, paddingHorizontal: 9 }} /> : null}
      </SafeAreaView>

      {lowBalance != null && isCaller ? (
        <PressBox onPress={() => router.push('/wallet')} bg={colors.coin} r={18} sh={4} style={styles.low} inner={styles.lowInner}>
          <Icon name="time" size={20} color={colors.ink} />
          <Text style={styles.lowText}>{t('call.lowBalance', { n: lowBalance })}</Text>
          <Text style={styles.lowCta}>{t('wallet.recharge')}</Text>
        </PressBox>
      ) : null}

      <SafeAreaView edges={['bottom']} style={styles.controls}>
        <View style={styles.dock}>
          <Ctrl icon={muted ? 'micOff' : 'mic'} active={!muted} label={t('call.mic')} onPress={() => { rtc.controls.mute(!muted); setMuted(!muted); }} />
          {isVideo ? (
            <>
              <Ctrl icon={camOn ? 'videocam' : 'videocamOff'} active={camOn} label={t('call.camera')} onPress={() => { rtc.controls.camera(!camOn); setCamOn(!camOn); }} />
              <Ctrl icon="flip" label={t('call.flip')} onPress={() => rtc.controls.flip()} />
              <Ctrl icon="beauty" active={beauty} label={t('live.beauty')} onPress={() => { rtc.controls.beauty(!beauty); setBeauty(!beauty); }} />
            </>
          ) : (
            <Ctrl icon={speaker ? 'speaker' : 'speakerOff'} active={speaker} label={t('call.speaker')} onPress={() => { rtc.controls.speaker(!speaker); setSpeaker(!speaker); }} />
          )}
          {isCaller ? <Ctrl icon="gift" label={t('gifts.title')} tint={colors.coin} onPress={() => setGiftOpen(true)} /> : null}
        </View>
        <View style={{ marginTop: 18 }}>
          <Pressable onPress={() => { tap(); void hangup(); }} style={({ pressed }) => [styles.hang, glow(colors.brand), pressed && { transform: [{ scale: 0.94 }] }]}>
            <View style={{ transform: [{ rotate: '135deg' }] }}><Icon name="call" size={32} color={colors.white} /></View>
          </Pressable>
        </View>
      </SafeAreaView>
      <GiftOverlay ref={overlay} />
      <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={peer.id} receiverName={peer.name} context="CALL" contextId={call.id} onSent={(e) => overlay.current?.push(e)} />
    </View>
  );
}

/** Danışıq zamanı səs dalğası */
function Wave() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [v]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: colors.online, transform: [{ scaleY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: i % 2 ? [0.3, 1, 0.3] : [1, 0.3, 1] }) }] }} />
      ))}
    </View>
  );
}

/** Zəng edilir… nöqtələri */
function Dots() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(v, { toValue: 3, duration: 1200, easing: Easing.linear, useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [v]);
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand, opacity: v.interpolate({ inputRange: [i, i + 0.5, i + 1], outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' }) }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', paddingTop: 30 },
  halo: { position: 'absolute', top: 30 + 30 + 30 - 14, width: 228, height: 228, borderRadius: 114, borderWidth: 3, opacity: 0.6 },
  name: { color: colors.white, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: colors.glassLight, borderRadius: 16, paddingHorizontal: 12, height: 32 },
  status: { color: colors.white, fontSize: 14, fontFamily: fonts.bold },
  warn: { color: colors.nightMuted, textAlign: 'center', paddingHorizontal: 30, marginTop: 12, fontFamily: fonts.medium },
  pipWrap: { position: 'absolute', top: 110, right: 18, width: 108, height: 152 },
  pipShadow: { position: 'absolute', left: 4, top: 4, right: -4, bottom: -4, borderRadius: 18, backgroundColor: colors.ink },
  pip: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.night2 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 8 },
  peerPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass, borderRadius: 22, paddingLeft: 4, paddingRight: 12, height: 44 },
  peerName: { color: colors.white, fontFamily: fonts.bold, fontSize: 13, maxWidth: 140 },
  peerTime: { color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 11 },
  rec: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },
  low: { position: 'absolute', left: 16, right: 16, top: 112 },
  lowInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  lowText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13, flex: 1 },
  lowCta: { color: colors.bg, backgroundColor: colors.ink, fontFamily: fonts.bold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: 18 },
  dockShadow: { position: 'absolute', top: 4, left: 20, right: 12, height: 86, borderRadius: 28, backgroundColor: colors.ink },
  dock: { flexDirection: 'row', justifyContent: 'space-evenly', alignSelf: 'stretch', marginHorizontal: 16, height: 90, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  ctrl: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { color: colors.nightMuted, fontSize: 10.5, fontFamily: fonts.bold },
  hang: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
