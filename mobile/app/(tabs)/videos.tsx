import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTabSpace } from '@/components/Glass';
import { Alert, Animated, FlatList, Modal, Pressable, Share, StyleSheet, Text, TextInput, View, useWindowDimensions, type ListViewToken } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { colors, noPad, fonts, webNoOutline } from '@/theme';
import { Btn, EmptyState, IconBtn, Loader, Tabs, tap } from '@/components/ui';
import { sheetStyles } from '@/components/ActionSheet';
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
  mediaType?: 'VIDEO' | 'PHOTO'; saved?: boolean; savesCount?: number; sharesCount?: number;
  /** Xüsusi post: kilidlidirsə url yoxdur; demo (teaser) üçün bulanıq önizləmə */
  locked?: boolean; teaser?: boolean; previewUrl?: string | null; hashtags?: string[]; location?: string; commentsOff?: boolean; mine?: boolean;
}

/** Mətndə #heşteqlər toxunula bilən olur → heşteq səhifəsi */
function RichCaption({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(#[\p{L}\d_]+)/gu);
  return (
    <Text style={style} numberOfLines={3}>
      {parts.map((p, i) => (p.startsWith('#') ? <Text key={i} style={{ fontFamily: fonts.black, color: colors.coin }} onPress={() => router.push({ pathname: '/hashtag/[tag]', params: { tag: p.slice(1).toLowerCase() } })}>{p}</Text> : p))}
    </Text>
  );
}

/** İki dəfə toxunanda böyük ürək animasiyası */
function BigHeart({ k }: { k: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!k) return;
    v.setValue(0);
    Animated.sequence([
      Animated.spring(v, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      Animated.timing(v, { toValue: 2, duration: 380, delay: 250, useNativeDriver: true }),
    ]).start();
  }, [k, v]);
  if (!k) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.bigHeart, { opacity: v.interpolate({ inputRange: [0, 0.3, 1.4, 2], outputRange: [0, 1, 1, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.3, 1, 1.4] }) }, { rotate: '-8deg' }] }]}>
      <Icon name="heart" size={110} color={colors.brand} />
    </Animated.View>
  );
}

function Player({ uri, active, height, onTap }: { uri: string; active: boolean; height: number; onTap?: () => void }) {
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
    <Pressable onPress={() => { onTap?.(); setPaused((p) => !p); }} style={{ height }}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      {paused ? <View style={styles.pause}><View style={styles.playDisc}><Icon name="play" size={40} color={colors.ink} /></View></View> : null}
    </Pressable>
  );
}

