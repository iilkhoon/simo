import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radius } from '@/theme';
import { Loader } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { GiftIcon } from '@/components/GiftIcon';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { CoinAmount, VerifiedBadge } from '@/components/Badges';
import { api, ApiError } from '@/lib/api';
import { clock, duration, errorText, giftName, timeAgo } from '@/lib/format';
import { getSocket } from '@/lib/socket';
import { pickImage } from '@/lib/media';
import { startCall } from '@/lib/calls';
import { useStore } from '@/store';
import type { Message, PublicUser } from '@/lib/types';

interface ConvInfo {
  id: string; user: PublicUser; otherLastReadAt: string; blocked: boolean;
  pricing: { price: number; reason: 'FREE' | 'FIRST_FREE' | 'VIP_FREE' | 'PAID'; freeLeft: number };
}

function Bubble({ m, mine, read }: { m: Message; mine: boolean; read: boolean }) {
  const { t } = useTranslation();
  const gifts = useStore((s) => s.gifts);
  if (m.type === 'CALL') {
    let info: { type: string; status: string; durationSec: number } = { type: 'VOICE', status: 'ENDED', durationSec: 0 };
    try {
      info = JSON.parse(m.text);
    } catch {
      /* ignore */
    }
    const label = info.status === 'ENDED' ? `${info.type === 'VIDEO' ? t('chat.callVideo') : t('chat.callVoice')} · ${duration(info.durationSec)}` : info.status === 'MISSED' ? t('chat.missed') : info.status === 'REJECTED' ? t('chat.rejected') : t('chat.cancelled');
    return (
      <View style={[styles.system]}>
        <Icon name={info.type === 'VIDEO' ? 'videocam' : 'call'} size={14} color={info.status === 'ENDED' ? colors.online : colors.danger} />
        <Text style={styles.systemText}>{label} · {clock(m.createdAt)}</Text>
      </View>
    );
  }
  if (m.type === 'GIFT' && m.giftId) {
    const g = gifts.find((x) => x.id === m.giftId);
    return (
      <View style={[styles.row, mine && { justifyContent: 'flex-end' }]}>
        <LinearGradient colors={['rgba(255,77,141,0.25)', 'rgba(123,92,255,0.25)']} style={styles.giftBubble}>
          <GiftIcon id={m.giftId} size={64} />
          <Text style={{ color: '#fff', fontWeight: '800' }}>{g ? giftName(g) : m.giftId} ×{m.text}</Text>
          <Text style={styles.time}>{clock(m.createdAt)}</Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={[styles.row, mine && { justifyContent: 'flex-end' }]}>
      {mine ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.mine]}>
          {m.mediaUrl ? <Image source={{ uri: m.mediaUrl }} style={styles.img} contentFit="cover" /> : null}
          {m.text ? <Text style={styles.text}>{m.text}</Text> : null}
          <Text style={[styles.time, { color: 'rgba(255,255,255,0.75)' }]}>
            {clock(m.createdAt)} {read ? '✓✓' : '✓'}{m.coinsCost ? ` · 🪙${m.coinsCost}` : ''}
          </Text>
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.theirs]}>
          {m.mediaUrl ? <Image source={{ uri: m.mediaUrl }} style={styles.img} contentFit="cover" /> : null}
          {m.text ? <Text style={styles.text}>{m.text}</Text> : null}
          <Text style={styles.time}>{clock(m.createdAt)}</Text>
        </View>
      )}
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

  if (!info) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loader full /></View>;
  const u = info.user;
  const readAt = new Date(info.otherLastReadAt).getTime();
  const hint =
    info.pricing.reason === 'FIRST_FREE' ? t('chat.firstFree')
      : info.pricing.reason === 'VIP_FREE' ? t('chat.vipFree', { n: info.pricing.freeLeft })
        : info.pricing.reason === 'PAID' ? t('chat.msgPrice', { price: info.pricing.price }) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 6 }}><Icon name="back" /></Pressable>
        <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Avatar uri={u.avatarUrl} name={u.name} size={40} online={u.online} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.name} numberOfLines={1}>{u.name}</Text>
              {u.verified ? <VerifiedBadge size={14} /> : null}
            </View>
            <Text style={[styles.status, (typing || u.online) && { color: colors.online }]}>
              {typing ? t('chat.typing') : u.online ? t('common.online') : timeAgo(u.lastSeenAt)}
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={() => void startCall(u.id, 'VOICE')} style={styles.headBtn}><Icon name="call" size={20} color={colors.online} /></Pressable>
        <Pressable onPress={() => void startCall(u.id, 'VIDEO')} style={styles.headBtn}><Icon name="videocam" size={22} color={colors.rose} /></Pressable>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12, gap: 6 }}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<Text style={styles.safety}>🔒 {t('chat.safety')}</Text>}
          renderItem={({ item }) => <Bubble m={item} mine={item.senderId === me?.id} read={new Date(item.createdAt).getTime() <= readAt} />}
        />
        {info.blocked ? (
          <Text style={[styles.safety, { padding: 16 }]}>{t('chat.blocked')}</Text>
        ) : (
          <SafeAreaView edges={['bottom']} style={styles.composerWrap}>
            {hint ? (
              <View style={styles.hint}>
                {info.pricing.reason === 'PAID' ? <CoinAmount n={hint} size={13} /> : <Text style={{ color: colors.online, fontSize: 12, fontWeight: '700' }}>{hint}</Text>}
                <Text style={{ color: colors.textDim, fontSize: 12 }}>· {t('wallet.balance')}: {me?.coins ?? 0}</Text>
              </View>
            ) : null}
            <View style={styles.composer}>
              <Pressable onPress={async () => { try { const url = await pickImage(); if (url) await send({ type: 'IMAGE', mediaUrl: url }); } catch (e) { toast(errorText(e), 'error'); } }} style={styles.iconBtn}>
                <Icon name="image" size={22} color={colors.textMuted} />
              </Pressable>
              <TextInput value={text} onChangeText={onChange} placeholder={t('chat.placeholder')} placeholderTextColor={colors.textDim} style={styles.input} multiline maxLength={1000} />
              <Pressable onPress={() => setGiftOpen(true)} style={styles.iconBtn}><Icon name="gift" size={22} color={colors.gold} /></Pressable>
              <Pressable disabled={!text.trim() || sending} onPress={() => void send({ type: 'TEXT', text: text.trim() })}>
                <LinearGradient colors={gradients.primary} style={[styles.send, (!text.trim() || sending) && { opacity: 0.5 }]}>
                  <Icon name="send" size={18} />
                </LinearGradient>
              </Pressable>
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>
      <GiftOverlay ref={overlay} />
      <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={u.id} context="CHAT" contextId={id} onSent={(e) => overlay.current?.push(e)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated },
  name: { color: '#fff', fontSize: 16, fontWeight: '700', flexShrink: 1 },
  status: { color: colors.textDim, fontSize: 12 },
  headBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '78%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, gap: 4 },
  mine: { borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.surface2, borderBottomLeftRadius: 6 },
  text: { color: '#fff', fontSize: 15, lineHeight: 20 },
  time: { color: colors.textDim, fontSize: 10, alignSelf: 'flex-end' },
  img: { width: 200, height: 260, borderRadius: 14 },
  giftBubble: { alignItems: 'center', padding: 12, borderRadius: radius.lg, gap: 4, borderWidth: 1, borderColor: colors.border },
  system: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginVertical: 4 },
  systemText: { color: colors.textMuted, fontSize: 12 },
  safety: { color: colors.textDim, fontSize: 11, textAlign: 'center', marginVertical: 10 },
  composerWrap: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingTop: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, padding: 8 },
  iconBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: colors.surface, borderRadius: 22, color: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 120, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
