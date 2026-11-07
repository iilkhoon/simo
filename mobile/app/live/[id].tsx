import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fmtAlmaz } from '@/lib/economy';
import { Alert, Dimensions, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View, Share } from 'react-native';
import { KeyboardAvoidingView } from '../../src/lib/keyboard';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useTranslation } from 'react-i18next';
import { colors, fonts, vipColor, webNoOutline } from '@/theme';
import { GlassPill, Box, Btn, IconBtn, Loader, T, Tag, tap } from '@/components/ui';
import { openReport } from '@/components/ReportSheet';
import { GiftIcon } from '@/components/GiftIcon';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { LevelBadge } from '@/components/Badges';
import { GiftSheet } from '@/components/GiftSheet';
import { GuestStrip, HostPanel, JoinTicker, LiveUsersSheet, PkBar, type Guest, type PkState } from '@/components/LiveExtras';
import { WEB_URL } from '@/config';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { Hearts, type HeartsHandle } from '@/components/Hearts';
import { api } from '@/lib/api';
import { compact, duration, errorText, giftName } from '@/lib/format';
import { getSocket, useSocket } from '@/lib/socket';
import * as rtc from '@/lib/rtc';
import { useStore } from '@/store';
import type { GiftEvent, PublicUser, RtcCreds, VipTier } from '@/lib/types';

const { width: W } = Dimensions.get('window');

interface Room {
  id: string; hostId: string; type: 'VIDEO' | 'VOICE'; title: string; coverUrl: string | null; status: 'LIVE' | 'ENDED';
  viewerCount: number; startedAt: string; host: PublicUser;
}
interface Seat { seat: number; user: PublicUser | null }
interface MiniUser { id: string; name: string; avatarUrl: string | null; wealthLevel: number; vipTier: VipTier }
interface Line { id: string; kind: 'comment' | 'gift' | 'enter'; text: string; user: MiniUser }
interface Summary { durationSec: number; peakViewers: number; giftsCoins: number; diamonds: number; likes: number }

