import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '../theme';
import { api } from '../lib/api';
import { compact, duration, errorText } from '../lib/format';
import { useStore } from '../store';
import type { PublicUser } from '../lib/types';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { Btn, T, tap } from './ui';
import { CoinIcon, DiamondIcon } from './GiftIcon';

export interface PkState {
  id: string; status: 'PENDING' | 'ACTIVE' | 'ENDED' | 'DECLINED'; endsAt: string | null; winnerId: string | null;
  a: { roomId: string; host: PublicUser | null; score: number };
  b: { roomId: string; host: PublicUser | null; score: number };
}
export interface Guest { user: PublicUser; kind: 'AUDIO' | 'VIDEO'; uid: number }

/** PK döyüşü paneli: iki host, xal zolağı, geri sayım; bitəndə qalib */
export function PkBar({ pk }: { pk: PkState }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const total = pk.a.score + pk.b.score;
  const ratio = total ? pk.a.score / total : 0.5;
  const w = useRef(new Animated.Value(ratio)).current;
  useEffect(() => { Animated.spring(w, { toValue: ratio, useNativeDriver: false, friction: 7 }).start(); }, [ratio, w]);
  const left = pk.endsAt ? Math.max(0, Math.round((new Date(pk.endsAt).getTime() - now) / 1000)) : 0;
  const ended = pk.status === 'ENDED';
  return (
    <View style={styles.pk}>
      <View style={styles.pkHead}>
        <Avatar uri={pk.a.host?.avatarUrl} name={pk.a.host?.name} size={28} ring={false} />
        <View style={styles.pkBadge}><Icon name="thunder" size={12} color={colors.ink} /><Text style={styles.pkBadgeText}>{ended ? t('pk.ended') : `PK ${duration(left)}`}</Text></View>
        <Avatar uri={pk.b.host?.avatarUrl} name={pk.b.host?.name} size={28} ring={false} />
      </View>
      <View style={styles.pkTrack}>
        <Animated.View style={[styles.pkA, { width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        <Text style={[styles.pkScore, { left: 8 }]}>{compact(pk.a.score)}</Text>
        <Text style={[styles.pkScore, { right: 8 }]}>{compact(pk.b.score)}</Text>
      </View>
      {ended && pk.winnerId ? <Text style={styles.pkWin}>🏆 {pk.winnerId === pk.a.host?.id ? pk.a.host?.name : pk.b.host?.name}</Text> : null}
    </View>
  );
}

/** Yayına qoşulan qonaqlar (sağda kiçik plitələr) */
export function GuestStrip({ guests, canKick, onKick }: { guests: Guest[]; canKick: boolean; onKick: (id: string) => void }) {
  if (!guests.length) return null;
  return (
    <View style={styles.guests}>
      {guests.map((g) => (
        <Pressable key={g.user.id} disabled={!canKick} onLongPress={() => onKick(g.user.id)} style={styles.guest}>
          <Avatar uri={g.user.avatarUrl} name={g.user.name} size={52} ring={false} />
          <View style={styles.guestKind}><Icon name={g.kind === 'VIDEO' ? 'videocam' : 'mic'} size={10} color={colors.white} /></View>
          <Text style={styles.guestName} numberOfLines={1}>{g.user.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

interface Stats { durationSec: number; viewers: number; peakViewers: number; likes: number; giftsCoins: number; diamonds: number; gifts: number; topGifters: { user: PublicUser; coins: number }[]; guestRequests: PublicUser[] }
interface LiveRoomLite { id: string; type: 'VIDEO' | 'VOICE'; title: string; viewerCount: number; host: PublicUser }

/** Hostun yayın paneli: canlı statistika, qonaq sorğuları, PK dəvəti */
export function HostPanel({ visible, onClose, roomId, video }: { visible: boolean; onClose: () => void; roomId: string; video: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const toast = useStore((s) => s.toast);
  const [s, setS] = useState<Stats | null>(null);
  const [lives, setLives] = useState<LiveRoomLite[]>([]);
  const load = () => {
    void api<Stats>(`/live/${roomId}/stats`).then(setS).catch(() => {});
    if (video) void api<{ items: LiveRoomLite[] }>('/live?tab=popular').then((r) => setLives(r.items.filter((x) => x.type === 'VIDEO' && x.id !== roomId))).catch(() => {});
  };
  useEffect(() => {
    if (!visible) return;
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, roomId]);
  async function act(fn: () => Promise<unknown>, ok?: string) {
    tap();
    try { await fn(); if (ok) toast(ok, 'success'); load(); } catch (e) { toast(errorText(e), 'error'); }
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grip} />
        <Text style={styles.sheetTitle}>{t('livePanel.title')}</Text>
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 14 }}>
          <View style={styles.stats}>
            {([
              ['time', s ? duration(s.durationSec) : '—', t('live.duration')],
              ['eye', s ? compact(s.viewers) : '—', t('livePanel.viewers')],
              ['heart', s ? compact(s.likes) : '—', t('live.likes')],
              ['gift', s ? compact(s.gifts) : '—', t('livePanel.gifts')],
            ] as const).map(([ic, v, k]) => (
              <View key={k} style={styles.stat}><Icon name={ic} size={16} color={colors.textMuted} /><Text style={styles.statNum}>{v}</Text><T v="tiny" color={colors.textMuted}>{k}</T></View>
            ))}
          </View>
          <View style={styles.earned}>
            <View style={styles.earnedItem}><CoinIcon size={22} /><Text style={styles.earnedNum}>{compact(s?.giftsCoins ?? 0)}</Text><T v="tiny" color={colors.nightMuted}>{t('livePanel.giftsValue')}</T></View>
            <View style={styles.earnedItem}><DiamondIcon size={22} /><Text style={styles.earnedNum}>{compact(s?.diamonds ?? 0)}</Text><T v="tiny" color={colors.nightMuted}>{t('livePanel.earned')}</T></View>
          </View>
          {video ? (
            <View style={{ gap: 8 }}>
              <T v="label" color={colors.textMuted}>{t('livePanel.requests')}</T>
              {s?.guestRequests.length ? s.guestRequests.map((u) => (
                <View key={u.id} style={styles.row}>
                  <Avatar uri={u.avatarUrl} name={u.name} size={36} ring={false} />
                  <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{u.name}</T>
                  <Btn full={false} size="sm" kind="light" title={t('livePanel.audio')} icon="mic" onPress={() => void act(() => api(`/live/${roomId}/guests/accept`, { body: { userId: u.id, kind: 'AUDIO' } }))} />
                  <Btn full={false} size="sm" title={t('livePanel.video')} icon="videocam" onPress={() => void act(() => api(`/live/${roomId}/guests/accept`, { body: { userId: u.id, kind: 'VIDEO' } }))} />
                </View>
              )) : <T v="small" color={colors.textDim}>{t('livePanel.noRequests')}</T>}
            </View>
          ) : null}
          {video ? (
            <View style={{ gap: 8 }}>
              <T v="label" color={colors.textMuted}>{t('pk.invite')}</T>
              {lives.length ? lives.slice(0, 8).map((l) => (
                <View key={l.id} style={styles.row}>
                  <Avatar uri={l.host.avatarUrl} name={l.host.name} size={36} live />
                  <View style={{ flex: 1 }}><T v="bodyStrong" numberOfLines={1}>{l.host.name}</T><T v="tiny" color={colors.textMuted}>👁 {compact(l.viewerCount)}</T></View>
                  <Btn full={false} size="sm" kind="dark" icon="thunder" title="PK" onPress={() => void act(() => api(`/live/${roomId}/pk/invite`, { body: { targetRoomId: l.id } }), t('pk.sent'))} />
                </View>
              )) : <T v="small" color={colors.textDim}>{t('pk.noLives')}</T>}
            </View>
          ) : null}
          {s?.topGifters.length ? (
            <View style={{ gap: 8 }}>
              <T v="label" color={colors.textMuted}>{t('livePanel.top')}</T>
              {s.topGifters.map((g, i) => (
                <View key={g.user.id} style={styles.row}>
                  <Text style={styles.rank}>{i + 1}</Text>
                  <Avatar uri={g.user.avatarUrl} name={g.user.name} size={32} ring={false} />
                  <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{g.user.name}</T>
                  <CoinIcon size={16} /><Text style={styles.rowNum}>{compact(g.coins)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pk: { backgroundColor: colors.glass, borderRadius: radius.md, padding: 8, gap: 6 },
  pkHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pkBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.coin, borderRadius: 12, paddingHorizontal: 10, height: 24 },
  pkBadgeText: { ...noPad, fontFamily: fonts.black, fontSize: 12, lineHeight: 15, color: colors.ink },
  pkTrack: { height: 22, borderRadius: 11, backgroundColor: colors.diamond, overflow: 'hidden', justifyContent: 'center' },
  pkA: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.brand },
  pkScore: { ...noPad, position: 'absolute', fontFamily: fonts.black, fontSize: 12, lineHeight: 15, color: colors.white },
  pkWin: { ...noPad, textAlign: 'center', fontFamily: fonts.display, fontSize: 14, lineHeight: 18, color: colors.coin },
  guests: { position: 'absolute', right: 14, top: '28%', gap: 10 },
  guest: { alignItems: 'center', width: 62, gap: 3 },
  guestKind: { position: 'absolute', top: 36, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  guestName: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 13, maxWidth: 62 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 16 },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(26,21,18,0.18)', marginBottom: 12 },
  sheetTitle: { ...noPad, fontFamily: fonts.display, fontSize: 19, lineHeight: 24, color: colors.ink, marginBottom: 12 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', gap: 2 },
  statNum: { ...noPad, fontFamily: fonts.display, fontSize: 16, lineHeight: 21, color: colors.ink },
  earned: { flexDirection: 'row', gap: 10, backgroundColor: colors.night, borderRadius: radius.lg, padding: 14 },
  earnedItem: { flex: 1, alignItems: 'center', gap: 4 },
  earnedNum: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 22, lineHeight: 27, color: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rank: { ...noPad, width: 18, textAlign: 'center', fontFamily: fonts.black, fontSize: 13, lineHeight: 17, color: colors.textMuted },
  rowNum: { ...noPad, fontFamily: fonts.black, fontSize: 13, lineHeight: 17, color: colors.ink },
});
