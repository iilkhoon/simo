import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius, tintFor } from '@/theme';
import { Box, IconBtn, Loader, T, Tag, tap } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { GiftIcon } from '@/components/GiftIcon';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { CoinAmount, HostBadge, LevelBadge, VerifiedBadge } from '@/components/Badges';
import { Burst } from '@/components/Burst';
import { api, ApiError } from '@/lib/api';
import { clock, dayLabel, duration, errorText, giftName, timeAgo } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { pickImage } from '@/lib/media';
import { startCall } from '@/lib/calls';
import { useStore } from '@/store';
import type { GiftEvent, Message, PublicUser } from '@/lib/types';

interface ConvInfo {
  id: string; user: PublicUser; otherLastReadAt: string; blocked: boolean;
  pricing: { price: number; reason: 'FREE' | 'FIRST_FREE' | 'VIP_FREE' | 'PAID'; freeLeft: number };
}

type Row = { kind: 'msg'; m: Message; first: boolean; last: boolean } | { kind: 'day'; id: string; label: string };

const QUICK_GIFTS = ['rose', 'heart', 'kiss', 'tea'];
const GROUP_MS = 3 * 60 * 1000;

/** Mesajları gün ayırıcıları və ardıcıl qruplarla birləşdirir (inverted siyahı üçün: yenidən köhnəyə) */
function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const newer = messages[i - 1];
    const older = messages[i + 1];
    const t = new Date(m.createdAt).getTime();
    const sameAsOlder = older && older.senderId === m.senderId && older.type === m.type && t - new Date(older.createdAt).getTime() < GROUP_MS;
    const sameAsNewer = newer && newer.senderId === m.senderId && newer.type === m.type && new Date(newer.createdAt).getTime() - t < GROUP_MS;
    rows.push({ kind: 'msg', m, first: !sameAsOlder, last: !sameAsNewer });
    const dl = dayLabel(m.createdAt);
    if (!older || dayLabel(older.createdAt) !== dl) rows.push({ kind: 'day', id: `d_${m.id}`, label: dl });
  }
  return rows;
}

