import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radius, vipGradient } from '@/theme';
import { GradientButton, Loader } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { LevelBadge } from '@/components/Badges';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { Hearts, type HeartsHandle } from '@/components/Hearts';
import { api } from '@/lib/api';
import { compact, duration, errorText, giftName } from '@/lib/format';
import { getSocket } from '@/lib/socket';
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
  useKeepAwake();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, toast } = useStore();
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
        const r = await api<{ room: Room; isHost: boolean; isFollowing: boolean; rtc: RtcCreds | null; seats: Seat[]; topGifters: { user: PublicUser; coins: number }[] }>(`/live/${id}`);
        if (!alive) return;
        setRoom(r.room);
        setIsHost(r.isHost);
        setFollowing(r.isFollowing);
        setSeats(r.seats);
        setTop(r.topGifters);
        setViewers(r.room.viewerCount);
        if (r.room.status !== 'LIVE' || !r.rtc) {
          setEnded(true);
          return;
        }
        setCreds(r.rtc);
        setHostUid(r.isHost ? null : r.room.host.shortId);
        const s = getSocket();
        s?.emit('live:join', { roomId: id }, (ack: { ok: boolean }) => {
          if (!ack?.ok) setEnded(true);
        });
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
    const s = getSocket();
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
      }
    };
    const onLike = (p: { count: number }) => hearts.current?.burst(Math.min(3, p.count));
    const onSeats = (p: { seats: Seat[] }) => setSeats(p.seats);
    const onEnded = () => setEnded(true);
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
    return () => {
      s.off('live:viewers', onViewers);
      s.off('live:comment', onComment);
      s.off('live:gift', onGift);
      s.off('live:enter', onEnter);
      s.off('live:like', onLike);
      s.off('live:seats', onSeats);
      s.off('live:ended', onEnded);
      s.off('live:kicked-seat', onKicked);
    };
  }, [id, me?.id, creds, pushLine, t]);

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

  function sendComment() {
    const v = text.trim();
    if (!v) return;
    getSocket()?.emit('live:comment', { roomId: id, text: v });
    setText('');
  }

  async function toggleSeat(seat: Seat) {
    if (!room || isHost) return;
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

  if (!room) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loader full /></View>;
  const Surface = rtc.RtcSurfaceView;
  const voice = room.type === 'VOICE';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {voice ? (
        <LinearGradient colors={['#3A1366', '#1E0B35', '#12071F']} style={StyleSheet.absoluteFill} />
      ) : isHost && Surface ? (
        <Surface style={StyleSheet.absoluteFill} canvas={{ uid: 0 }} />
      ) : hostUid != null && Surface ? (
        <Surface style={StyleSheet.absoluteFill} canvas={{ uid: hostUid }} />
      ) : (
        <>
          {room.coverUrl ? <Image source={{ uri: room.coverUrl }} style={StyleSheet.absoluteFill} blurRadius={8} /> : null}
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: colors.textMuted }}>{t('live.hostAway')}</Text>
          </View>
        </>
      )}
      <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']} locations={[0, 0.2, 0.6, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <SafeAreaView edges={['top']} style={styles.top}>
        <View style={styles.hostPill}>
          <Avatar uri={room.host.avatarUrl} name={room.host.name} size={36} />
          <View style={{ maxWidth: 110 }}>
            <Text style={styles.hostName} numberOfLines={1}>{room.host.name}</Text>
            <Text style={styles.hostSub}>{t('live.viewers', { n: compact(viewers) })}</Text>
          </View>
          {!isHost && !following ? (
            <Pressable onPress={follow}>
              <LinearGradient colors={gradients.primary} style={styles.follow}><Icon name="add" size={16} /></LinearGradient>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end' }}>
          {top.slice(0, 3).map((g) => <Avatar key={g.user.id} uri={g.user.avatarUrl} name={g.user.name} size={30} vipTier={g.user.vipTier} />)}
          <Pressable onPress={isHost ? endLive : () => router.back()} style={styles.close}><Icon name="close" size={22} /></Pressable>
        </View>
      </SafeAreaView>
      {room.title ? <Text style={styles.title} numberOfLines={1}>{room.title}</Text> : null}

      {voice ? (
        <View style={styles.seats}>
          {seats.map((s) => {
            const talking = s.user && speaking.has(s.user.id === me?.id ? 0 : s.user.shortId);
            return (
              <Pressable key={s.seat} onPress={() => void toggleSeat(s)} style={styles.seat}>
                <View style={[styles.seatRing, talking && { borderColor: colors.online, shadowColor: colors.online, shadowOpacity: 0.9, shadowRadius: 10 }, s.seat === 0 && { borderColor: colors.gold }]}>
                  {s.user ? <Avatar uri={s.user.avatarUrl} name={s.user.name} size={62} /> : <Icon name="mic" size={24} color={colors.textDim} />}
                </View>
                <Text style={styles.seatName} numberOfLines={1}>{s.user ? s.user.name : `${s.seat + 1}`}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {enter ? (
        <LinearGradient colors={enter.user.vipTier !== 'NONE' ? vipGradient(enter.user.vipTier) : gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.enter}>
          <Text style={{ color: enter.user.vipTier !== 'NONE' ? '#2B1745' : '#fff', fontWeight: '900' }}>
            {enter.user.vipTier !== 'NONE' ? t('live.vipEntered', { name: enter.user.name }) : t('live.entered', { name: enter.user.name })}
          </Text>
        </LinearGradient>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom}>
        <FlatList
          inverted
          data={lines}
          keyExtractor={(l) => l.id}
          style={{ maxHeight: 220, width: W * 0.72 }}
          contentContainerStyle={{ gap: 5 }}
          renderItem={({ item }) => (
            <View style={[styles.line, item.kind === 'gift' && { backgroundColor: 'rgba(255,77,141,0.35)' }]}>
              <LevelBadge kind="wealth" level={item.user.wealthLevel} />
              <Text style={styles.lineText}>
                <Text style={{ color: item.user.vipTier !== 'NONE' ? colors.gold : colors.peach, fontWeight: '800' }}>{item.user.name}: </Text>
                {item.text}
              </Text>
            </View>
          )}
        />
        <SafeAreaView edges={['bottom']} style={styles.inputRow}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={sendComment} placeholder={t('live.commentPlaceholder')} placeholderTextColor="rgba(255,255,255,0.6)" style={styles.input} returnKeyType="send" maxLength={200} />
          {isHost ? (
            <>
              {!voice ? (
                <>
                  <Pressable onPress={() => rtc.controls.flip()} style={styles.roundBtn}><Icon name="flip" size={20} /></Pressable>
                  <Pressable onPress={() => { rtc.controls.beauty(!beauty); setBeauty(!beauty); }} style={[styles.roundBtn, beauty && { backgroundColor: colors.orchid }]}><Icon name="beauty" size={20} /></Pressable>
                </>
              ) : null}
              <Pressable onPress={() => { rtc.controls.mute(!muted); setMuted(!muted); }} style={styles.roundBtn}><Icon name={muted ? 'micOff' : 'mic'} size={20} /></Pressable>
            </>
          ) : (
            <>
              <Pressable onPress={() => { hearts.current?.burst(1); likeBatch.current += 1; }} style={styles.roundBtn}><Icon name="heart" size={22} color={colors.rose} /></Pressable>
              <Pressable onPress={() => setGiftOpen(true)}>
                <LinearGradient colors={gradients.primary} style={styles.roundBtn}><Icon name="gift" size={22} /></LinearGradient>
              </Pressable>
            </>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      <Hearts ref={hearts} />
      <GiftOverlay ref={overlay} />
      {!isHost ? <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={room.hostId} context="LIVE" contextId={room.id} /> : null}

      <Modal visible={ended || !!summary} transparent animationType="fade">
        <View style={styles.endWrap}>
          <View style={styles.endCard}>
            <Avatar uri={room.host.avatarUrl} name={room.host.name} size={80} />
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{summary ? t('live.summary') : t('live.ended')}</Text>
            {summary ? (
              <View style={styles.stats}>
                {[
                  [t('live.duration'), duration(summary.durationSec)],
                  [t('live.peak'), String(summary.peakViewers)],
                  [t('live.earned'), `💎 ${summary.diamonds}`],
                  [t('live.likes'), compact(summary.likes)],
                ].map(([k, v]) => (
                  <View key={k} style={styles.stat}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{v}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{k}</Text>
                  </View>
                ))}
              </View>
            ) : !isHost && !following ? (
              <GradientButton small title={t('common.follow')} icon="add" onPress={follow} />
            ) : null}
            <GradientButton title={t('common.close')} onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 6, gap: 8 },
  hostPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 26, padding: 4, paddingRight: 8 },
  hostName: { color: '#fff', fontWeight: '800', fontSize: 13 },
  hostSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  follow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  title: { position: 'absolute', top: 104, left: 16, color: '#fff', fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden', maxWidth: W - 32 },
  seats: { position: 'absolute', top: 150, left: 0, right: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 18 },
  seat: { width: W / 4, alignItems: 'center', gap: 6 },
  seatRing: { width: 70, height: 70, borderRadius: 35, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  seatName: { color: '#fff', fontSize: 12, maxWidth: W / 4 - 10 },
  enter: { position: 'absolute', top: '42%', left: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, maxWidth: '100%' },
  lineText: { color: '#fff', fontSize: 13, flexShrink: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  input: { flex: 1, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff', paddingHorizontal: 16 },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  endWrap: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  endCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.xl, padding: 24, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.border },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  stat: { width: '45%', backgroundColor: colors.surface2, borderRadius: radius.md, padding: 12, alignItems: 'center', gap: 2 },
});
