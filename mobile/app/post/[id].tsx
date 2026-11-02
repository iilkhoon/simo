import React, { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad } from '@/theme';
import { IconBtn, Loader, tap } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { api } from '@/lib/api';
import { compact, timeAgo } from '@/lib/format';
import { useStore } from '@/store';
import { WEB_URL } from '@/config';
import type { Post } from '@/components/PostGrid';
import type { PublicUser } from '@/lib/types';

function Video({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

/** Tək post baxışı (profil şəbəkəsindən): bəyən, yadda saxla, paylaş; müəllif bəyənənləri görür */
export default function PostView() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const meId = useStore((s) => s.me?.id);
  const [p, setP] = useState<Post | null>(null);
  const [likers, setLikers] = useState<PublicUser[] | null>(null);
  useEffect(() => { void api<{ video: Post }>(`/videos/${id}`).then((r) => setP(r.video)).catch(() => router.back()); }, [id]);
  if (!p || !p.url) return <View style={{ flex: 1, backgroundColor: colors.night }}><Loader full night /></View>;
  const mine = p.user.id === meId;

  async function like() {
    if (!p) return;
    tap();
    setP({ ...p, liked: !p.liked, likesCount: p.likesCount + (p.liked ? -1 : 1) });
    await api(`/videos/${p.id}/like`, { method: p.liked ? 'DELETE' : 'POST', body: p.liked ? undefined : {} }).catch(() => {});
  }
  async function save() {
    if (!p) return;
    tap();
    setP({ ...p, saved: !p.saved, savesCount: p.savesCount + (p.saved ? -1 : 1) });
    await api(`/videos/${p.id}/save`, { method: p.saved ? 'DELETE' : 'POST', body: p.saved ? undefined : {} }).catch(() => {});
  }
  async function showLikers() {
    if (!p || !mine) return;
    const r = await api<{ items: { user: PublicUser }[] }>(`/videos/${p.id}/likers`).catch(() => ({ items: [] }));
    setLikers(r.items.map((x) => x.user));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar style="light" />
      {p.mediaType === 'VIDEO' ? <Video uri={p.url} /> : <Image source={{ uri: p.url }} style={StyleSheet.absoluteFill} contentFit="contain" />}
      <SafeAreaView edges={['top']} style={styles.top}>
        <IconBtn name="back" size={40} sh={0} bg={colors.glass} color={colors.white} onPress={() => router.back()} />
      </SafeAreaView>
      <View style={styles.side}>
        {[
          { icon: 'heart' as const, n: p.likesCount, on: p.liked, onPress: like, onLong: showLikers },
          { icon: (p.saved ? 'bookmark' : 'bookmarkOutline') as 'bookmark', n: p.savesCount, on: p.saved, onPress: save },
          { icon: 'share' as const, n: p.sharesCount, on: false, onPress: () => void Share.share({ message: `${p.user.name} · Simo ${WEB_URL}` }).then(() => api(`/videos/${p.id}/share`, { body: {} })) },
        ].map((b) => (
          <Pressable key={b.icon} onPress={b.onPress} onLongPress={b.onLong} style={styles.sideBtn}>
            <View style={[styles.disc, b.on && { backgroundColor: b.icon === 'heart' ? colors.brand : colors.coin }]}><Icon name={b.icon} size={22} color={b.on && b.icon === 'heart' ? colors.white : colors.ink} /></View>
            <Text style={styles.sideText}>{compact(b.n)}</Text>
          </Pressable>
        ))}
      </View>
      <SafeAreaView edges={['bottom']} style={styles.caption}>
        <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.user.id } })}>
          <Avatar uri={p.user.avatarUrl} name={p.user.name} size={34} ring={false} />
          <Text style={styles.author}>{p.user.name}</Text>
          <Text style={styles.time}>{timeAgo(p.createdAt)}</Text>
        </Pressable>
        {p.caption ? <Text style={styles.captionText}>{p.caption}</Text> : null}
        {mine ? <Pressable onPress={showLikers}><Text style={styles.likers}>{t('posts.seeLikers', { n: p.likesCount })}</Text></Pressable> : null}
      </SafeAreaView>
      {likers ? (
        <Pressable style={styles.likersWrap} onPress={() => setLikers(null)}>
          <View style={styles.likersSheet}>
            <Text style={styles.likersTitle}>{t('posts.likers')}</Text>
            {likers.map((u) => (
              <Pressable key={u.id} style={styles.likerRow} onPress={() => { setLikers(null); router.push({ pathname: '/user/[id]', params: { id: u.id } }); }}>
                <Avatar uri={u.avatarUrl} name={u.name} size={40} online={u.online} />
                <Text style={styles.likerName}>{u.name}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 14, paddingTop: 6 },
  side: { position: 'absolute', right: 12, bottom: 150, gap: 14, alignItems: 'center' },
  sideBtn: { alignItems: 'center', gap: 3 },
  disc: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  sideText: { ...noPad, color: colors.white, fontFamily: fonts.black, fontSize: 12, lineHeight: 15 },
  caption: { position: 'absolute', left: 14, right: 80, bottom: 0, paddingBottom: 18, gap: 8 },
  author: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 15, lineHeight: 19 },
  time: { ...noPad, color: colors.nightMuted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  captionText: { ...noPad, color: colors.nightText, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  likers: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, textDecorationLine: 'underline' },
  likersWrap: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  likersSheet: { backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, gap: 10, maxHeight: '70%' },
  likersTitle: { ...noPad, fontFamily: fonts.display, fontSize: 18, lineHeight: 23, color: colors.ink },
  likerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  likerName: { ...noPad, fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.ink },
});
