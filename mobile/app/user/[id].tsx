import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { Chip, GradientButton, Loader, OutlineButton } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { GiftIcon } from '@/components/GiftIcon';
import { GiftSheet } from '@/components/GiftSheet';
import { GiftOverlay, type GiftOverlayHandle } from '@/components/GiftOverlay';
import { ActionSheet } from '@/components/ActionSheet';
import { CoinAmount, HostBadge, LevelBadge, VerifiedBadge, VipBadge } from '@/components/Badges';
import { api } from '@/lib/api';
import { compact, errorText, timeAgo } from '@/lib/format';
import { startCall } from '@/lib/calls';
import { useStore } from '@/store';
import type { PublicUser } from '@/lib/types';

const { width: W } = Dimensions.get('window');

interface Profile {
  user: PublicUser; isFollowing: boolean; followers: number; following: number; matched: boolean; liked: boolean; blocked: boolean;
  giftWall: { giftId: string; count: number }[]; videos: { id: string; thumbnailUrl: string | null; url: string; views: number }[];
  live: { id: string; type: string; title: string } | null;
}

const REASONS = ['SPAM', 'FAKE', 'NUDITY', 'HARASSMENT', 'UNDERAGE', 'SCAM', 'VIOLENCE', 'OTHER'];

export default function UserProfile() {
  const { t } = useTranslation();
  const { id, gift } = useLocalSearchParams<{ id: string; gift?: string }>();
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
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: W * 1.25 }}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(x, i) => x + i}
            onMomentumScrollEnd={(e) => setPhoto(Math.round(e.nativeEvent.contentOffset.x / W))}
            renderItem={({ item }) => <Image source={{ uri: item }} style={{ width: W, height: W * 1.25 }} contentFit="cover" />}
          />
          <LinearGradient colors={['rgba(18,7,31,0.6)', 'transparent', 'transparent', colors.bg]} locations={[0, 0.2, 0.7, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <View style={[styles.topBar, { top: insets.top + 6 }]}>
            <Pressable onPress={() => router.back()} style={styles.round}><Icon name="back" size={22} /></Pressable>
            <View style={styles.dots}>
              {photos.length > 1 && photos.map((_, i) => <View key={i} style={[styles.dotBar, i === photo && { backgroundColor: '#fff' }]} />)}
            </View>
            {!isMe ? <Pressable onPress={() => setMenu(true)} style={styles.round}><Icon name="more" size={22} /></Pressable> : <View style={{ width: 40 }} />}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -40, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[font.h1, { flexShrink: 1 }]}>{u.name}{u.age ? `, ${u.age}` : ''}</Text>
            {u.verified ? <VerifiedBadge size={24} /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {u.isHost ? <HostBadge /> : null}
            <VipBadge tier={u.vipTier} />
            <LevelBadge kind="wealth" level={u.wealthLevel} />
            <LevelBadge kind="charm" level={u.charmLevel} />
            <Text style={font.small}>{t('common.id', { id: u.shortId })}</Text>
          </View>
          <Text style={font.small}>
            {u.online ? `🟢 ${t('common.online')}` : u.lastSeenAt ? t('profile.lastSeen', { t: timeAgo(u.lastSeenAt) }) : ''}
            {u.distanceKm != null ? `  ·  📍 ${t('common.km', { n: u.distanceKm })}` : u.city ? `  ·  📍 ${u.city}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center' }}>
            <Text style={font.body}><Text style={{ fontWeight: '800' }}>{compact(p.followers)}</Text> <Text style={font.small}>{t('common.followers')}</Text></Text>
            {!isMe ? (
              p.isFollowing ? <OutlineButton small title={t('common.following')} onPress={toggleFollow} /> : <GradientButton small title={t('common.follow')} icon="add" onPress={toggleFollow} />
            ) : (
              <OutlineButton small title={t('common.edit')} icon="settings" onPress={() => router.push('/edit-profile')} />
            )}
          </View>

          {p.live ? (
            <Pressable onPress={() => router.push({ pathname: '/live/[id]', params: { id: p.live!.id } })}>
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.liveBanner}>
                <Icon name="live" />
                <Text style={{ color: '#fff', fontWeight: '800', flex: 1 }}>{t('profile.liveNow')}: {p.live.title}</Text>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{t('profile.watch')} ›</Text>
              </LinearGradient>
            </Pressable>
          ) : null}

          {u.bio ? (
            <View style={styles.section}>
              <Text style={font.h3}>{t('profile.about')}</Text>
              <Text style={[font.body, { color: colors.textMuted, lineHeight: 21 }]}>{u.bio}</Text>
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={font.h3}>{t(`lookingFor.${u.lookingFor}`)}</Text>
            {u.interests.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {u.interests.map((i) => <Chip key={i} label={t(`interests.${i}`)} active={me?.interests.includes(i)} />)}
              </View>
            ) : null}
          </View>
          {p.giftWall.length ? (
            <View style={styles.section}>
              <Text style={font.h3}>🎁 {t('profile.giftWall')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {p.giftWall.map((g) => (
                  <View key={g.giftId} style={styles.giftCell}>
                    <GiftIcon id={g.giftId} size={40} />
                    <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700' }}>×{compact(g.count)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {p.videos.length ? (
            <View style={styles.section}>
              <Text style={font.h3}>{t('profile.videos')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {p.videos.map((v) => (
                  <View key={v.id} style={styles.videoCell}>
                    {v.thumbnailUrl ? <Image source={{ uri: v.thumbnailUrl }} style={StyleSheet.absoluteFill} /> : <Icon name="play" size={28} color={colors.textMuted} />}
                    <Text style={styles.videoViews}>▶ {compact(v.views)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {!isMe ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable onPress={message} style={styles.barBtn}>
            <Icon name="chat" size={24} color={colors.violet} />
            <Text style={styles.barText}>{t('profile.message')}</Text>
          </Pressable>
          <Pressable onPress={() => void startCall(u.id, 'VOICE')} style={styles.barBtn}>
            <Icon name="call" size={24} color={colors.online} />
            {u.isHost ? <CoinAmount n={`${u.voiceCallPrice}${t('common.perMin')}`} size={11} /> : <Text style={styles.barText}>{t('profile.voiceCall')}</Text>}
          </Pressable>
          <Pressable onPress={() => void startCall(u.id, 'VIDEO')} style={{ flex: 1.4 }}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.videoBtn}>
              <Icon name="videocam" size={24} />
              <View>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{t('profile.videoCall')}</Text>
                {u.isHost ? <Text style={{ color: '#fff', fontSize: 11, opacity: 0.9 }}>{u.videoCallPrice} {t('common.coins')}{t('common.perMin')}</Text> : null}
              </View>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => setGiftOpen(true)} style={styles.barBtn}>
            <Icon name="gift" size={24} color={colors.gold} />
            <Text style={styles.barText}>{t('profile.gift')}</Text>
          </Pressable>
        </View>
      ) : null}

      <GiftOverlay ref={overlay} />
      <GiftSheet visible={giftOpen} onClose={() => setGiftOpen(false)} receiverId={u.id} context="PROFILE" onSent={(e) => { overlay.current?.push(e); toast(t('gifts.sent'), 'success'); void load(); }} />
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
  topBar: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  dots: { flex: 1, flexDirection: 'row', gap: 4, marginHorizontal: 12 },
  dotBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  liveBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md },
  giftCell: { alignItems: 'center', width: 60 },
  videoCell: { width: (W - 32 - 32 - 8) / 3, aspectRatio: 0.7, backgroundColor: colors.surface2, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  videoViews: { position: 'absolute', left: 6, bottom: 4, color: '#fff', fontSize: 11, fontWeight: '700' },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 10, backgroundColor: 'rgba(18,7,31,0.97)', borderTopWidth: 1, borderColor: colors.border },
  barBtn: { flex: 1, alignItems: 'center', gap: 3 },
  barText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  videoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: radius.pill },
});