function CallRow({ m, mine, peerId }: { m: Message; mine: boolean; peerId: string }) {
  const { t } = useTranslation();
  let info: { type: string; status: string; durationSec: number } = { type: 'VOICE', status: 'ENDED', durationSec: 0 };
  try {
    info = JSON.parse(m.text);
  } catch {
    /* ignore */
  }
  const ok = info.status === 'ENDED';
  const label = ok ? `${info.type === 'VIDEO' ? t('chat.callVideo') : t('chat.callVoice')} · ${duration(info.durationSec)}` : info.status === 'MISSED' ? t('chat.missed') : info.status === 'REJECTED' ? t('chat.rejected') : t('chat.cancelled');
  return (
    <View style={[styles.callRow, mine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
      <View style={[styles.callIcon, { backgroundColor: ok ? colors.onlineSoft : colors.brandSoft }]}>
        <Icon name={info.type === 'VIDEO' ? 'videocam' : 'call'} size={16} color={colors.ink} />
      </View>
      <View>
        <Text style={styles.callLabel}>{label}</Text>
        <Text style={styles.callTime}>{clock(m.createdAt)}</Text>
      </View>
      <Pressable onPress={() => void startCall(peerId, info.type === 'VIDEO' ? 'VIDEO' : 'VOICE')} style={styles.callBack}>
        <Text style={styles.callBackText}>{t('chat.callBack')}</Text>
      </Pressable>
    </View>
  );
}

function Bubble({ m, mine, read, first, last }: { m: Message; mine: boolean; read: boolean; first: boolean; last: boolean }) {
  const gifts = useStore((s) => s.gifts);
  if (m.type === 'GIFT' && m.giftId) {
    const g = gifts.find((x) => x.id === m.giftId);
    return (
      <View style={[styles.row, mine && { justifyContent: 'flex-end' }]}>
        <Box r={20} sh={3} bg={mine ? colors.coinSoft : colors.card} inner={styles.giftCard}>
          <View style={{ alignItems: 'center', justifyContent: 'center', width: 96, height: 96 }}>
            <View style={{ position: 'absolute', zIndex: 0 }}><Burst size={96} color={mine ? colors.coin : colors.brandSoft} points={12} /></View>
            <View style={{ zIndex: 1 }}><GiftIcon id={m.giftId} size={60} /></View>
          </View>
          <Text style={styles.giftTitle}>{g ? giftName(g) : m.giftId} ×{m.text}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {g ? <CoinAmount n={g.price * (Number(m.text) || 1)} size={12} /> : null}
            <Text style={styles.metaDim}>{clock(m.createdAt)}</Text>
          </View>
        </Box>
      </View>
    );
  }
  const r = 20;
  const shape = mine
    ? { borderTopRightRadius: first ? r : 7, borderBottomRightRadius: last ? 4 : 7 }
    : { borderTopLeftRadius: first ? r : 7, borderBottomLeftRadius: last ? 4 : 7 };
  return (
    <View style={[styles.row, mine && { justifyContent: 'flex-end' }, { marginTop: first ? 8 : 2 }]}>
      <View style={[styles.bubbleWrap, last && { marginBottom: 3, marginRight: mine ? 3 : 0 }]}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs, { borderRadius: r }, shape, m.mediaUrl ? { padding: 4 } : null]}>
          {m.mediaUrl ? <Image source={{ uri: m.mediaUrl }} style={styles.img} contentFit="cover" /> : null}
          {m.text ? <Text style={[styles.text, mine && { color: colors.white }, m.mediaUrl ? { paddingHorizontal: 8, paddingTop: 4 } : null]}>{m.text}</Text> : null}
          <View style={[styles.metaRow, m.mediaUrl ? { paddingHorizontal: 8, paddingBottom: 4 } : null]}>
            {m.coinsCost ? <Text style={[styles.meta, mine && { color: 'rgba(255,255,255,0.8)' }]}>−{m.coinsCost}🪙</Text> : null}
            <Text style={[styles.meta, mine && { color: 'rgba(255,255,255,0.8)' }]}>{clock(m.createdAt)}</Text>
            {mine ? <Icon name={read ? 'check2' : 'checkmark'} size={13} color={read ? colors.highlight : 'rgba(255,255,255,0.8)'} /> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

/** Söhbətin başında: qarşı tərəfin profil kartı (inverted siyahının "footer"-i) */
function ProfilePeek({ u, myInterests }: { u: PublicUser; myInterests: string[] }) {
  const { t } = useTranslation();
  const shared = u.interests.filter((i) => myInterests.includes(i));
  return (
    <View style={{ alignItems: 'center', paddingVertical: 18, gap: 8 }}>
      <Box r={26} sh={5} bg={tintFor(u.name)} inner={{ width: 112, height: 136 }} style={{ transform: [{ rotate: '-3deg' }] }}>
        {u.avatarUrl ? <Image source={{ uri: u.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      </Box>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <T v="h2">{u.name}{u.age ? `, ${u.age}` : ''}</T>
        {u.verified ? <VerifiedBadge size={18} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {u.isHost ? <HostBadge /> : null}
        <LevelBadge level={u.charmLevel} kind="charm" />
        {u.city ? <Tag label={u.city} icon="location" bg={colors.card} /> : null}
      </View>
      {shared.length ? (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300 }}>
          {shared.slice(0, 4).map((i) => <Tag key={i} label={t(`interests.${i}`)} icon="heart" bg={colors.brandSoft} />)}
        </View>
      ) : null}
      <Text style={styles.safety}>🔒 {t('chat.safety')}</Text>
    </View>
  );
}

export default function Chat() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, toast, patchMe } = useStore();
  const [info, setInfo] = useState<ConvInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const overlay = useRef<GiftOverlayHandle>(null);
  const gifts = useStore((s) => s.gifts);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const loadInfo = useCallback(async () => {
    try {
      setInfo(await api<ConvInfo>(`/conversations/${id}`));
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }, [id, toast]);

  useEffect(() => {
    void loadInfo();
    void api<{ items: Message[] }>(`/conversations/${id}/messages?limit=50`).then((r) => setMessages(r.items.reverse())).catch(() => {});
    void api(`/conversations/${id}/read`, { body: {} }).catch(() => {});
  }, [id, loadInfo]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onMsg = (m: Message) => {
      if (m.conversationId !== id) return;
      setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [m, ...cur]));
      if (m.senderId !== me?.id) {
        setTyping(false);
        void api(`/conversations/${id}/read`, { body: {} }).catch(() => {});
      }
    };
    const onTyping = (p: { conversationId: string }) => {
      if (p.conversationId !== id) return;
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3500);
    };
    const onRead = (p: { conversationId: string; at: string }) => {
      if (p.conversationId === id) setInfo((x) => (x ? { ...x, otherLastReadAt: p.at } : x));
    };
    s.on('message:new', onMsg);
    s.on('typing', onTyping);
    s.on('chat:read', onRead);
    return () => {
      s.off('message:new', onMsg);
      s.off('typing', onTyping);
      s.off('chat:read', onRead);
    };
  }, [id, me?.id]);

  async function loadOlder() {
    const oldest = messages[messages.length - 1];
    if (!oldest) return;
    const r = await api<{ items: Message[] }>(`/conversations/${id}/messages?limit=40&before=${encodeURIComponent(oldest.createdAt)}`).catch(() => null);
    if (r?.items.length) setMessages((cur) => [...cur, ...r.items.reverse().filter((m) => !cur.some((c) => c.id === m.id))]);
  }

  async function send(payload: { type: 'TEXT' | 'IMAGE'; text?: string; mediaUrl?: string }) {
    if (!info) return;
    if (info.pricing.price > 0 && (me?.coins ?? 0) < info.pricing.price) {
      toast(t('errors.INSUFFICIENT_COINS'), 'error');
      router.push('/wallet');
      return;
    }
    setSending(true);
    try {
      const r = await api<{ message: Message; coins: number }>(`/conversations/${id}/messages`, { body: payload });
      setMessages((cur) => (cur.some((x) => x.id === r.message.id) ? cur : [r.message, ...cur]));
      patchMe({ coins: r.coins });
      if (payload.type === 'TEXT') setText('');
      void loadInfo();
    } catch (e) {
      toast(errorText(e), 'error');
      if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') router.push('/wallet');
    } finally {
      setSending(false);
    }
  }

  function onChange(v: string) {
    setText(v);
    if (info && Date.now() - lastTypingSent.current > 2500) {
      lastTypingSent.current = Date.now();
      getSocket()?.emit('typing', { conversationId: id, to: info.user.id });
    }
  }

  const rows = useMemo(() => buildRows(messages), [messages]);

  if (!info) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loader full /></View>;
  const u = info.user;
  const readAt = new Date(info.otherLastReadAt).getTime();
  const paid = info.pricing.reason === 'PAID';
  const hint =
    info.pricing.reason === 'FIRST_FREE' ? t('chat.firstFree')
      : info.pricing.reason === 'VIP_FREE' ? t('chat.vipFree', { n: info.pricing.freeLeft })
        : paid ? t('chat.msgPrice', { price: info.pricing.price }) : null;
  const icebreakers = (t('chat.icebreakers', { returnObjects: true }) as unknown as string[]) ?? [];
  const showIce = !info.blocked && messages.filter((m) => m.senderId === me?.id).length === 0;

  async function quickGift(giftId: string) {
    tap();
    const g = gifts.find((x) => x.id === giftId);
    if (g && (me?.coins ?? 0) < g.price) {
      toast(t('errors.INSUFFICIENT_COINS'), 'error');
      router.push('/wallet');
      return;
    }
    try {
      const r = await api<{ coins: number; event: GiftEvent }>('/gifts/send', { body: { giftId, receiverId: u.id, count: 1, context: 'CHAT', contextId: id } });
      patchMe({ coins: r.coins });
      overlay.current?.push(r.event);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <IconBtn name="back" size={40} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/chats'))} />
        <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } })} style={styles.who}>
          <Avatar uri={u.avatarUrl} name={u.name} size={40} online={u.online} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
              {u.verified ? <VerifiedBadge size={14} /> : null}
            </View>
            <Text style={[styles.status, (typing || u.online) && { color: colors.online }]} numberOfLines={1}>
              {typing ? t('chat.typing') : u.online ? t('common.online') : timeAgo(u.lastSeenAt)}
            </Text>
          </View>
        </Pressable>
        <IconBtn name="call" size={40} bg={colors.diamondSoft} onPress={() => void startCall(u.id, 'VOICE')} />
        <IconBtn name="videocam" size={40} bg={colors.brand} color={colors.white} onPress={() => void startCall(u.id, 'VIDEO')} />
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          inverted
          data={rows}
          keyExtractor={(r) => (r.kind === 'day' ? r.id : r.m.id)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          keyboardDismissMode="interactive"
          ListFooterComponent={<ProfilePeek u={u} myInterests={me?.interests ?? []} />}
          renderItem={({ item }) =>
            item.kind === 'day' ? (
              <View style={styles.day}><Text style={styles.dayText}>{item.label}</Text></View>
            ) : item.m.type === 'CALL' ? (
              <CallRow m={item.m} mine={item.m.senderId === me?.id} peerId={u.id} />
            ) : item.m.type === 'SYSTEM' ? (
              <Text style={styles.safety}>{item.m.text}</Text>
            ) : (
              <Bubble m={item.m} mine={item.m.senderId === me?.id} read={new Date(item.m.createdAt).getTime() <= readAt} first={item.first} last={item.last} />
            )
          }
        />
        {info.blocked ? (
          <SafeAreaView edges={['bottom']} style={styles.composerWrap}><Text style={[styles.safety, { padding: 16 }]}>{t('chat.blocked')}</Text></SafeAreaView>
        ) : (
          <SafeAreaView edges={['bottom']} style={styles.composerWrap}>
            {showIce && icebreakers.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ice} keyboardShouldPersistTaps="handled">
                {icebreakers.map((s) => (
                  <Pressable key={s} onPress={() => { tap(); setText(s); }} style={styles.iceChip}><Text style={styles.iceText}>{s}</Text></Pressable>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.strip}>
              {hint ? <Tag label={hint} bg={paid ? colors.coinSoft : colors.onlineSoft} icon={paid ? 'cash' : 'sparkles'} /> : <View />}
              <View style={{ flex: 1 }} />
              {QUICK_GIFTS.map((g) => (
                <Pressable key={g} onPress={() => void quickGift(g)} style={styles.qg} accessibilityLabel={g}>
                  <GiftIcon id={g} size={24} />
                </Pressable>
              ))}
            </View>
            <View style={styles.composer}>
              <Pressable onPress={async () => { try { const url = await pickImage(); if (url) await send({ type: 'IMAGE', mediaUrl: url }); } catch (e) { toast(errorText(e), 'error'); } }} style={styles.plus}>
                <Icon name="image" size={20} color={colors.ink} />
              </Pressable>
              <View style={styles.inputBox}>
                <TextInput value={text} onChangeText={onChange} placeholder={t('chat.placeholder')} placeholderTextColor={colors.textDim} selectionColor={colors.brand} style={styles.input} multiline maxLength={1000} />
                <Pressable onPress={() => setGiftOpen(true)} hitSlop={6} style={styles.giftBtn}><Icon name="gift" size={18} color={colors.ink} /></Pressable>
              </View>
              <Pressable disabled={!text.trim() || sending} onPress={() => void send({ type: 'TEXT', text: text.trim() })} style={[styles.send, (!text.trim() || sending) && { backgroundColor: colors.bgSunken, borderColor: colors.textDim }]}>
                <Icon name="arrowUp" size={20} color={!text.trim() || sending ? colors.textDim : colors.white} />
              </Pressable>
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
      <GiftOverlay ref={overlay} />
      <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={u.id} receiverName={u.name} context="CHAT" contextId={id} onSent={(e) => overlay.current?.push(e)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderColor: colors.hairline, backgroundColor: colors.card },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  name: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold, flexShrink: 1 },
  status: { color: colors.textDim, fontSize: 12, fontFamily: fonts.semibold },
  row: { flexDirection: 'row' },
  bubbleWrap: { maxWidth: '80%' },
  bubbleShadow: { position: 'absolute', left: 3, top: 3, right: -3, bottom: -3, backgroundColor: colors.ink },
  bubble: { paddingHorizontal: 13, paddingTop: 8, paddingBottom: 6, overflow: 'hidden' },
  mine: { backgroundColor: colors.brand },
  theirs: { backgroundColor: colors.card },
  text: { color: colors.ink, fontSize: 15.5, lineHeight: 21, fontFamily: fonts.regular },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  meta: { color: colors.textDim, fontSize: 10.5, fontFamily: fonts.semibold },
  metaDim: { color: colors.textMuted, fontSize: 11, fontFamily: fonts.semibold },
  img: { width: 210, height: 270, borderRadius: 14 },
  giftCard: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18, gap: 4 },
  giftTitle: { color: colors.ink, fontFamily: fonts.black, fontSize: 14 },
  day: { alignSelf: 'center', marginVertical: 12, paddingHorizontal: 12, height: 24, borderRadius: 12, backgroundColor: colors.ink, justifyContent: 'center' },
  dayText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.5 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6, padding: 8, paddingRight: 8, borderRadius: 16, backgroundColor: colors.card },
  callIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  callLabel: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13.5 },
  callTime: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 11 },
  callBack: { marginLeft: 6, backgroundColor: colors.ink, borderRadius: 12, paddingHorizontal: 10, height: 28, justifyContent: 'center' },
  callBackText: { color: colors.bg, fontFamily: fonts.bold, fontSize: 12 },
  safety: { color: colors.textDim, fontSize: 11, textAlign: 'center', marginVertical: 8, fontFamily: fonts.medium, maxWidth: 280, alignSelf: 'center' },
  composerWrap: { borderTopWidth: 1, borderColor: colors.hairline, backgroundColor: colors.card },
  ice: { gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  iceChip: { borderRadius: radius.pill, paddingHorizontal: 12, height: 34, justifyContent: 'center', backgroundColor: colors.highlight },
  iceText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 13 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 10 },
  qg: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.coinSoft, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10 },
  plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', minHeight: 44, borderRadius: 22, backgroundColor: colors.bg, paddingLeft: 14, paddingRight: 4 },
  input: { flex: 1, color: colors.ink, paddingTop: 11, paddingBottom: 11, maxHeight: 120, fontSize: 15.5, fontFamily: fonts.medium },
  giftBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.coin, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
