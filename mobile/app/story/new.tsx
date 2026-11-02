import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '@/theme';
import { Btn, Header, Screen, T } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
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
  const [media, setMedia] = useState<{ url: string; localUri: string; type: 'PHOTO' | 'VIDEO' } | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(camera = false) {
    try {
      setBusy(true);
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
      setBusy(false);
    }
  }

  async function publish() {
    if (!media) return;
    setBusy(true);
    try {
      await api('/stories', { body: { mediaUrl: media.url, mediaType: media.type } });
      toast(t('stories.published'), 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={t('stories.new')} />
      {media ? (
        <View style={styles.box}>
          {media.type === 'VIDEO' ? <Preview uri={media.localUri} /> : <Image source={{ uri: media.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          <Pressable onPress={() => setMedia(null)} style={styles.change}><Icon name="refresh" size={14} color={colors.ink} /><Text style={styles.changeText}>{t('post2.change')}</Text></Pressable>
        </View>
      ) : (
        <View style={[styles.box, { backgroundColor: 'transparent', gap: 12, justifyContent: 'flex-start' }]}>
          <View style={styles.heroCard}>
            <Mascot pose="dance" size={120} />
            <T v="h3" center>{t('stories.new')}</T>
            <T v="small" color={colors.textMuted} center>{t('stories.hint')}</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignSelf: 'stretch' }}>
            <Pressable disabled={busy} onPress={() => void pick()} style={({ pressed }) => [styles.tile, { backgroundColor: colors.brand }, pressed && { transform: [{ scale: 0.97 }] }]}>
              <View style={styles.tileIcon}><Icon name="image" size={24} color={colors.brand} /></View>
              <Text style={styles.tileTitle}>{t('stories.gallery', { defaultValue: 'Qalereya' })}</Text>
              <Text style={styles.tileSub}>{t('post2.pickPhoto')} · {t('post2.pickVideo')}</Text>
            </Pressable>
            <Pressable disabled={busy} onPress={() => void pick(true)} style={({ pressed }) => [styles.tile, { backgroundColor: colors.ink }, pressed && { transform: [{ scale: 0.97 }] }]}>
              <View style={styles.tileIcon}><Icon name="camera" size={24} color={colors.ink} /></View>
              <Text style={styles.tileTitle}>{t('stories.camera', { defaultValue: 'Kamera' })}</Text>
              <Text style={styles.tileSub}>{t('post2.pickPhoto')}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <Btn title={t('stories.share')} icon="sparkles" disabled={!media} loading={busy} onPress={publish} style={{ marginVertical: 12 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, borderRadius: radius.xl, backgroundColor: colors.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  change: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.white },
  changeText: { ...noPad, color: colors.ink, fontFamily: fonts.black, fontSize: 12.5, lineHeight: 16 },
  heroCard: { alignSelf: 'stretch', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.xl, paddingVertical: 22, paddingHorizontal: 20 },
  tile: { flex: 1, borderRadius: radius.xl, padding: 16, minHeight: 150, justifyContent: 'flex-end' },
  tileIcon: { position: 'absolute', top: 16, left: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { ...noPad, color: colors.white, fontFamily: fonts.displayBlack, fontSize: 20, lineHeight: 26 },
  tileSub: { ...noPad, color: colors.white, opacity: 0.75, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
});
