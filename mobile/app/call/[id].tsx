import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, AppState, BackHandler, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useTranslation } from 'react-i18next';
import { colors, fonts, glow, tintFor } from '@/theme';
import { Box, GlassPill, Loader, PressBox, T, tap } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/Badges';
import { CoinIcon, DiamondIcon } from '@/components/GiftIcon';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { RechargeSheet } from '@/components/RechargeSheet';
import { api } from '@/lib/api';
import { fmtAlmaz } from '@/lib/economy';
import { duration, errorText } from '@/lib/format';
import { useSocket } from '@/lib/socket';
import * as rtc from '@/lib/rtc';
import { useStore } from '@/store';
import type { Call, GiftEvent, PublicUser, RtcCreds } from '@/lib/types';
import { endNative, markConnected, onNativeMute, startNativeOutgoing } from '@/lib/nativeCall';
import { CallSafetyLayer } from '@/components/CallSafety';

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

interface CallDetail { call: Call; peer: PublicUser; rtc: RtcCreds; role: 'caller' | 'callee'; serverNow?: string; nextChargeAt?: string | null; earned?: number }
/** Server dəqiqə ödənişi ilə göndərir (call:tick) — zəng edənə Nar xərci, hosta Almaz qazancı */
interface Billing { coinsSpent: number; coins?: number; minutesLeft?: number; earned?: number; nextChargeAt?: number }

/**
 * 1-ə-1 zəng ekranı. Müştəri vəziyyəti: loading → ringing → active → (reconnecting) → ended → xülasə.
 * Server həqiqət mənbəyidir: socket hadisələri qaçırılsa belə (şəbəkə kəsilməsi, fon rejimi)
 * qoşulanda / tətbiq önə gələndə / hər 8 saniyədə GET /calls/:id ilə vəziyyət yenidən oxunur.
 */
