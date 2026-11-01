import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useTranslation } from 'react-i18next';
import { colors, gradients } from '@/theme';
import { Loader } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { CoinAmount } from '@/components/Badges';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { api } from '@/lib/api';
import { duration, errorText } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import * as rtc from '@/lib/rtc';
import { useStore } from '@/store';
import type { Call, GiftEvent, PublicUser, RtcCreds } from '@/lib/types';

function Ctrl({ icon, onPress, active = true, label }: { icon: IconName; onPress: () => void; active?: boolean; label?: string }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', gap: 4 }}>
      <View style={[styles.ctrl, !active && { backgroundColor: '#fff' }]}>
        <Icon name={icon} size={24} color={active ? '#fff' : colors.bg} />
      </View>
      {label ? <Text style={styles.ctrlLabel}>{label}</Text> : null}
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

  if (!call || !peer) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loader full /></View>;
  const connected = !!startedAt;
  const Surface = rtc.RtcSurfaceView;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {isVideo && connected && remoteUid != null && Surface ? (
        <Surface style={StyleSheet.absoluteFill} canvas={{ uid: remoteUid }} />
      ) : (
        <>
          {peer.avatarUrl ? <Image source={{ uri: peer.avatarUrl }} style={StyleSheet.absoluteFill} blurRadius={24} /> : null}
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(43,16,85,0.55)', 'rgba(18,7,31,0.92)']} style={StyleSheet.absoluteFill} />
          <View style={styles.center}>
            <Avatar uri={peer.avatarUrl} name={peer.name} size={140} vipTier={peer.vipTier} />
            <Text style={styles.name}>{peer.name}</Text>
            <Text style={styles.status}>{connected ? duration(Math.floor((now - startedAt!) / 1000)) : t('call.calling')}</Text>
            {rtcError ? <Text style={styles.warn}>{t('call.rtcMissing')}</Text> : null}
          </View>
        </>
      )}
      {isVideo && camOn && Surface && !rtcError ? (
        <View style={styles.pip}>
          <Surface style={{ flex: 1 }} canvas={{ uid: 0 }} zOrderMediaOverlay />
        </View>
      ) : null}

      <SafeAreaView style={styles.top} edges={['top']}>
        {isVideo && connected ? (
          <View style={styles.timer}>
            <View style={styles.rec} />
            <Text style={{ color: '#fff', fontWeight: '700' }}>{duration(Math.floor((now - startedAt!) / 1000))}</Text>
          </View>
        ) : <View />}
        {call.pricePerMin > 0 && isCaller ? (
          <View style={styles.price}><CoinAmount n={t('call.price', { price: call.pricePerMin })} size={13} /></View>
        ) : null}
      </SafeAreaView>

      {lowBalance != null && isCaller ? (
        <Pressable onPress={() => router.push('/wallet')} style={styles.low}>
          <LinearGradient colors={gradients.gold} style={styles.lowInner}>
            <Text style={{ color: '#3A1F00', fontWeight: '800', flex: 1 }}>{t('call.lowBalance', { n: lowBalance })}</Text>
            <Text style={{ color: colors.rose, fontWeight: '900' }}>{t('wallet.recharge')} ›</Text>
          </LinearGradient>
        </Pressable>
      ) : null}

      <SafeAreaView edges={['bottom']} style={styles.controls}>
        <View style={styles.row}>
          <Ctrl icon={muted ? 'micOff' : 'mic'} active={!muted} onPress={() => { rtc.controls.mute(!muted); setMuted(!muted); }} />
          {isVideo ? (
            <>
              <Ctrl icon={camOn ? 'videocam' : 'videocamOff'} active={camOn} onPress={() => { rtc.controls.camera(!camOn); setCamOn(!camOn); }} />
              <Ctrl icon="flip" onPress={() => rtc.controls.flip()} />
              <Ctrl icon="beauty" active={beauty} onPress={() => { rtc.controls.beauty(!beauty); setBeauty(!beauty); }} />
            </>
          ) : (
            <Ctrl icon={speaker ? 'speaker' : 'speakerOff'} active={speaker} onPress={() => { rtc.controls.speaker(!speaker); setSpeaker(!speaker); }} />
          )}
          {isCaller ? (
            <Pressable onPress={() => setGiftOpen(true)}>
              <LinearGradient colors={gradients.primary} style={styles.ctrl}><Icon name="gift" size={24} /></LinearGradient>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={hangup} style={styles.hang}>
          <Icon name="call" size={32} />
        </Pressable>
      </SafeAreaView>
      <GiftOverlay ref={overlay} />
      <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={peer.id} context="CALL" contextId={call.id} onSent={(e) => overlay.current?.push(e)} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  name: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 12 },
  status: { color: colors.textMuted, fontSize: 17, fontWeight: '600' },
  warn: { color: colors.gold, textAlign: 'center', paddingHorizontal: 30, marginTop: 10 },
  pip: { position: 'absolute', top: 110, right: 14, width: 112, height: 160, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: '#222' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  rec: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  price: { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  low: { position: 'absolute', left: 16, right: 16, top: 120 },
  lowInner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: 16, gap: 22 },
  row: { flexDirection: 'row', gap: 18 },
  ctrl: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { color: '#fff', fontSize: 11 },
  hang: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '135deg' }] },
});