export default function LiveRoom() {
  const insets = useSafeAreaInsets();
  useKeepAwake();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, toast, patchMe } = useStore();
  const sock = useSocket();
  const [room, setRoom] = useState<Room | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [following, setFollowing] = useState(false);
  const [creds, setCreds] = useState<RtcCreds | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [top, setTop] = useState<{ user: PublicUser; coins: number }[]>([]);
  const [viewers, setViewers] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const [hostUid, setHostUid] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState<Set<number>>(new Set());
  const [enter, setEnter] = useState<{ user: MiniUser; effect: boolean } | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [beauty, setBeauty] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [pk, setPk] = useState<PkState | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [panel, setPanel] = useState(false);
  const [requests, setRequests] = useState(0);
  const [giftTo, setGiftTo] = useState<PublicUser | null>(null);
  const [requested, setRequested] = useState(false);
  // Otaqdakılar vərəqəsi (izləyicilər / top dəstəkçilər), adi giriş zolağı, bağlantı vəziyyəti
  const [usersSheet, setUsersSheet] = useState<null | 'viewers' | 'top'>(null);
  const [ticker, setTicker] = useState<{ name: string; level: number; k: string } | null>(null);
  const [connUp, setConnUp] = useState(true);
  const [saidHi, setSaidHi] = useState(false);
  const lastTap = useRef(0);
  const overlay = useRef<GiftOverlayHandle>(null);
  const hearts = useRef<HeartsHandle>(null);
  const likeBatch = useRef(0);

  const pushLine = useCallback((l: Line) => setLines((cur) => [l, ...cur].slice(0, 60)), []);

  useEffect(() => {
    let alive = true;
    const unsub = rtc.subscribe({
      onRemoteJoined: (uid) => setHostUid((cur) => cur ?? uid),
      onRemoteLeft: (uid) => setHostUid((cur) => (cur === uid ? null : cur)),
      onVolume: (sp) => setSpeaking(new Set(sp.filter((s) => s.volume > 30).map((s) => s.uid))),
    });
    (async () => {
      try {
        const r = await api<{ room: Room; isHost: boolean; isFollowing: boolean; rtc: RtcCreds | null; seats: Seat[]; topGifters: { user: PublicUser; coins: number }[]; guests?: Guest[]; pk?: PkState | null }>(`/live/${id}`);
        if (!alive) return;
        setRoom(r.room);
        setIsHost(r.isHost);
        setFollowing(r.isFollowing);
        setSeats(r.seats);
        setTop(r.topGifters);
        setGuests(r.guests ?? []);
        setPk(r.pk ?? null);
        setViewers(r.room.viewerCount);
        if (r.room.status !== 'LIVE' || !r.rtc) {
          setEnded(true);
          return;
        }
        setCreds(r.rtc);
        setHostUid(r.isHost ? null : r.room.host.shortId);
        // live:join socket effektində edilir (socket bu ekrandan sonra yarana bilər)
        const onSeat = r.seats.some((x) => x.user?.id === useStore.getState().me?.id);
        try {
          await rtc.join(r.rtc, { video: r.room.type === 'VIDEO', publish: r.isHost || onSeat });
          if (r.isHost && r.room.type === 'VIDEO') rtc.controls.beauty(true);
        } catch {
          toast(t('call.rtcMissing'));
        }
      } catch (e) {
        toast(errorText(e), 'error');
        router.back();
      }
    })();
    return () => {
      alive = false;
      unsub();
      getSocket()?.emit('live:leave', { roomId: id });
      rtc.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const s = sock;
    if (!s) return;
    const onViewers = (p: { count: number }) => setViewers(p.count);
    const onComment = (p: { id: string; text: string; user: MiniUser }) => pushLine({ id: p.id, kind: 'comment', text: p.text, user: p.user });
    const onGift = (e: GiftEvent) => {
      overlay.current?.push(e);
      pushLine({ id: e.id, kind: 'gift', text: `🎁 ${giftName(e.gift)} ×${e.count}`, user: e.sender });
      setTop((cur) => {
        const m = new Map(cur.map((x) => [x.user.id, x]));
        const prev = m.get(e.sender.id);
        if (prev) m.set(e.sender.id, { ...prev, coins: prev.coins + e.coins });
        return [...m.values()].sort((a, b) => b.coins - a.coins);
      });
    };
    const onEnter = (p: { user: MiniUser; effect: boolean }) => {
      pushLine({ id: `e${Date.now()}${p.user.id}`, kind: 'enter', text: t('live.entered', { name: p.user.name }), user: p.user });
      if (p.effect || p.user.vipTier !== 'NONE' || p.user.wealthLevel >= 10) {
        setEnter(p);
        setTimeout(() => setEnter(null), 3000);
      } else {
        setTicker({ name: p.user.name, level: p.user.wealthLevel, k: `${p.user.id}${Date.now()}` });
      }
    };
    const onLike = (p: { count: number }) => hearts.current?.burst(Math.min(3, p.count));
    const onSeats = (p: { seats: Seat[] }) => setSeats(p.seats);
    const onEnded = () => setEnded(true);
    // Şəbəkə kəsilib bərpa olunanda server yeni soketi otaqda tanımır: yenidən qoşul və vəziyyəti yenilə
    // (əks halda şərhlər/hədiyyələr gəlmir, host isə 60 saniyədən sonra "çıxmış" sayılır)
    const onConnect = () => {
      setConnUp(true);
      s.emit('live:join', { roomId: id }, (ack: { ok: boolean; viewers?: number }) => {
        if (!ack?.ok) { setEnded(true); return; }
        if (typeof ack.viewers === 'number') setViewers(ack.viewers);
      });
      void api<{ seats: Seat[]; guests?: Guest[]; pk?: PkState | null; topGifters: { user: PublicUser; coins: number }[]; room: Room }>(`/live/${id}`)
        .then((r) => {
          if (r.room.status !== 'LIVE') { setEnded(true); return; }
          setSeats(r.seats); setGuests(r.guests ?? []); setPk(r.pk ?? null); setTop(r.topGifters);
        })
        .catch(() => {});
    };
    const onDisconnect = () => setConnUp(false);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    // Otaq yükləndi (creds) və socket hazırdır — qoşul (server eyni soketdən təkrar join-i saymır)
    if (creds && s.connected) {
      s.emit('live:join', { roomId: id }, (ack: { ok: boolean; viewers?: number }) => {
        if (!ack?.ok) setEnded(true);
        else if (typeof ack.viewers === 'number') setViewers(ack.viewers);
      });
    }
    const onKicked = async (p: { userId: string }) => {
      if (p.userId === me?.id && creds) {
        const r = await api<{ rtc: RtcCreds }>(`/live/${id}/seat/leave`, { body: {} }).catch(() => null);
        if (r?.rtc) rtc.setPublishing(r.rtc, false);
      }
    };
    s.on('live:viewers', onViewers);
    s.on('live:comment', onComment);
    s.on('live:gift', onGift);
    s.on('live:enter', onEnter);
    s.on('live:like', onLike);
    s.on('live:seats', onSeats);
    s.on('live:ended', onEnded);
    s.on('live:kicked-seat', onKicked);
    // Qonaqlar və PK
    const onGuests = (p: { guests: Guest[] }) => setGuests(p.guests);
    const onGuestReq = () => { setRequests((n) => n + 1); toast(t('livePanel.newRequest'), 'info'); };
    const onGuestInvite = (p: { kind: 'AUDIO' | 'VIDEO'; host: PublicUser }) => {
      Alert.alert(t('livePanel.invited', { name: p.host.name }), '', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('livePanel.join'), onPress: () => void joinAsGuest() },
      ]);
    };
    const onGuestJoined = async (p: { kind: 'AUDIO' | 'VIDEO'; rtc: RtcCreds }) => {
      const ok = await rtc.requestAvPermissions(p.kind === 'VIDEO');
      if (ok) rtc.setPublishing(p.rtc, true, p.kind === 'VIDEO');
      setRequested(false);
    };
    const onGuestRemoved = () => { if (creds) rtc.setPublishing(creds, false); };
    const onPk = (p: PkState) => setPk(p);
    // PK bitəndə nəticə 8 saniyə görünür, sonra zolaq gizlənir
    const onPkEnd = (p: PkState) => { setPk(p); setTimeout(() => setPk((cur) => (cur?.id === p.id && cur.status === 'ENDED' ? null : cur)), 8000); };
    const onPkDeclined = (p: { expired?: boolean }) => { if (p?.expired) toast(t('errors.PK_EXPIRED'), 'info'); };
    s.on('pk:declined', onPkDeclined);
    const onPkInvite = (p: { battleId: string; from: PublicUser }) => {
      Alert.alert(t('pk.invited', { name: p.from.name }), t('pk.rules'), [
        { text: t('pk.decline'), style: 'cancel', onPress: () => void api(`/pk/${p.battleId}/decline`, { body: {} }).catch(() => {}) },
        { text: t('pk.accept'), onPress: () => void api(`/pk/${p.battleId}/accept`, { body: {} }).catch((e) => toast(errorText(e), 'error')) },
      ]);
    };
    s.on('live:guests', onGuests);
    s.on('live:guest-request', onGuestReq);
    s.on('live:guest-invite', onGuestInvite);
    s.on('live:guest-joined', onGuestJoined);
    s.on('live:guest-removed', onGuestRemoved);
    s.on('pk:start', onPk);
    s.on('pk:score', onPk);
    s.on('pk:end', onPkEnd);
    s.on('pk:invite', onPkInvite);
    return () => {
      s.off('live:guests', onGuests);
      s.off('live:guest-request', onGuestReq);
      s.off('live:guest-invite', onGuestInvite);
      s.off('live:guest-joined', onGuestJoined);
      s.off('live:guest-removed', onGuestRemoved);
      s.off('pk:start', onPk);
      s.off('pk:score', onPk);
      s.off('pk:end', onPkEnd);
      s.off('pk:invite', onPkInvite);
      s.off('live:viewers', onViewers);
      s.off('live:comment', onComment);
      s.off('live:gift', onGift);
      s.off('live:enter', onEnter);
      s.off('live:like', onLike);
      s.off('live:seats', onSeats);
      s.off('live:ended', onEnded);
      s.off('live:kicked-seat', onKicked);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('pk:declined', onPkDeclined);
    };
  }, [sock, id, me?.id, creds, pushLine, t, toast]);

  // Bəyənmələri toplu göndər (şəbəkəni yükləməmək üçün)
  useEffect(() => {
    const i = setInterval(() => {
      if (likeBatch.current > 0) {
        getSocket()?.emit('live:like', { roomId: id, count: likeBatch.current });
        likeBatch.current = 0;
      }
    }, 1500);
    return () => clearInterval(i);
  }, [id]);

  async function joinAsGuest() {
    try {
      const r = await api<{ rtc?: RtcCreds }>(`/live/${id}/guests/accept`, { body: {} });
      if (r.rtc) {
        const ok = await rtc.requestAvPermissions(false);
        if (ok) rtc.setPublishing(r.rtc, true);
      }
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  async function requestJoin() {
    tap();
    try {
      await api(`/live/${id}/guests/request`, { body: {} });
      setRequested(true);
      toast(t('livePanel.requestSent'), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  function sendComment(preset?: string) {
    const v = (preset ?? text).trim();
    if (!v) return;
    tap();
    getSocket()?.emit('live:comment', { roomId: id, text: v });
    setSaidHi(true);
    if (!preset) setText('');
  }

  /** Videoya iki dəfə toxunmaq — bəyənmə (TikTok/Bigo kimi) */
  function onStageTap() {
    const n = Date.now();
    if (n - lastTap.current < 300 && !isHost) {
      hearts.current?.burst(2);
      likeBatch.current += 1;
      lastTap.current = 0;
    } else lastTap.current = n;
  }

  async function toggleSeat(seat: Seat) {
    if (!room) return;
    // Oturacaqdakı başqa istifadəçiyə toxunanda — ona hədiyyə
    if (seat.user && seat.user.id !== me?.id) {
      setGiftTo(seat.user);
      setGiftOpen(true);
      return;
    }
    if (isHost) return;
    try {
      if (seat.user?.id === me?.id) {
        const r = await api<{ rtc: RtcCreds }>(`/live/${id}/seat/leave`, { body: {} });
        rtc.setPublishing(r.rtc, false);
      } else if (!seat.user) {
        const r = await api<{ rtc: RtcCreds }>(`/live/${id}/seat`, { body: { seat: seat.seat } });
        const ok = await rtc.requestAvPermissions(false);
        if (ok) rtc.setPublishing(r.rtc, true);
      }
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  function endLive() {
    Alert.alert(t('live.endConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('live.end'),
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await api<{ summary: Summary }>(`/live/${id}/end`, { body: {} });
            rtc.leave();
            setSummary(r.summary);
          } catch (e) {
            toast(errorText(e), 'error');
          }
        },
      },
    ]);
  }

  async function follow() {
    if (!room) return;
    setFollowing(true);
    await api(`/users/${room.hostId}/follow`, { body: {} }).catch(() => setFollowing(false));
  }

  async function quickGift(giftId: string) {
    if (!room) return;
    tap();
    const g = useStore.getState().gifts.find((x) => x.id === giftId);
    if (g && (me?.coins ?? 0) < g.price) {
      toast(t('errors.INSUFFICIENT_COINS'), 'error');
      router.push('/wallet');
      return;
    }
    try {
      const r = await api<{ coins: number }>('/gifts/send', { body: { giftId, receiverId: room.hostId, count: 1, context: 'LIVE', contextId: room.id } });
      patchMe({ coins: r.coins });
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  if (!room) return <View style={{ flex: 1, backgroundColor: colors.night }}><Loader full night /></View>;
  const Surface = rtc.RtcSurfaceView;
  const voice = room.type === 'VOICE';
  const night = true;
  const hostSeat = seats.find((x) => x.seat === 0);
  const guestSeats = seats.filter((x) => x.seat !== 0);

  const seatView = (s: Seat, big?: boolean) => {
    const talking = !!s.user && speaking.has(s.user.id === me?.id ? 0 : s.user.shortId);
    const size = big ? 84 : 60;
    return (
      <Pressable key={s.seat} onPress={() => void toggleSeat(s)} style={[styles.seat, big && { width: 120, gap: 14 }]}>
        <View style={[styles.seatDisc, { width: size + 8, height: size + 8, borderRadius: size }, talking && { backgroundColor: colors.online }, big && { backgroundColor: talking ? colors.online : colors.coin }]}>
          {s.user ? <Avatar uri={s.user.avatarUrl} name={s.user.name} size={size} ring={false} /> : (
            <View style={[styles.emptySeat, { width: size, height: size, borderRadius: size }]}><Icon name="micOutline" size={22} color={colors.nightMuted} /></View>
          )}
          {talking ? <View style={styles.talkTag}><Icon name="mic" size={10} color={colors.white} /></View> : null}
          {big ? <View style={styles.hostTag}><Text style={styles.hostTagText}>{t('tags.streamer')}</Text></View> : null}
        </View>
        <Text style={styles.seatName} numberOfLines={1}>{s.user ? s.user.name : `${t('live.seat')} ${s.seat}`}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar style="light" />
      {voice ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Səsli otaq fonu: nöqtəli "səhnə" naxışı */}
          {Array.from({ length: 14 }).map((_, r) => (
            <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: r ? 44 : 22 }}>
              {Array.from({ length: 8 }).map((__, c) => <View key={c} style={styles.dot} />)}
            </View>
          ))}
        </View>
      ) : isHost && Surface ? (
        <Surface style={StyleSheet.absoluteFill} canvas={{ uid: 0 }} />
      ) : hostUid != null && Surface ? (
        <Surface style={StyleSheet.absoluteFill} canvas={{ uid: hostUid }} />
      ) : (
        <>
          {room.coverUrl ? <Image source={{ uri: room.coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,13,12,0.35)', alignItems: 'center', justifyContent: 'center', gap: 14 }]}>
            <Avatar uri={room.host.avatarUrl} name={room.host.name} size={96} live />
            <Tag label={t('live.hostAway')} bg={colors.card} style={{ alignSelf: 'center', height: 26, paddingHorizontal: 10 }} />
          </View>
        </>
      )}

      {!voice ? <Pressable style={StyleSheet.absoluteFill} onPress={onStageTap} accessible={false} /> : null}
      <SafeAreaView edges={['top']} style={styles.top}>
        <View style={styles.hostPill}>
          <Avatar uri={room.host.avatarUrl} name={room.host.name} size={34} ring={false} />
          <View style={{ maxWidth: 104 }}>
            <Text style={styles.hostName} numberOfLines={1}>{room.host.name}</Text>
            <Pressable onPress={() => setUsersSheet('viewers')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="eye" size={10} color={colors.nightMuted} />
              <Text style={styles.hostSub}>{compact(viewers)}</Text>
            </Pressable>
          </View>
          {!isHost && !following ? (
            <Pressable onPress={follow} style={styles.follow}><Icon name="add" size={16} color={colors.white} /></Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={() => setUsersSheet(top.length ? 'top' : 'viewers')} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {top.slice(0, 3).map((g, i) => (
              <View key={g.user.id} style={{ marginLeft: i ? -8 : 0, zIndex: 3 - i }}>
                <Avatar uri={g.user.avatarUrl} name={g.user.name} size={30} ring={false} />
                <View style={[styles.rank, { backgroundColor: [colors.coin, colors.card, colors.brandSoft][i] }]}><Text style={styles.rankText}>{i + 1}</Text></View>
              </View>
            ))}
          </Pressable>
          {isHost ? <IconBtn name="stats" size={36} sh={0} bg={colors.glass} color={colors.white} badge={requests} style={{ marginLeft: 8 }} onPress={() => setPanel(true)} /> : null}
          <IconBtn name="share" size={36} sh={0} bg={colors.glass} color={colors.white} style={{ marginLeft: 8 }} onPress={() => void Share.share({ message: `${room.host.name} · ${room.title} — Simo ${WEB_URL}` })} />
          {!isHost ? <IconBtn name="flag" size={36} sh={0} bg={colors.glass} color={colors.white} style={{ marginLeft: 8 }} onPress={() => openReport({ targetUserId: room.host.id, targetType: 'LIVE', targetId: room.id })} /> : null}
          <IconBtn name="close" size={36} sh={0} bg={colors.glass} color={colors.white} style={{ marginLeft: 8 }} onPress={isHost ? endLive : () => router.back()} />
        </View>
      </SafeAreaView>
      <View style={[styles.subTop, { top: insets.top + 60 }]} pointerEvents="none">
        <Tag label={voice ? t('tags.voice') : t('tags.live')} icon={voice ? 'mic' : 'radio'} bg={colors.brand} fg={colors.white} />
        {room.title ? <GlassPill label={room.title} /> : null}
      </View>
      {pk && !voice ? <View style={[styles.pkWrap, { top: insets.top + 96 }]}><PkBar pk={pk} selfRoomId={room.id} /></View> : null}
      {!connUp && !ended ? (
        <View style={[styles.connBanner, { top: insets.top + (pk && !voice ? 170 : 96) }]} pointerEvents="none">
          <Text style={styles.connText}>{t('cl.liveReconnecting')}</Text>
        </View>
      ) : null}

      {voice ? (
        <View style={[styles.stage, { top: insets.top + 98 }]}>
          <View style={styles.stageCard}>
            {hostSeat ? seatView(hostSeat, true) : null}
            <View style={styles.seatGrid}>{guestSeats.map((s) => seatView(s))}</View>
          </View>
        </View>
      ) : null}

      {enter ? (
        <View style={styles.enterWrap} pointerEvents="none">
          <View style={[styles.enter, { backgroundColor: enter.user.vipTier !== 'NONE' ? vipColor(enter.user.vipTier).bg : colors.highlight }]}>
            {enter.user.vipTier !== 'NONE' ? <Icon name="crown" size={16} color={vipColor(enter.user.vipTier).fg} /> : <Icon name="sparkles" size={16} color={colors.ink} />}
            <Text style={[styles.enterText, { color: enter.user.vipTier !== 'NONE' ? vipColor(enter.user.vipTier).fg : colors.ink }]} numberOfLines={1}>
              {enter.user.vipTier !== 'NONE' ? t('live.vipEntered', { name: enter.user.name }) : t('live.entered', { name: enter.user.name })}
            </Text>
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView behavior="padding" style={styles.bottom}>
        {ticker ? <JoinTicker key={ticker.k} k={ticker.k} name={ticker.name} level={ticker.level} /> : null}
        <FlatList
          inverted
          data={lines}
          keyExtractor={(l) => l.id}
          style={{ maxHeight: voice ? 170 : 230, width: W * 0.74 }}
          contentContainerStyle={{ gap: 5 }}
          renderItem={({ item }) => (
            <Pressable
              disabled={item.kind !== 'comment' || item.user.id === me?.id}
              delayLongPress={350}
              onLongPress={() => openReport({ targetUserId: item.user.id, targetType: 'COMMENT', targetId: `live:${id}:${item.id}` })}
              style={[styles.line, night ? styles.lineNight : styles.lineDay, item.kind === 'gift' && { backgroundColor: colors.coin }, item.kind === 'enter' && { opacity: 0.85 }]}
            >
              <LevelBadge kind="wealth" level={item.user.wealthLevel} />
              <Text style={[styles.lineText, { color: night && item.kind !== 'gift' ? colors.nightText : colors.ink }]}>
                {item.kind === 'enter' ? null : <Text style={{ fontFamily: fonts.black, color: item.kind === 'gift' ? colors.ink : item.user.vipTier !== 'NONE' ? colors.coin : night ? colors.highlight : colors.brand }}>{item.user.name}  </Text>}
                {item.text}
              </Text>
            </Pressable>
          )}
        />
        {!isHost && !saidHi ? (
          <View style={styles.hiRow}>
            {(t('cl.quickHi', { returnObjects: true }) as string[]).map((h) => (
              <Pressable key={h} onPress={() => sendComment(h)} style={styles.hiChip}><Text style={styles.hiText}>{h}</Text></Pressable>
            ))}
          </View>
        ) : null}
        {!isHost ? (
          <View style={styles.quick}>
            {QUICK.map((g) => (
              <Pressable key={g} onPress={() => void quickGift(g)} style={styles.qg}>
                <GiftIcon id={g} size={26} />
              </Pressable>
            ))}
            <Text style={[styles.quickHint, { color: night ? colors.nightMuted : colors.textMuted }]}>{t('chat.quickGifts')}</Text>
          </View>
        ) : null}
        <SafeAreaView edges={['bottom']} style={styles.inputRow}>
          <View style={[styles.inputBox, night && { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
            <TextInput value={text} onChangeText={setText} onSubmitEditing={() => sendComment()} placeholder={t('live.commentPlaceholder')} placeholderTextColor={night ? colors.nightMuted : colors.textDim} style={[styles.input, { color: night ? colors.nightText : colors.ink }]} returnKeyType="send" maxLength={200} blurOnSubmit={false} />
            {text.trim() ? (
              <Pressable onPress={() => sendComment()} hitSlop={8} accessibilityLabel={t('cl.sendComment')} style={styles.sendBtn}>
                <Icon name="send" size={16} color={colors.white} />
              </Pressable>
            ) : null}
          </View>
          {isHost ? (
            <>
              {!voice ? (
                <>
                  <IconBtn name="flip" size={42} sh={2} onPress={() => rtc.controls.flip()} />
                  <IconBtn name="beauty" size={42} sh={2} bg={beauty ? colors.highlight : colors.card} onPress={() => { rtc.controls.beauty(!beauty); setBeauty(!beauty); }} />
                </>
              ) : null}
              <IconBtn name={muted ? 'micOff' : 'mic'} size={42} sh={2} bg={muted ? colors.ink : colors.card} color={muted ? colors.bg : colors.ink} onPress={() => { rtc.controls.mute(!muted); setMuted(!muted); }} />
            </>
          ) : (
            <>
              {!voice ? <IconBtn name={requested ? 'time' : 'userAdd'} size={42} sh={2} bg={requested ? colors.highlight : colors.card} onPress={requested ? undefined : () => void requestJoin()} /> : null}
              <IconBtn name="heart" size={42} sh={2} color={colors.brand} onPress={() => { hearts.current?.burst(1); likeBatch.current += 1; }} />
              <IconBtn name="gift" size={48} sh={3} bg={colors.coin} onPress={() => setGiftOpen(true)} />
            </>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      <Hearts ref={hearts} />
      <GiftOverlay ref={overlay} />
      {!isHost || giftTo ? <GiftSheet visible={giftOpen} onClose={() => { setGiftOpen(false); setGiftTo(null); }} receiverId={giftTo?.id ?? room.hostId} receiverName={giftTo?.name ?? room.host.name} context="LIVE" contextId={room.id} /> : null}
      {isHost ? <HostPanel visible={panel} onClose={() => { setPanel(false); setRequests(0); }} roomId={room.id} video={room.type === 'VIDEO'} /> : null}
      <LiveUsersSheet
        visible={!!usersSheet}
        initialTab={usersSheet ?? 'viewers'}
        onClose={() => setUsersSheet(null)}
        roomId={room.id}
        top={top}
        onOpenUser={(u) => { setUsersSheet(null); router.push({ pathname: '/user/[id]', params: { id: u.id } }); }}
      />
      <GuestStrip guests={guests} canKick={isHost} onKick={(uid) => void api(`/live/${id}/guests/remove`, { body: { userId: uid } }).catch(() => {})} />

      <Modal visible={ended || !!summary} transparent animationType="fade">
        <View style={styles.endWrap}>
          <Box r={28} sh={6} bg={colors.bg} style={{ alignSelf: 'stretch' }} inner={styles.endCard}>
            <Avatar uri={room.host.avatarUrl} name={room.host.name} size={76} />
            <T v="h2" center>{summary ? t('live.summary') : t('live.ended')}</T>
            {summary ? (
              <View style={styles.stats}>
                {([
                  [t('live.duration'), duration(summary.durationSec), colors.card],
                  [t('live.peak'), String(summary.peakViewers), colors.brandSoft],
                  [t('live.earned'), `💎 ${fmtAlmaz(summary.diamonds)}`, colors.diamondSoft],
                  [t('live.likes'), compact(summary.likes), colors.coinSoft],
                ] as const).map(([k, v, bg]) => (
                  <Box key={k} r={16} sh={0} bg={bg} style={{ width: '47%' }} inner={styles.stat}>
                    <T v="num">{v}</T>
                    <T v="tiny" color={colors.textMuted}>{k}</T>
                  </Box>
                ))}
              </View>
            ) : !isHost && !following ? (
              <Btn full={false} size="md" kind="primary" title={t('common.follow')} icon="add" onPress={follow} />
            ) : null}
            <Btn kind="dark" title={t('common.close')} onPress={() => router.back()} />
          </Box>
        </View>
      </Modal>
    </View>
  );
}

const QUICK = ['rose', 'heart', 'kiss', 'pomegranate'];

const styles = StyleSheet.create({
  pkWrap: { position: 'absolute', left: 14, right: 14 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6, gap: 8 },
  hostPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.glass, borderRadius: 24, padding: 3, paddingRight: 5, height: 46 },
  hostName: { color: colors.white, fontFamily: fonts.black, fontSize: 13 },
  hostSub: { color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 11 },
  follow: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  rank: { position: 'absolute', bottom: -4, right: -3, width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: fonts.black, fontSize: 8, color: colors.ink },
  subTop: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  stage: { position: 'absolute', left: 14, right: 14 },
  stageShadow: { position: 'absolute', left: 5, top: 5, right: -5, bottom: -5, borderRadius: 28, backgroundColor: colors.ink },
  stageCard: { backgroundColor: colors.night2, borderRadius: 32, paddingVertical: 20, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(205,184,255,0.16)' },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 14, marginTop: 16, paddingHorizontal: 4 },
  seat: { width: (W - 40) / 4, alignItems: 'center', gap: 6 },
  seatDisc: { backgroundColor: colors.night3, alignItems: 'center', justifyContent: 'center' },
  emptySeat: { backgroundColor: colors.night3, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(247,242,236,0.22)' },
  talkTag: { position: 'absolute', bottom: -4, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.online, alignItems: 'center', justifyContent: 'center' },
  hostTag: { position: 'absolute', bottom: -9, backgroundColor: colors.coin, borderRadius: 6, paddingHorizontal: 6, height: 17, justifyContent: 'center' },
  hostTagText: { color: colors.ink, fontFamily: fonts.black, fontSize: 9, letterSpacing: 0.6 },
  seatName: { color: colors.nightText, fontFamily: fonts.bold, fontSize: 11.5, maxWidth: W / 4 - 12 },
  enterWrap: { position: 'absolute', top: '44%', left: 14, right: 14 },
  enter: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 14, height: 40, borderRadius: 20 },
  enterText: { fontFamily: fonts.black, fontSize: 13, maxWidth: W - 90 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, maxWidth: '100%' },
  lineNight: { backgroundColor: 'rgba(15,13,12,0.55)' },
  lineDay: { backgroundColor: colors.card },
  lineText: { fontSize: 13, fontFamily: fonts.medium, flexShrink: 1 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  qg: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.coinSoft, alignItems: 'center', justifyContent: 'center' },
  quickHint: { fontFamily: fonts.semibold, fontSize: 11, marginLeft: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  inputBox: { flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 5 },
  input: { flex: 1, minWidth: 0, ...webNoOutline, fontFamily: fonts.medium, fontSize: 14 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  hiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  hiChip: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, paddingHorizontal: 10, height: 28, justifyContent: 'center' },
  hiText: { color: colors.white, fontFamily: fonts.bold, fontSize: 12.5 },
  connBanner: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(16,14,13,0.75)', borderRadius: 14, paddingHorizontal: 14, height: 30, justifyContent: 'center' },
  connText: { color: colors.white, fontFamily: fonts.bold, fontSize: 12.5 },
  endWrap: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
  endCard: { padding: 22, alignItems: 'center', gap: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignSelf: 'stretch' },
  stat: { padding: 12, alignItems: 'center', gap: 2 },
});
