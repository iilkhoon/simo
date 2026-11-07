import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, elev, fonts, noPad, radius } from '@/theme';
import { Btn, GradientCard, Header, Screen, T } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { Illustration } from '@/components/Illustration';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImage, pickStoryMedia } from '@/lib/media';
import { useStore } from '@/store';

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

/** Yeni story: 24 saat görünür. Foto və ya video (≤30 san.) */
export default function NewStory() {
  const { t } = useTranslation();
  const toast = useStore((s) => s.toast);
  const me = useStore((s) => s.me);
  const [media, setMedia] = useState<{ url: string; localUri: string; type: 'PHOTO' | 'VIDEO' } | null>(null);
  const [busy, setBusy] = useState<'pick' | 'post' | null>(null);

  async function pick(camera = false) {
    try {
      setBusy('pick');
      if (camera) {
        const u = await pickImage({ camera: true });
        if (u) setMedia({ url: u, localUri: u, type: 'PHOTO' });
        return;
      }
      const m = await pickStoryMedia();
      if (m) setMedia(m);
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!media) return;
    setBusy('post');
    try {
      await api('/stories', { body: { mediaUrl: media.url, mediaType: media.type } });
      toast(t('stories.published'), 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('stories.new')} />
      {media ? (
        <Appear from="fade" style={styles.box}>
          {media.type === 'VIDEO' ? <Preview uri={media.localUri} /> : <Image source={{ uri: media.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.4)']} style={StyleSheet.absoluteFill} />
          <View style={styles.previewTop}>
            <View style={styles.ring}><Image source={{ uri: me?.avatarUrl ?? undefined }} style={styles.ava} contentFit="cover" /></View>
            <Text style={styles.previewName} numberOfLines={1}>{me?.name}</Text>
            <View style={styles.bar}><View style={styles.barFill} /></View>
          </View>
          <Pressable onPress={() => setMedia(null)} style={styles.change}><Icon name="refresh" size={14} color={colors.ink} /><Text style={styles.changeText}>{t('post2.change')}</Text></Pressable>
        </Appear>
      ) : (
        <View style={{ flex: 1, gap: 12 }}>
          <Appear i={0} style={styles.heroCard}>
            <Illustration name="camera" size={132} />
            <T v="h2" center>{t('stories.new')}</T>
            <T v="small" color={colors.textMuted} center style={{ maxWidth: 280 }}>{t('u2.storyTips')}</T>
          </Appear>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Appear i={1} style={{ flex: 1 }}>
              <Tile g="nar" icon="image" title={t('stories.gallery')} sub={`${t('post2.pickPhoto')} · ${t('post2.pickVideo')}`} busy={busy === 'pick'} onPress={() => void pick()} />
            </Appear>
            <Appear i={2} style={{ flex: 1 }}>
              <Tile g="night" icon="camera" title={t('stories.camera')} sub={t('post2.pickPhoto')} busy={false} onPress={() => void pick(true)} />
            </Appear>
          </View>
        </View>
      )}
      <Btn title={t('stories.share')} icon="sparkles" disabled={!media} loading={busy === 'post'} onPress={publish} style={{ marginVertical: 12 }} />
    </Screen>
  );
}

function Tile({ g, icon, title, sub, busy, onPress }: { g: 'nar' | 'night'; icon: IconName; title: string; sub: string; busy: boolean; onPress: () => void }) {
  return (
    <GradientCard g={g} sh={2} onPress={busy ? undefined : onPress} inner={styles.tile}>
      <View style={styles.tileIcon}>{busy ? <ActivityIndicator color={colors.ink} /> : <Icon name={icon} size={24} color={g === 'nar' ? colors.brand : colors.ink} />}</View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub} numberOfLines={1}>{sub}</Text>
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, borderRadius: radius.xl, backgroundColor: colors.night, overflow: 'hidden' },
  previewTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ring: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: colors.brand, padding: 1.5 },
  ava: { flex: 1, borderRadius: 15, backgroundColor: colors.night3 },
  previewName: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, flexShrink: 1 },
  bar: { position: 'absolute', top: -6, left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  barFill: { width: '35%', height: '100%', backgroundColor: colors.white },
  change: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.white, ...elev(2) },
  changeText: { ...noPad, color: colors.ink, fontFamily: fonts.black, fontSize: 12.5, lineHeight: 16 },
  heroCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.xl, paddingVertical: 22, paddingHorizontal: 20 },
  tile: { padding: 16, minHeight: 150, justifyContent: 'flex-end' },
  tileIcon: { position: 'absolute', top: 16, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { ...noPad, color: colors.white, fontFamily: fonts.displayBlack, fontSize: 20, lineHeight: 26 },
  tileSub: { ...noPad, color: colors.white, opacity: 0.75, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
});