export default function CallScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const { id, accept } = useLocalSearchParams<{ id: string; accept?: string }>();
  const { me, toast } = useStore();
  const sock = useSocket();
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
  /** Host tərəfi: zəng edənin balansı bitir (server call:ending-soon) — zəng nə vaxt kəsilə bilər */
  const [endingSoon, setEndingSoon] = useState<{ endsAt: number; chargeAt: number } | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rtcError, setRtcError] = useState(false);
  const [billing, setBilling] = useState<Billing>({ coinsSpent: 0 });
  // Bağlantı: RTC (Agora) yenidən qoşulur / socket kəsilib / qarşı tərəf düşüb
  const [rtcConn, setRtcConn] = useState<rtc.RtcConnState>('connecting');
  const [socketUp, setSocketUp] = useState(true);
  const [peerDropped, setPeerDropped] = useState(false);
  const [quality, setQuality] = useState<rtc.RtcQuality>(0);
  // WhatsApp kimi: ekrana toxunanda düymələr gizlənir/açılır, kiçik pəncərəyə toxunanda kameralar yer dəyişir
  const [swap, setSwap] = useState(false);
  const [uiOn, setUiOn] = useState(true);
  const ui = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlay = useRef<GiftOverlayHandle>(null);
  const ended = useRef(false);
  const started = useRef(false);
  const channel = useRef<string | undefined>(undefined);
  /** Server saatı ilə fərq (ms): taymer cihaz saatı səhv olsa da düz göstərsin */
  const skew = useRef(0);

  const isVideo = call?.type === 'VIDEO';
  const isCaller = call?.callerId === me?.id;

  const markStarted = useCallback((iso: string | Date | null | undefined) => {
    const ts = iso ? new Date(iso).getTime() + skew.current : Date.now();
    started.current = true;
    setStartedAt((cur) => cur ?? ts);
  }, []);

  /** Zəng bitdi: kanaldan çıx; danışıq olubsa — xülasə ekranı, olmayıbsa — səbəb + geri */
  const close = useCallback((reason?: string) => {
    if (ended.current) return;
    ended.current = true;
    rtc.leave(channel.current);
    endNative(id);
    if (started.current) {
      router.replace({ pathname: '/call/summary', params: { id, reason: reason ?? '' } });
      return;
    }
    if (reason) toast(t(`call.reasons.${reason}`, { defaultValue: t('call.ended') }));
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [id, t, toast]);

  /** Serverdən cari vəziyyəti oxu (qaçırılmış call:accepted / call:ended üçün) */
  const resync = useCallback(async () => {
    if (ended.current) return;
    try {
      const r = await api<CallDetail>(`/calls/${id}`);
      if (r.serverNow) skew.current = Date.now() - new Date(r.serverNow).getTime();
      if (r.call.status === 'ACTIVE') {
        markStarted(r.call.startedAt);
        setBilling((b) => ({
          ...b,
          coinsSpent: Math.max(b.coinsSpent, r.call.coinsSpent ?? 0),
          earned: r.earned ?? b.earned,
          nextChargeAt: r.nextChargeAt ? new Date(r.nextChargeAt).getTime() + skew.current : b.nextChargeAt,
        }));
      } else if (r.call.status !== 'RINGING') {
        close(r.call.endReason ?? undefined);
      }
    } catch {
      /* şəbəkə yoxdur — növbəti cəhd */
    }
  }, [id, close, markStarted]);

  useEffect(() => {
    let alive = true;
    const unsub = rtc.subscribe({
      onRemoteJoined: (uid) => { setRemoteUid(uid); setPeerDropped(false); },
      // reason 1 = bağlantı itdi: zəngi bitirmirik — server güzəşt müddətindən sonra özü bitirir
      onRemoteLeft: (_uid, reason) => { setRemoteUid(null); if (reason === 1) setPeerDropped(true); },
      onError: () => setRtcError(true),
      onConnState: (st) => setRtcConn(st),
      onQuality: (uid, tx, rx) => { if (uid === 0) setQuality(Math.max(tx, rx) as rtc.RtcQuality); },
    });
    (async () => {
      try {
        const r = await api<CallDetail>(`/calls/${id}`);
        if (!alive) return;
        if (r.serverNow) skew.current = Date.now() - new Date(r.serverNow).getTime();
        setCall(r.call);
        setPeer(r.peer);
        channel.current = r.call.channel;
        // Gedən zəng sistemə də bildirilir: iPhone-da Dynamic Island / yaşıl göstərici, qulaqlıq düymələri.
        // Ekran isə tətbiqin özününküdür (profil şəkli ilə); tətbiq açıqkən sistemin endCall hadisəsi zəngi kəsmir.
        if (r.role === 'caller' && r.call.status === 'RINGING') startNativeOutgoing(r.call.id, r.peer.name, r.call.type === 'VIDEO');
        let creds = r.rtc;
        if (r.role === 'callee' && accept === '1' && r.call.status === 'RINGING') {
          const a = await api<{ call: Call; rtc: RtcCreds }>(`/calls/${id}/accept`, { body: {} });
          setCall(a.call);
          creds = a.rtc;
          markStarted(a.call.startedAt);
          markConnected(a.call.id);
        } else if (r.call.status === 'ACTIVE' && r.call.startedAt) {
          // Yenidən açılış (məs. tətbiq yenidən başladı) — danışıq davam edir
          markStarted(r.call.startedAt);
          if (r.nextChargeAt) setBilling((b) => ({ ...b, nextChargeAt: new Date(r.nextChargeAt!).getTime() + skew.current, earned: r.earned }));
        } else if (r.call.status !== 'RINGING') {
          close(r.call.endReason ?? undefined);
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
      rtc.leave(channel.current);
      // Ekran gözlənilmədən bağlandı (məs. başqa ekrana keçid) — zəng arxada ödənişlə davam etməsin
      if (!ended.current) {
        ended.current = true;
        void api(`/calls/${id}/${started.current ? 'end' : 'reject'}`, { body: {} }).catch(() => {});
        endNative(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const s = sock;
    if (!s) return;
    const onAccepted = (p: { callId: string; startedAt?: string }) => {
      if (p.callId === id) { markStarted(p.startedAt); markConnected(id); }
    };
    const onEnded = (p: { callId: string; reason: string }) => {
      if (p.callId === id) close(p.reason);
    };
    const onLow = (p: { callId: string; minutesLeft: number }) => {
      if (p.callId === id) setLowBalance(p.minutesLeft);
    };
    const onEndingSoon = (p: { callId: string; secondsLeft?: number; endsAt?: string; nextChargeAt?: string }) => {
      if (p.callId !== id) return;
      const endsAt = p.endsAt ? new Date(p.endsAt).getTime() + skew.current : Date.now() + (p.secondsLeft ?? 60) * 1000;
      setEndingSoon({ endsAt, chargeAt: p.nextChargeAt ? new Date(p.nextChargeAt).getTime() : 0 });
    };
    const onTick = (p: { callId: string; coinsSpent?: number; coins?: number; minutesLeft?: number; earned?: number; nextChargeAt?: string }) => {
      if (p.callId !== id) return;
      // Host: növbəti dəqiqə də ödənildisə (zəng edən balansı yüklədi) — "tezliklə bitir" banneri gizlənir
      if (p.nextChargeAt) { const nc = new Date(p.nextChargeAt).getTime(); setEndingSoon((e) => (e && nc > e.chargeAt ? null : e)); }
      setBilling((b) => ({
        coinsSpent: p.coinsSpent ?? b.coinsSpent,
        coins: p.coins ?? b.coins,
        minutesLeft: p.minutesLeft ?? b.minutesLeft,
        earned: p.earned ?? b.earned,
        nextChargeAt: p.nextChargeAt ? new Date(p.nextChargeAt).getTime() + skew.current : b.nextChargeAt,
      }));
      // Yükləmədən sonra balans yenidən çatırsa — xəbərdarlığı gizlət
      if (p.minutesLeft != null && p.minutesLeft >= 2) setLowBalance(null);
    };
    const onGift = (e: GiftEvent) => overlay.current?.push(e);
    const onConnect = () => { setSocketUp(true); void resync(); };
    const onDisconnect = () => setSocketUp(false);
    s.on('call:accepted', onAccepted);
    s.on('call:ended', onEnded);
    s.on('call:low-balance', onLow);
    s.on('call:ending-soon', onEndingSoon);
    s.on('call:tick', onTick);
    s.on('call:gift', onGift);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    setSocketUp(s.connected);
    // Socket ekrandan sonra yarandısa — arada qaçırılmış hadisələri serverdən oxu
    if (s.connected) void resync();
    return () => {
      s.off('call:accepted', onAccepted);
      s.off('call:ended', onEnded);
      s.off('call:low-balance', onLow);
      s.off('call:ending-soon', onEndingSoon);
      s.off('call:tick', onTick);
      s.off('call:gift', onGift);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [sock, id, close, resync, markStarted]);

  // Tətbiq önə qayıdanda və dövri olaraq — server vəziyyəti ilə tutuşdur
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') void resync(); });
    const i = setInterval(() => void resync(), 8000);
    return () => { sub.remove(); clearInterval(i); };
  }, [resync]);

  // Sistem zəng ekranından (CallKit) səsi bağlama
  useEffect(() => onNativeMute((callId, m) => { if (callId === id) { rtc.controls.mute(m); setMuted(m); } }), [id]);

  // Android "geri" düyməsi zəngi səhvən bağlamasın — təsdiq soruşulur
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(t('cl.endConfirm'), '', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('cl.endCta'), style: 'destructive', onPress: () => void hangup() },
      ]);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, startedAt]);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  async function hangup() {
    if (ended.current) return;
    try {
      await api(`/calls/${id}/${startedAt ? 'end' : 'reject'}`, { body: {} });
    } catch {
      /* ignore */
    }
    close();
  }

  const videoLive = isVideo && !!startedAt && !!rtc.RtcSurfaceView && !rtcError;
  function showUi(v: boolean) {
    setUiOn(v);
    Animated.timing(ui, { toValue: v ? 1 : 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    // Görüntülü danışıqda düymələr 4 saniyədən sonra özü gizlənir
    if (v && videoLive) hideTimer.current = setTimeout(() => showUi(false), 4000);
  }
  useEffect(() => {
    if (videoLive) showUi(true);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoLive]);

  if (!call || !peer) return <View style={{ flex: 1, backgroundColor: colors.night }}><Loader full night /></View>;
  const connected = !!startedAt;
  const Surface = rtc.RtcSurfaceView;
  // Qarşı tərəfin uid-i = onun qısa ID-si (server tokeni belə verir) — hadisə gecikəndə də görüntü açılır
  const peerUid = remoteUid ?? peer.shortId;
  const remoteVideo = videoLive && !!Surface;
  const bigUid = swap ? 0 : peerUid;
  const pipUid = swap ? peerUid : 0;
  const dockStyle = { opacity: ui, transform: [{ translateY: ui.interpolate({ inputRange: [0, 1], outputRange: [220, 0] }) }] };
  const topStyle = { opacity: ui, transform: [{ translateY: ui.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }] };
  const elapsed = connected ? duration(Math.max(0, Math.floor((now - startedAt!) / 1000))) : '';
  const paid = call.pricePerMin > 0;
  const myCoins = billing.coins ?? me?.coins ?? 0;
  const minutesLeft = billing.minutesLeft ?? (paid ? Math.floor(myCoins / call.pricePerMin) : null);
  const secsToCharge = billing.nextChargeAt ? Math.max(0, Math.round((billing.nextChargeAt - now) / 1000)) : null;
  const reconnecting = connected && (rtcConn === 'reconnecting' || !socketUp);
  const netBars = quality === 0 ? 0 : quality <= 2 ? 3 : quality === 3 ? 2 : 1;
  const netLabel = quality === 0 ? '' : quality <= 2 ? t('cl.netGood') : quality === 3 ? t('cl.netFair') : quality === 4 ? t('cl.netPoor') : t('cl.netBad');

  /** Xərc / qazanc sayğacı (Chamet/LivU: zəng edən Nar, host Almaz görür) */
  const meter = connected && paid ? (
    <View style={styles.meter}>
      {isCaller ? (
        <>
          <CoinIcon size={14} />
          <Text style={styles.meterNum}>{billing.coinsSpent || call.pricePerMin}</Text>
          {minutesLeft != null ? <Text style={styles.meterSub}>· {t('cl.minutesLeft', { n: minutesLeft })}</Text> : null}
        </>
      ) : (
        <>
          <DiamondIcon size={14} />
          <Text style={styles.meterNum}>+{fmtAlmaz(billing.earned ?? 0)}</Text>
          <Text style={styles.meterSub}>{t('cl.earned')}</Text>
        </>
      )}
    </View>
  ) : null;

  const net = connected && netBars ? (
    <View style={styles.net} accessibilityLabel={netLabel}>
      {[1, 2, 3].map((b) => <View key={b} style={[styles.netBar, { height: 4 + b * 3, backgroundColor: b <= netBars ? (netBars === 1 ? colors.brand : netBars === 2 ? colors.coin : colors.online) : 'rgba(255,255,255,0.3)' }]} />)}
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar style="light" />
      {!remoteVideo && peer.avatarUrl ? <Image source={{ uri: peer.avatarUrl }} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} contentFit="cover" blurRadius={40} /> : null}
      {!remoteVideo ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(16,14,13,0.55)' }]} /> : null}
      {remoteVideo ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => showUi(!uiOn)}>
          {bigUid === 0 && !camOn ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.night2 }]} /> : (
            <Surface key={`big-${bigUid}`} style={StyleSheet.absoluteFill} canvas={{ uid: bigUid }} />
          )}
        </Pressable>
      ) : (
        <SafeAreaView edges={['top']} style={styles.center}>
          <View style={styles.pills}>
            <GlassPill label={isVideo ? t('chat.callVideo') : t('chat.callVoice')} icon={isVideo ? 'videocam' : 'call'} bg={colors.glassLight} style={{ height: 30, paddingHorizontal: 12 }} />
            {paid && isCaller ? <GlassPill label={t('call.price', { price: call.pricePerMin })} icon="coin" bg={colors.coin} color={colors.ink} style={{ height: 30, paddingHorizontal: 12 }} /> : null}
            {net}
          </View>
          {/* Halqa fotoya nəzərən mərkəzlənir (yuxarıdakı həblərin hündürlüyündən asılı deyil) */}
          <View style={styles.photoWrap}>
            <View style={[styles.halo, { borderColor: isVideo ? colors.brand : colors.sky }]} />
            <Box r={110} sh={0} bg={tintFor(peer.name)} inner={{ width: 200, height: 200 }}>
              {peer.avatarUrl ? <Image source={{ uri: peer.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><T v="hero">{peer.name.slice(0, 1)}</T></View>
              )}
            </Box>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24 }}>
            <Text style={styles.name}>{peer.name}</Text>
            {peer.verified ? <VerifiedBadge size={20} /> : null}
          </View>
          <View style={styles.statusPill}>
            {connected ? <Wave /> : <Dots />}
            <Text style={styles.status}>{connected ? elapsed : t('call.calling')}</Text>
          </View>
          {meter ? <View style={{ marginTop: 10 }}>{meter}</View> : null}
          {!connected && paid && isCaller && minutesLeft != null ? (
            <Text style={styles.ringHint}>{t('cl.enoughFor', { n: minutesLeft })} · {t('match.billing')}</Text>
          ) : null}
          {rtcError ? <Text style={styles.warn}>{t('call.rtcMissing')}</Text> : null}
        </SafeAreaView>
      )}

      {isVideo && Surface && !rtcError && (remoteVideo || camOn) ? (
        <Animated.View style={[styles.pipWrap, { transform: [{ translateY: ui.interpolate({ inputRange: [0, 1], outputRange: [-56, 0] }) }] }]}>
          <Pressable style={styles.pip} disabled={!remoteVideo} onPress={() => { tap(); setSwap((v) => !v); if (videoLive) showUi(true); }}>
            {remoteVideo ? (
              pipUid === 0 && !camOn ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Icon name="videocamOff" size={22} color={colors.nightMuted} /></View> : (
                <Surface key={`pip-${pipUid}`} style={{ flex: 1 }} canvas={{ uid: pipUid }} zOrderMediaOverlay />
              )
            ) : (
              <Surface style={{ flex: 1 }} canvas={{ uid: 0 }} zOrderMediaOverlay />
            )}
            {remoteVideo ? <View style={styles.swapHint}><Icon name="flip" size={12} color={colors.white} /></View> : null}
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Hədiyyələr: videonun üstündə, idarə düymələrinin altında; göndərən özü yalnız kiçik "Sən göndərdin" banneri görür */}
      <GiftOverlay ref={overlay} compactSelf />

      <Animated.View style={[StyleSheet.absoluteFill, remoteVideo ? topStyle : null]} pointerEvents={uiOn ? 'box-none' : 'none'}>
      <SafeAreaView style={styles.top} edges={['top']} pointerEvents="box-none">
        {remoteVideo ? (
          <View style={styles.peerPill}>
            <Avatar uri={peer.avatarUrl} name={peer.name} size={30} />
            <View>
              <Text style={styles.peerName} numberOfLines={1}>{peer.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={styles.rec} />
                <Text style={styles.peerTime}>{elapsed}</Text>
                {net}
              </View>
            </View>
          </View>
        ) : <View />}
        {remoteVideo ? meter : null}
      </SafeAreaView>
      </Animated.View>

      {/* Yenidən qoşulma: RTC və ya socket kəsiləndə; qarşı tərəf düşəndə — onun adı ilə */}
      {reconnecting || (connected && peerDropped) ? (
        <View style={styles.reconnect} pointerEvents="none">
          <Dots />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.reconnectText}>{reconnecting ? t('cl.reconnecting') : t('cl.peerReconnecting', { name: peer.name })}</Text>
            {reconnecting ? <Text style={styles.reconnectSub}>{t('cl.reconnectingSub')}</Text> : null}
          </View>
        </View>
      ) : null}

      {lowBalance != null && isCaller && connected ? (
        <PressBox onPress={() => setRechargeOpen(true)} bg={colors.coin} r={18} sh={4} style={styles.low} inner={styles.lowInner}>
          <Icon name="time" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.lowTitle}>{t('cl.lowTitle')}</Text>
            <Text style={styles.lowText}>
              {lowBalance <= 0 && secsToCharge != null ? t('cl.lowLast', { s: secsToCharge }) : t('cl.lowSub', { n: lowBalance })}
            </Text>
          </View>
          <Text style={styles.lowCta}>{t('cl.recharge')}</Text>
        </PressBox>
      ) : null}

      {endingSoon && !isCaller && connected ? (
        <Box bg={colors.coin} r={18} sh={4} style={styles.low} inner={styles.lowInner}>
          <Icon name="time" size={20} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <Text style={styles.lowTitle}>{t('growth.endingTitle')}</Text>
            <Text style={styles.lowText}>{t('growth.endingSub', { s: Math.max(0, Math.round((endingSoon.endsAt - now) / 1000)) })}</Text>
          </View>
        </Box>
      ) : null}

      <Animated.View style={[styles.controlsWrap, remoteVideo ? dockStyle : null]} pointerEvents={uiOn ? 'box-none' : 'none'}>
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
      </Animated.View>
      <CallSafetyLayer contextType="CALL" contextId={call.id} isVideo={!!isVideo} active={videoLive && camOn} peerId={peer.id} peerUid={peerUid} onEnd={() => void hangup()} />
      <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={peer.id} receiverName={peer.name} context="CALL" contextId={call.id} onSent={(e) => overlay.current?.push(e)} />
      {isCaller ? (
        <RechargeSheet
          visible={rechargeOpen}
          night
          need={call.pricePerMin * 5}
          onClose={() => setRechargeOpen(false)}
          onDone={() => { setLowBalance(null); setBilling((b) => ({ ...b, coins: undefined, minutesLeft: undefined })); }}
        />
      ) : null}
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
  // paddingTop 8 + 30px həb = yuxarı sıra ilə (qiymət etiketi) eyni mərkəz xətti
  center: { flex: 1, alignItems: 'center', paddingTop: 8 },
  pills: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16, paddingHorizontal: 16 },
  photoWrap: { width: 228, height: 228, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', top: 0, left: 0, width: 228, height: 228, borderRadius: 114, borderWidth: 3, opacity: 0.6 },
  name: { color: colors.white, fontSize: 30, fontFamily: fonts.display, letterSpacing: -0.8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: colors.glassLight, borderRadius: 16, paddingHorizontal: 12, height: 32 },
  status: { color: colors.white, fontSize: 14, fontFamily: fonts.bold },
  ringHint: { color: colors.nightMuted, fontSize: 12, fontFamily: fonts.semibold, marginTop: 12, textAlign: 'center', paddingHorizontal: 30 },
  warn: { color: colors.nightMuted, textAlign: 'center', paddingHorizontal: 30, marginTop: 12, fontFamily: fonts.medium },
  pipWrap: { position: 'absolute', top: 110, right: 18, width: 108, height: 152 },
  pipShadow: { position: 'absolute', left: 4, top: 4, right: -4, bottom: -4, borderRadius: 18, backgroundColor: colors.ink },
  pip: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.night2 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 8 },
  peerPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass, borderRadius: 22, paddingLeft: 4, paddingRight: 12, height: 44 },
  peerName: { color: colors.white, fontFamily: fonts.bold, fontSize: 13, maxWidth: 140 },
  peerTime: { color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 11 },
  rec: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.brand },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.glass, borderRadius: 16, paddingHorizontal: 10, height: 32, alignSelf: 'center' },
  meterNum: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
  meterSub: { color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 11.5 },
  net: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14, marginLeft: 4 },
  netBar: { width: 3, borderRadius: 1.5 },
  reconnect: { position: 'absolute', top: '42%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(16,14,13,0.78)', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, maxWidth: '86%' },
  reconnectText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
  reconnectSub: { color: colors.nightMuted, fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  low: { position: 'absolute', left: 16, right: 16, top: 112 },
  lowInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  lowTitle: { color: colors.ink, fontFamily: fonts.black, fontSize: 13.5 },
  lowText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 12, marginTop: 1 },
  lowCta: { color: colors.bg, backgroundColor: colors.ink, fontFamily: fonts.bold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  controlsWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  controls: { alignItems: 'center', paddingBottom: 18 },
  swapHint: { position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  dockShadow: { position: 'absolute', top: 4, left: 20, right: 12, height: 86, borderRadius: 28, backgroundColor: colors.ink },
  dock: { flexDirection: 'row', justifyContent: 'space-evenly', alignSelf: 'stretch', marginHorizontal: 16, height: 90, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  ctrl: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { color: colors.nightMuted, fontSize: 10.5, fontFamily: fonts.bold },
  hang: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
