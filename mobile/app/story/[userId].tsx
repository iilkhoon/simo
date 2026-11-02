import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad } from '@/theme';
import { IconBtn, Loader } from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useStore } from '@/store';
import type { StoryGroup } from '../(tabs)/index';

const PHOTO_MS = 5000;

function StoryVideo({ uri, onEnd }: { uri: string; onEnd: () => void }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; p.play(); });
  useEffect(() => {
    const sub = player.addListener('playToEnd', onEnd);
    return () => sub.remove();
  }, [player, onEnd]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

/** Story baxışı: yuxarıda irəliləmə zolaqları, sol/sağ toxunuşla keçid, foto 5 san., video sonunadək */
export default function StoryViewer() {
  const { t } = useTranslation();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const meId = useStore((s) => s.me?.id);
  const [group, setGroup] = useState<StoryGroup | null>(null);
  const [i, setI] = useState(0);
  const prog = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void api<{ items: StoryGroup[] }>('/stories/feed').then((r) => {
      const g = r.items.find((x) => x.user.id === userId);
      if (!g || !g.stories.length) return router.back();
      setGroup(g);
      const first = g.stories.findIndex((s) => !s.seen);
      setI(first >= 0 ? first : 0);
    }).catch(() => router.back());
  }, [userId]);

  const story = group?.stories[i];
  const next = useMemo(() => () => {
    if (!group) return;
    if (i < group.stories.length - 1) setI(i + 1);
    else router.back();
  }, [group, i]);

  useEffect(() => {
    if (!story) return;
    void api(`/stories/${story.id}/view`, { body: {} }).catch(() => {});
    prog.setValue(0);
    if (story.mediaType === 'PHOTO') {
      const a = Animated.timing(prog, { toValue: 1, duration: PHOTO_MS, easing: Easing.linear, useNativeDriver: false });
      a.start(({ finished }) => finished && next());
      return () => a.stop();
    }
    return undefined;
  }, [story, prog, next]);

  if (!group || !story) return <View style={{ flex: 1, backgroundColor: colors.night }}><Loader full night /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <StatusBar style="light" />
      {story.mediaType === 'VIDEO' ? <StoryVideo key={story.id} uri={story.mediaUrl} onEnd={next} /> : <Image source={{ uri: story.mediaUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />}
      <View style={styles.tap}>
        <Pressable style={{ flex: 1 }} onPress={() => setI(Math.max(0, i - 1))} />
        <Pressable style={{ flex: 2 }} onPress={next} />
      </View>
      <SafeAreaView edges={['top']} style={styles.top} pointerEvents="box-none">
        <View style={styles.bars}>
          {group.stories.map((s, k) => (
            <View key={s.id} style={styles.bar}>
              <Animated.View style={[styles.fill, { width: k < i ? '100%' : k > i ? '0%' : story.mediaType === 'PHOTO' ? prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '100%' }]} />
            </View>
          ))}
        </View>
        <View style={styles.head}>
          <Pressable style={styles.who} onPress={() => router.push({ pathname: '/user/[id]', params: { id: group.user.id } })}>
            <Avatar uri={group.user.avatarUrl} name={group.user.name} size={36} ring={false} />
            <Text style={styles.name} numberOfLines={1}>{group.user.name}</Text>
            <Text style={styles.time}>{timeAgo(story.createdAt)}</Text>
          </Pressable>
          {group.user.id === meId ? (
            <IconBtn name="trash" size={36} sh={0} bg={colors.glass} color={colors.white} onPress={() => void api(`/stories/${story.id}`, { method: 'DELETE' }).then(() => router.back())} />
          ) : null}
          <IconBtn name="close" size={36} sh={0} bg={colors.glass} color={colors.white} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
      {group.user.id !== meId ? (
        <SafeAreaView edges={['bottom']} style={styles.bottom}>
          <Pressable style={styles.reply} onPress={() => router.push({ pathname: '/user/[id]', params: { id: group.user.id } })}>
            <Text style={styles.replyText}>{t('stories.reply', { name: group.user.name })}</Text>
          </Pressable>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tap: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, paddingTop: 8 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.white },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, flexShrink: 1 },
  time: { ...noPad, color: colors.nightMuted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: 10 },
  reply: { height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', paddingHorizontal: 18 },
  replyText: { ...noPad, color: colors.white, fontFamily: fonts.medium, fontSize: 14, lineHeight: 18 },
});