export function Comments({ video, onClose, onAdded }: { video: Video | null; onClose: () => void; onAdded: (delta: number) => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { me, toast } = useStore();
  const [items, setItems] = useState<{ id: string; text: string; createdAt: string; userId?: string; user: PublicUser | null }[]>([]);
  const [off, setOff] = useState(false);
  const [text, setText] = useState('');
  const owner = !!video && video.user.id === me?.id;
  useEffect(() => {
    if (!video) return;
    setOff(!!video.commentsOff);
    void api<{ items: typeof items; commentsOff: boolean }>(`/videos/${video.id}/comments`).then((r) => { setItems(r.items); setOff(r.commentsOff); }).catch(() => {});
  }, [video]);
  async function send() {
    if (!video || !text.trim()) return;
    try {
      const r = await api<{ comment: (typeof items)[number] }>(`/videos/${video.id}/comments`, { body: { text } });
      setItems((i) => [r.comment, ...i]);
      setText('');
      onAdded(1);
    } catch (e) { toast(errorText(e), 'error'); }
  }
  async function toggleOff() {
    if (!video) return;
    const next = !off;
    setOff(next);
    try { await api(`/videos/${video.id}`, { method: 'PATCH', body: { commentsOff: next } }); } catch (e) { setOff(!next); toast(errorText(e), 'error'); }
  }
  function remove(id: string) {
    if (!video) return;
    Alert.alert(t('comments2.delete'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('comments2.delete'), style: 'destructive', onPress: () => void api(`/videos/${video.id}/comments/${id}`, { method: 'DELETE' }).then(() => { setItems((i) => i.filter((c) => c.id !== id)); onAdded(-1); }).catch((e) => toast(errorText(e), 'error')) },
    ]);
  }
  return (
    <Modal visible={!!video} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} />
      <View style={[sheetStyles.sheet, styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
        <View style={sheetStyles.grip} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.sheetTitle, { flex: 1 }]}>{t('videos.comments')} · {items.length}</Text>
          {owner ? (
            <Pressable onPress={toggleOff} style={styles.offBtn}>
              <Icon name={off ? 'lockOpen' : 'lock'} size={13} color={colors.ink} />
              <Text style={styles.offText}>{off ? t('comments2.turnOn') : t('comments2.turnOff')}</Text>
            </Pressable>
          ) : null}
        </View>
        {off ? <View style={styles.offBanner}><Icon name="lock" size={14} color={colors.textMuted} /><Text style={styles.offBannerText}>{t('comments2.off')}</Text></View> : null}
        {!items.length && !off ? <Text style={[styles.offBannerText, { textAlign: 'center', paddingVertical: 24 }]}>{t('comments2.empty')}</Text> : null}
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          style={{ maxHeight: 380 }}
          renderItem={({ item }) => (
            <Pressable onLongPress={() => ((item.userId ?? item.user?.id) === me?.id || owner ? remove(item.id) : undefined)} delayLongPress={350} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8 }}>
              <Avatar uri={item.user?.avatarUrl} name={item.user?.name} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: fonts.semibold }}>{item.user?.name} · {timeAgo(item.createdAt)}</Text>
                <Text style={{ color: colors.ink, marginTop: 2, fontFamily: fonts.regular, fontSize: 14.5 }}>{item.text}</Text>
              </View>
              {(item.userId ?? item.user?.id) === me?.id || owner ? (
                <Pressable onPress={() => remove(item.id)} hitSlop={10} style={{ paddingTop: 2 }}><Icon name="trash" size={15} color={colors.textDim} /></Pressable>
              ) : null}
            </Pressable>
          )}
        />
        <View style={[styles.inputRow, off && !owner && { opacity: 0.4 }]} pointerEvents={off && !owner ? 'none' : 'auto'}>
          <TextInput value={text} onChangeText={setText} placeholder={off && !owner ? t('comments2.off') : t('comments2.placeholder')} placeholderTextColor={colors.textDim} style={styles.input} maxLength={300} />
          <Pressable onPress={send} style={styles.send}><Icon name="arrowUp" size={20} color={colors.white} /></Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function Videos() {
  const { t } = useTranslation();
  const tabSpace = useTabSpace();
  const { height: winH } = useWindowDimensions();
  const tabH = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  // Real konteyner hündürlüyü (tab panelin real ölçüsü ilə) — səhifələr tam ekrana düz oturur
  const [boxH, setBoxH] = useState(0);
  const H = boxH || winH - tabH;
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
  const lastTap = useRef(0);
  const [heartKey, setHeartKey] = useState(0);

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

  function onDoubleTap(v: Video) {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!v.liked) void toggleLike(v);
      setHeartKey(now);
    }
    lastTap.current = now;
  }

  async function toggleSave(v: Video) {
    patch(v.id, { saved: !v.saved, savesCount: (v.savesCount ?? 0) + (v.saved ? -1 : 1) });
    await api(`/videos/${v.id}/save`, { method: v.saved ? 'DELETE' : 'POST', body: v.saved ? undefined : {} }).catch(() => patch(v.id, { saved: v.saved, savesCount: v.savesCount }));
  }

  async function share(v: Video) {
    const r = await Share.share({ message: `${v.user.name} · Simo ${WEB_URL}` }).catch(() => null);
    if (r && r.action !== Share.dismissedAction) {
      patch(v.id, { sharesCount: (v.sharesCount ?? 0) + 1 });
      void api(`/videos/${v.id}/share`, { body: {} }).catch(() => {});
    }
  }

  async function follow(v: Video) {
    patch(v.id, { following: true });
    await api(`/users/${v.user.id}/follow`, { body: {} }).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }} onLayout={(e) => { const h = Math.round(e.nativeEvent.layout.height); if (h && Math.abs(h - boxH) > 1) setBoxH(h); }}>
      {focused ? <StatusBar style="light" /> : null}
      {items === null ? (
        <Loader full night />
      ) : items.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 50 }}>
          <EmptyState icon="video" title={t('videos.empty')} action={<Btn full={false} size="md" icon="add" title={t('videos.upload')} onPress={() => router.push('/video/upload')} />} />
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
              <Pressable onPress={() => onDoubleTap(item)} style={{ height: H }}>
                {item.locked ? (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.night2 }]}>
                    {item.previewUrl ? <Image source={{ uri: item.previewUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={8} /> : null}
                    <View style={styles.lockWrap}>
                      <View style={styles.lockDisc}><Icon name="lock" size={30} color={colors.ink} /></View>
                      <Text style={styles.lockTitle}>{t('post2.teaserLocked')}</Text>
                      <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user.id, tab: 'private' } })} style={styles.lockBtn}>
                        <Icon name="star" size={16} color={colors.ink} />
                        <Text style={styles.lockBtnText}>{t('posts.subscribe', { price: item.user.privatePrice ?? '' })}</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : item.mediaType === 'PHOTO' ? <Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Player uri={item.url} active={focused && index === active} height={H} onTap={() => onDoubleTap(item)} />}
                {index === active ? <BigHeart k={heartKey} /> : null}
              </Pressable>
              <View style={[styles.side, { bottom: tabSpace + 12 }]}>
                <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user.id } })} style={{ alignItems: 'center' }}>
                  <Avatar uri={item.user.avatarUrl} name={item.user.name} size={48} ring={false} />
                  {!item.following && item.user.id !== meId ? (
                    <Pressable onPress={() => void follow(item)} style={styles.plus}><Icon name="add" size={14} color={colors.white} /></Pressable>
                  ) : null}
                </Pressable>
                <Pressable onPress={() => { tap(); void toggleLike(item); }} style={styles.sideBtn}>
                  <View style={[styles.disc, item.liked && { backgroundColor: colors.brand }]}><Icon name="heart" size={24} color={item.liked ? colors.white : colors.ink} /></View>
                  <Text style={styles.sideText}>{compact(item.likesCount)}</Text>
                </Pressable>
                <Pressable onPress={() => setCommentsFor(item)} style={styles.sideBtn}>
                  <View style={styles.disc}><Icon name="chatOutline" size={22} color={colors.ink} /></View>
                  <Text style={styles.sideText}>{compact(item.commentsCount)}</Text>
                </Pressable>
                {item.user.id !== meId ? (
                  <Pressable onPress={() => setGiftFor(item)} style={styles.sideBtn}>
                    <View style={[styles.disc, { backgroundColor: colors.coin }]}><Icon name="gift" size={22} color={colors.ink} /></View>
                    <Text style={styles.sideText}>{compact(item.giftsCoins)}</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => { tap(); void toggleSave(item); }} style={styles.sideBtn}>
                  <View style={[styles.disc, item.saved && { backgroundColor: colors.coin }]}><Icon name={item.saved ? 'bookmark' : 'bookmarkOutline'} size={21} color={colors.ink} /></View>
                  <Text style={styles.sideText}>{compact(item.savesCount ?? 0)}</Text>
                </Pressable>
                <Pressable onPress={() => void share(item)} style={styles.sideBtn}>
                  <View style={styles.disc}><Icon name="share" size={21} color={colors.ink} /></View>
                  <Text style={styles.sideText}>{compact(item.sharesCount ?? 0)}</Text>
                </Pressable>
              </View>
              <View style={[styles.caption, { bottom: tabSpace + 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.author}>@{item.user.name}</Text>
                  {item.user.verified ? <Icon name="verified" size={15} color={colors.diamond} /> : null}
                  <Text style={styles.views}>· ▶ {compact(item.views)}</Text>
                </View>
                {item.caption ? <RichCaption text={item.caption} style={styles.captionText} /> : null}
                {item.location ? <View style={styles.locRow}><Icon name="location" size={12} color={colors.nightMuted} /><Text style={styles.locText} numberOfLines={1}>{item.location}</Text></View> : null}
              </View>
            </View>
          )}
        />
      )}
      <View style={[styles.topBar, { top: insets.top + 6 }]}>
        <View style={{ width: 210 }}>
          <Tabs night value={tab} onChange={setTab} options={[{ key: 'following', label: t('videos.following') }, { key: 'foryou', label: t('videos.forYou') }]} />
        </View>
        <IconBtn name="search" size={40} bg="rgba(15,13,12,0.45)" color={colors.white} style={styles.upload} onPress={() => router.push('/hashtag')} />
      </View>
      <GiftOverlay ref={overlay} />
      <Comments video={commentsFor} onClose={() => setCommentsFor(null)} onAdded={(d) => commentsFor && patch(commentsFor.id, { commentsCount: Math.max(0, commentsFor.commentsCount + d) })} />
      {giftFor ? (
        <GiftSheet
          visible
          onClose={() => setGiftFor(null)}
          receiverId={giftFor.user.id}
          receiverName={giftFor.user.name}
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
  bigHeart: { position: 'absolute', alignSelf: 'center', top: '38%' },
  pause: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  playDisc: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingLeft: 6 },
  side: { position: 'absolute', right: 12, bottom: 40, alignItems: 'center', gap: 14 },
  plus: { marginTop: -11, backgroundColor: colors.brand, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  sideBtn: { alignItems: 'center', gap: 3 },
  disc: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  sideText: { ...noPad, color: colors.white, fontSize: 12, lineHeight: 16, fontFamily: fonts.black, backgroundColor: 'rgba(20,14,12,0.6)', paddingHorizontal: 7, paddingVertical: 1, borderRadius: 9, overflow: 'hidden', marginTop: 3, minWidth: 22, textAlign: 'center' },
  caption: { position: 'absolute', left: 12, right: 80, bottom: 40, backgroundColor: 'rgba(15,13,12,0.55)', borderRadius: 16, padding: 12 },
  author: { color: colors.white, fontFamily: fonts.black, fontSize: 15 },
  captionText: { color: colors.nightText, marginTop: 5, fontSize: 14, fontFamily: fonts.regular, lineHeight: 19 },
  views: { color: colors.nightMuted, fontSize: 12, fontFamily: fonts.semibold },
  topBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  upload: { position: 'absolute', right: 12 },
  lockWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: 'rgba(15,13,12,0.35)', paddingLeft: 24, paddingRight: 84 },
  lockDisc: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.coin, alignItems: 'center', justifyContent: 'center' },
  lockTitle: { ...noPad, color: colors.white, fontFamily: fonts.display, fontSize: 17, lineHeight: 23, textAlign: 'center' },
  lockBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 20, borderRadius: 24, backgroundColor: colors.coin },
  lockBtnText: { ...noPad, color: colors.ink, fontFamily: fonts.black, fontSize: 14, lineHeight: 18 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locText: { ...noPad, color: colors.nightMuted, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15, flexShrink: 1 },
  offBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.bgSunken },
  offText: { ...noPad, color: colors.ink, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15 },
  offBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgSunken, borderRadius: 12, padding: 10, marginTop: 8 },
  offBannerText: { ...noPad, color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17 },
  sheet: { paddingTop: 10, paddingHorizontal: 16 },
  sheetTitle: { color: colors.ink, fontFamily: fonts.displayBold, fontSize: 16, textAlign: 'center', marginVertical: 8 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: { flex: 1, minWidth: 0, ...webNoOutline, backgroundColor: colors.card, color: colors.ink, borderRadius: 22, paddingHorizontal: 16, height: 46, fontFamily: fonts.medium },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
