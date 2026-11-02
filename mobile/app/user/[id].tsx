import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, tintFor } from '@/theme';
import { Box, Btn, Card, Chip, GlassPill, IconBtn, Loader, PressBox, T, Tabs } from '@/components/ui';
import { PostGrid, type Post } from '@/components/PostGrid';
import { Icon } from '@/components/Icon';
import { GiftIcon } from '@/components/GiftIcon';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { ActionSheet } from '@/components/ActionSheet';
import { HostBadge, LevelBadge, VerifiedBadge, VipBadge, NobleBadge, ProfileBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { compact, errorText, timeAgo } from '@/lib/format';
import { startCall } from '@/lib/calls';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

const { width: W } = Dimensions.get('window');
const PW = W - 32; // ekran kənarları 16 + 16
const PH = PW * 1.18;

interface Profile {
  user: PublicUser; isFollowing: boolean; followers: number; following: number; matched: boolean; liked: boolean; blocked: boolean;
  giftWall: { giftId: string; count: number }[]; videos: { id: string; thumbnailUrl: string | null; url: string; views: number }[];
  live: { id: string; type: string; title: string } | null;
}

const REASONS = ['SPAM', 'FAKE', 'NUDITY', 'HARASSMENT', 'UNDERAGE', 'SCAM', 'VIOLENCE', 'OTHER'];

export default function UserProfile() {
  const { t } = useTranslation();
  const { id, gift, tab } = useLocalSearchParams<{ id: string; gift?: string; tab?: string }>();
  const insets = useSafeAreaInsets();
  const { me, toast } = useStore();
  const [p, setP] = useState<Profile | null>(null);
  const [photo, setPhoto] = useState(0);
  const [giftOpen, setGiftOpen] = useState(gift === '1');
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const overlay = React.useRef<GiftOverlayHandle>(null);
  const isMe = me?.id === id;

  const load = useCallback(async () => {
    try {
      setP(await api<Profile>(`/users/${id}`));
    } catch (e) {
      toast(errorText(e), 'error');
      router.back();
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [badges, setBadges] = useState<{ key: string; label?: string; value?: number }[]>([]);
  const [postTab, setPostTab] = useState<'posts' | 'private'>(tab === 'private' ? 'private' : 'posts');
  const [subscribed, setSubscribed] = useState(false);
  const [subBusy, setSubBusy] = useState(false);
  const loadPosts = useCallback(() => {
    void api<{ items: Post[] }>(`/videos/user/${id}`).then((r) => setPosts(r.items)).catch(() => setPosts([]));
    void api<{ items: { key: string; label?: string; value?: number }[] }>(`/users/${id}/badges`).then((r) => setBadges(r.items)).catch(() => {});
    void api<{ items: { creatorId: string }[] }>('/subscriptions').then((r) => setSubscribed(r.items.some((x) => x.creatorId === id))).catch(() => {});
  }, [id]);
  useEffect(loadPosts, [loadPosts]);
  const shownPosts = (posts ?? []).filter((x) => (postTab === 'private' ? x.isPrivate : !x.isPrivate));

  async function subscribe() {
    setSubBusy(true);
    try {
      await api(`/subscriptions/${id}`, { body: {} });
      toast(t('posts.subscribed'), 'success');
      loadPosts();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setSubBusy(false);
    }
  }

  if (!p) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loader full /></View>;
  const u = p.user;
  const photos = u.photos.length ? u.photos : u.avatarUrl ? [u.avatarUrl] : [];

  async function toggleFollow() {
    setP((x) => (x ? { ...x, isFollowing: !x.isFollowing, followers: x.followers + (x.isFollowing ? -1 : 1) } : x));
    await api(`/users/${id}/follow`, { method: p!.isFollowing ? 'DELETE' : 'POST', body: p!.isFollowing ? undefined : {} }).catch(() => {});
  }

  async function message() {
    try {
      const r = await api<{ id: string }>(`/conversations/with/${id}`, { method: 'POST', body: {} });
      router.push({ pathname: '/chat/[id]', params: { id: r.id } });
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  async function block() {
    await api(`/users/${id}/block`, { method: p!.blocked ? 'DELETE' : 'POST', body: p!.blocked ? undefined : {} });
    toast(p!.blocked ? t('common.unblock') : t('profile.blocked'), 'success');
    void load();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
          <View style={styles.topBar}>
            <IconBtn name="back" size={40} onPress={() => router.back()} />
            <View style={{ flex: 1 }} />
            {!isMe ? <IconBtn name="more" size={40} onPress={() => setMenu(true)} /> : <IconBtn name="settings" size={40} onPress={() => router.push('/edit-profile')} />}
          </View>
          <Box r={28} sh={2} bg={tintFor(u.name)} style={{ marginTop: 12 }} inner={{ height: PH, width: PW }}>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(x, i) => x + i}
              onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / PW))}
              renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: PW, height: PH }} contentFit="cover" />}
            />
            {photos.length > 1 ? (
              <View style={styles.dots} pointerEvents="none">
                {photos.map((_, i) => <View key={i} style={[styles.dotBar, i === photo && { backgroundColor: colors.white }]} />)}
              </View>
            ) : null}
            <View style={styles.photoTags} pointerEvents="none">
              {u.online ? <GlassPill label={t('discover.activeNow')} icon="dot" bg={colors.online} /> : null}
              {u.distanceKm != null ? <GlassPill label={t('common.km', { n: u.distanceKm })} icon="location" /> : null}
            </View>
          </Box>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16, gap: 12 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T v="h1" style={{ flexShrink: 1 }}>{u.name}{u.age ? `, ${u.age}` : ''}</T>
              {u.verified ? <VerifiedBadge size={24} /> : null}
            </View>
            <T v="small" color={colors.textMuted} style={{ marginTop: 2 }}>
              {t('common.id', { id: u.shortId })}
              {!u.online && u.lastSeenAt ? ` · ${t('profile.lastSeen', { t: timeAgo(u.lastSeenAt) })}` : ''}
              {u.city ? ` · ${u.city}` : ''}
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {u.isHost ? <HostBadge /> : null}
            <NobleBadge tier={u.nobleTier} />
            <VipBadge tier={u.vipTier} />
            <LevelBadge kind="wealth" level={u.wealthLevel} />
            <LevelBadge kind="charm" level={u.charmLevel} />
            {badges.map((b) => <ProfileBadge key={b.key} b={b} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={styles.stat}><T v="num">{compact(p.followers)}</T><T v="tiny" color={colors.textMuted}>{t('common.followers')}</T></View>
            <View style={styles.stat}><T v="num">{compact(p.following)}</T><T v="tiny" color={colors.textMuted}>{t('profile.followingCount')}</T></View>
            <View style={{ flex: 1 }} />
            {!isMe ? (
              p.isFollowing ? <Btn full={false} size="sm" kind="light" title={t('common.following')} icon="checkmark" onPress={toggleFollow} /> : <Btn full={false} size="sm" kind="dark" title={t('common.follow')} icon="add" onPress={toggleFollow} />
            ) : (
              <Btn full={false} size="sm" kind="light" title={t('common.edit')} icon="settings" onPress={() => router.push('/edit-profile')} />
            )}
          </View>

          {p.live ? (
            <PressBox r={18} sh={4} bg={colors.brand} onPress={() => router.push({ pathname: '/live/[id]', params: { id: p.live!.id } })} inner={styles.liveBanner}>
              <View style={styles.liveDisc}><Icon name="radio" size={18} color={colors.ink} /></View>
              <Text style={styles.liveText} numberOfLines={1}>{t('profile.liveNow')}: {p.live.title}</Text>
              <Text style={styles.liveCta}>{t('profile.watch')}</Text>
            </PressBox>
          ) : null}

          {u.bio ? (
            <Card r={20} sh={3}>
              <View style={styles.section}>
                <T v="label" color={colors.brand}>{t('profile.about')}</T>
                <T v="body" color={colors.ink}>{u.bio}</T>
              </View>
            </Card>
          ) : null}
          <Card r={20} sh={3}>
            <View style={styles.section}>
              <T v="label" color={colors.brand}>{t(`lookingFor.${u.lookingFor}`)}</T>
              {u.interests.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {u.interests.map((i) => <Chip key={i} label={t(`interests.${i}`)} active={me?.interests.includes(i)} color={colors.brand} />)}
                </View>
              ) : null}
            </View>
          </Card>
          {p.giftWall.length ? (
            <Card r={20} sh={3} bg={colors.coinSoft}>
              <View style={styles.section}>
                <T v="label">{t('profile.giftWall')}</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {p.giftWall.map((g) => (
                    <View key={g.giftId} style={styles.giftCell}>
                      <GiftIcon id={g.giftId} size={38} />
                      <Text style={styles.giftCount}>×{compact(g.count)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          ) : null}
          {/* Postlar (Instagram tipli şəbəkə) və Private */}
          <View style={{ marginTop: 4 }}>
            {u.privatePrice ? (
              <Tabs<'posts' | 'private'> value={postTab} onChange={setPostTab} options={[{ key: 'posts', label: t('posts.posts') }, { key: 'private', label: `🔒 ${t('posts.privateTab')}` }]} />
            ) : <T v="label" color={colors.brand}>{t('posts.posts')}</T>}
          </View>
          {u.privatePrice && !isMe && postTab === 'private' ? (
            <View style={styles.subCard}>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong" color={colors.white}>{subscribed ? t('posts.subscribed') : t('posts.subscribe', { price: u.privatePrice })}</T>
                <T v="tiny" color={colors.nightMuted}>{t('posts.subscribeSub')}</T>
              </View>
              {!subscribed ? <Btn full={false} size="sm" kind="coin" title="OK" loading={subBusy} onPress={subscribe} /> : <Icon name="checkmark" size={20} color={colors.highlight} />}
            </View>
          ) : null}
          {posts === null ? null : shownPosts.length ? (
            <PostGrid items={shownPosts} onLocked={() => { setPostTab('private'); toast(t('posts.locked'), 'info'); }} />
          ) : <T v="small" color={colors.textMuted} center style={{ paddingVertical: 20 }}>{t('posts.empty')}</T>}
        </View>
      </ScrollView>

      {!isMe ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
          <IconBtn name="chat" size={52} sh={1} bg={colors.bgSunken} onPress={message} />
          <IconBtn name="gift" size={52} sh={1} bg={colors.coin} onPress={() => setGiftOpen(true)} />
          <PressBox style={{ flex: 1 }} r={26} sh={0} bg={colors.diamond} onPress={() => void startCall(u.id, 'VOICE')} inner={styles.callBtn}>
            <Icon name="call" size={19} color={colors.white} />
            <View style={styles.callCol}>
              <Text style={styles.callTitle} numberOfLines={1}>{t('match.voice')}</Text>
              {u.isHost ? <Text style={styles.callPrice} numberOfLines={1}>{u.voiceCallPrice}/{t('match.min')}</Text> : null}
            </View>
          </PressBox>
          <PressBox style={{ flex: 1 }} r={26} sh={0} bg={colors.brand} onPress={() => void startCall(u.id, 'VIDEO')} inner={styles.callBtn}>
            <Icon name="videocam" size={20} color={colors.white} />
            <View style={styles.callCol}>
              <Text style={styles.callTitle} numberOfLines={1}>{t('match.video')}</Text>
              {u.isHost ? <Text style={styles.callPrice} numberOfLines={1}>{u.videoCallPrice}/{t('match.min')}</Text> : null}
            </View>
          </PressBox>
        </View>
      ) : null}

      <GiftOverlay ref={overlay} />
      <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={u.id} receiverName={u.name} context="PROFILE" onSent={(e) => { overlay.current?.push(e); toast(t('gifts.sent'), 'success'); void load(); }} />
      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        options={[
          { label: t('common.report'), onPress: () => setTimeout(() => setReport(true), 350) },
          { label: p.blocked ? t('common.unblock') : t('common.block'), danger: !p.blocked, onPress: () => void block() },
          { label: t('common.cancel'), onPress: () => {} },
        ]}
      />
      <ActionSheet
        visible={report}
        title={t('profile.reportTitle')}
        onClose={() => setReport(false)}
        options={REASONS.map((r) => ({
          label: t(`profile.reasons.${r}`),
          onPress: () => void api('/reports', { body: { targetUserId: u.id, reason: r } }).then(() => toast(t('profile.reported'), 'success')).catch((e) => toast(errorText(e), 'error')),
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  subCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.night, borderRadius: radius.lg, padding: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center' },
  dots: { position: 'absolute', top: 12, left: 14, right: 14, flexDirection: 'row', gap: 4 },
  dotBar: { flex: 1, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.45)' },
  photoTags: { position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', gap: 6 },
  stat: { alignItems: 'flex-start' },
  section: { padding: 16, gap: 10 },
  liveBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  liveDisc: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  liveText: { color: colors.white, fontFamily: fonts.bold, flex: 1, fontSize: 14 },
  liveCta: { color: colors.ink, backgroundColor: colors.card, fontFamily: fonts.black, fontSize: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  giftCell: { alignItems: 'center', width: 58, paddingVertical: 6, backgroundColor: colors.card, borderRadius: 12 },
  giftCount: { color: colors.ink, fontSize: 11, fontFamily: fonts.black },
  videoCell: { width: (W - 32 - 12) / 3, aspectRatio: 0.72, backgroundColor: colors.bgSunken, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  videoViews: { position: 'absolute', left: 5, bottom: 5, backgroundColor: colors.card, borderRadius: 6, paddingHorizontal: 4 },
  videoViewsText: { color: colors.ink, fontSize: 10, fontFamily: fonts.black },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.hairline },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, paddingHorizontal: 10 },
  callCol: { alignItems: 'flex-start', flexShrink: 1 },
  callTitle: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 17 },
  callPrice: { color: 'rgba(255,255,255,0.88)', fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
});
