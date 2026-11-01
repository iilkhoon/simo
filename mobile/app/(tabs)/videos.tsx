import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, Share, StyleSheet, Text, TextInput, View, useWindowDimensions, type ListViewToken } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { colors, gradients } from '@/theme';
import { EmptyState, GradientButton, Loader } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { api } from '@/lib/api';
import { compact, errorText, timeAgo } from '@/lib/format';
import { useStore } from '@/store';
import { WEB_URL } from '@/config';
import type { PublicUser } from '@/lib/types';

interface Video {
  id: string; url: string; thumbnailUrl: string | null; caption: string; views: number; likesCount: number;
  commentsCount: number; giftsCoins: number; createdAt: string; user: PublicUser; liked: boolean; following: boolean;
}

function Player({ uri, active, height }: { uri: string; active: boolean; height: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (active && !paused) player.play();
    else player.pause();
  }, [active, paused, player]);
  useEffect(() => {
    if (!active) setPaused(false);
  }, [active]);
  return (
    <Pressable onPress={() => setPaused((p) => !p)} style={{ height }}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {paused ? <View style={styles.pause}><Icon name="play" size={64} color="rgba(255,255,255,0.85)" /></View> : null}
    </Pressable>
  );
}

function Comments({ video, onClose, onAdded }: { video: Video | null; onClose: () => void; onAdded: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<{ id: string; text: string; createdAt: string; user: PublicUser | null }[]>([]);
  const [text, setText] = useState('');
  useEffect(() => {
    if (!video) return;
    void api<{ items: typeof items }>(`/videos/${video.id}/comments`).then((r) => setItems(r.items)).catch(() => {});
  }, [video]);
  async function send() {
    if (!video || !text.trim()) return;
    const r = await api<{ comment: (typeof items)[number] }>(`/videos/${video.id}/comments`, { body: { text } });
    setItems((i) => [r.comment, ...i]);
    setText('');
    onAdded();
  }
  return (
    <Modal visible={!!video} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={styles.sheetTitle}>{t('videos.comments')} · {items.length}</Text>
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 8 }}>
              <Avatar uri={item.user?.avatarUrl} name={item.user?.name} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.user?.name} · {timeAgo(item.createdAt)}</Text>
                <Text style={{ color: '#fff', marginTop: 2 }}>{item.text}</Text>
              </View>
            </View>
          )}
        />
        <View style={styles.inputRow}>
          <TextInput value={text} onChangeText={setText} placeholder={t('videos.addComment')} placeholderTextColor={colors.textDim} style={styles.input} maxLength={300} />
          <Pressable onPress={send} style={styles.send}><Icon name="send" size={18} /></Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function Videos() {
  const { t } = useTranslation();
  const { height: winH } = useWindowDimensions();
  const tabH = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const H = winH - tabH;
  const toast = useStore((s) => s.toast);
  const meId = useStore((s) => s.me?.id);
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const [items, setItems] = useState<Video[] | null>(null);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(true);
  const [commentsFor, setCommentsFor] = useState<Video | null>(null);
  const [giftFor, setGiftFor] = useState<Video | null>(null);
  const overlay = useRef<GiftOverlayHandle>(null);
  const viewed = useRef(new Set<string>());

  const load = useCallback(async (k: 'foryou' | 'following', append = false) => {
    try {
      const r = await api<{ items: Video[] }>(`/videos/feed?tab=${k}&limit=10`);
      setItems((cur) => (append && cur ? [...cur, ...r.items.filter((v) => !cur.some((c) => c.id === v.id))] : r.items));
    } catch (e) {
      toast(errorText(e), 'error');
      setItems((c) => c ?? []);
    }
  }, [toast]);

  useEffect(() => {
    setItems(null);
    setActive(0);
    void load(tab);
  }, [tab, load]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const onViewable = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const v = viewableItems[0];
    if (v?.index != null) {
      setActive(v.index);
      const id = (v.item as Video).id;
      if (!viewed.current.has(id)) {
        viewed.current.add(id);
        void api(`/videos/${id}/view`, { body: {} }).catch(() => {});
      }
    }
  }).current;

  function patch(id: string, p: Partial<Video>) {
    setItems((cur) => cur?.map((v) => (v.id === id ? { ...v, ...p } : v)) ?? cur);
  }

  async function toggleLike(v: Video) {
    patch(v.id, { liked: !v.liked, likesCount: v.likesCount + (v.liked ? -1 : 1) });
    try {
      await api(`/videos/${v.id}/like`, { method: v.liked ? 'DELETE' : 'POST', body: v.liked ? undefined : {} });
    } catch {
      patch(v.id, { liked: v.liked, likesCount: v.likesCount });
    }
  }

  async function follow(v: Video) {
    patch(v.id, { following: true });
    await api(`/users/${v.user.id}/follow`, { body: {} }).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {items === null ? (
        <Loader full />
      ) : items.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 50 }}>
          <EmptyState icon="video" title={t('videos.empty')} action={<GradientButton small title={t('videos.upload')} onPress={() => router.push('/video/upload')} />} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(v) => v.id}
          pagingEnabled
          snapToInterval={H}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          getItemLayout={(_, i) => ({ length: H, offset: H * i, index: i })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
          onEndReached={() => void load(tab, true)}
          onEndReachedThreshold={2}
          renderItem={({ item, index }) => (
            <View style={{ height: H }}>
              <Player uri={item.url} active={focused && index === active} height={H} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.shade} pointerEvents="none" />
              <View style={styles.side}>
                <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user.id } })} style={{ alignItems: 'center' }}>
                  <Avatar uri={item.user.avatarUrl} name={item.user.name} size={46} />
                  {!item.following && item.user.id !== meId ? (
                    <Pressable onPress={() => void follow(item)} style={styles.plus}><Icon name="add" size={14} /></Pressable>
                  ) : null}
                </Pressable>
                <Pressable onPress={() => void toggleLike(item)} style={styles.sideBtn}>
                  <Icon name="heart" size={34} color={item.liked ? colors.rose : '#fff'} />
                  <Text style={styles.sideText}>{compact(item.likesCount)}</Text>
                </Pressable>
                <Pressable onPress={() => setCommentsFor(item)} style={styles.sideBtn}>
                  <Icon name="chatOutline" size={32} />
                  <Text style={styles.sideText}>{compact(item.commentsCount)}</Text>
                </Pressable>
                {item.user.id !== meId ? (
                  <Pressable onPress={() => setGiftFor(item)} style={styles.sideBtn}>
                    <LinearGradient colors={gradients.primary} style={styles.giftBtn}><Icon name="gift" size={22} /></LinearGradient>
                    <Text style={styles.sideText}>{compact(item.giftsCoins)}</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => void Share.share({ message: `${item.user.name} · Simo ${WEB_URL}` })} style={styles.sideBtn}>
                  <Icon name="share" size={30} />
                </Pressable>
              </View>
              <View style={styles.caption}>
                <Text style={styles.author}>@{item.user.name} {item.user.verified ? '✓' : ''}</Text>
                {item.caption ? <Text style={styles.captionText} numberOfLines={3}>{item.caption}</Text> : null}
                <Text style={styles.views}>▶ {compact(item.views)}</Text>
              </View>
            </View>
          )}
        />
      )}
      <View style={[styles.topBar, { top: insets.top + 6 }]}>
        {(['following', 'foryou'] as const).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)}>
            <Text style={[styles.topTab, tab === k && styles.topTabActive]}>{k === 'foryou' ? t('videos.forYou') : t('videos.following')}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/video/upload')} style={styles.upload}><Icon name="add" size={22} /></Pressable>
      </View>
      <GiftOverlay ref={overlay} />
      <Comments video={commentsFor} onClose={() => setCommentsFor(null)} onAdded={() => commentsFor && patch(commentsFor.id, { commentsCount: commentsFor.commentsCount + 1 })} />
      {giftFor ? (
        <GiftSheet
          visible
          onClose={() => setGiftFor(null)}
          receiverId={giftFor.user.id}
          context="VIDEO"
          contextId={giftFor.id}
          onSent={(e) => {
            overlay.current?.push(e);
            patch(giftFor.id, { giftsCoins: giftFor.giftsCoins + e.coins });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pause: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 260 },
  side: { position: 'absolute', right: 10, bottom: 30, alignItems: 'center', gap: 18 },
  plus: { marginTop: -10, backgroundColor: colors.rose, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  sideBtn: { alignItems: 'center', gap: 2 },
  sideText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  giftBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  caption: { position: 'absolute', left: 14, right: 80, bottom: 24 },
  author: { color: '#fff', fontWeight: '800', fontSize: 16 },
  captionText: { color: '#fff', marginTop: 6, fontSize: 14 },
  views: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  topBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22 },
  topTab: { color: 'rgba(255,255,255,0.6)', fontSize: 17, fontWeight: '700' },
  topTabActive: { color: '#fff', textDecorationLine: 'underline' },
  upload: { position: 'absolute', right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: '#1A0C2C', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  sheetTitle: { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: { flex: 1, backgroundColor: colors.surface, color: '#fff', borderRadius: 22, paddingHorizontal: 16, height: 44 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
});
