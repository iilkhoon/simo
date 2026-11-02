import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius } from '@/theme';
import { Btn, Header, Screen, T } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickStoryMedia } from '@/lib/media';
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

  async function pick() {
    try {
      setBusy(true);
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
      <Pressable onPress={pick} style={styles.box}>
        {media ? (
          media.type === 'VIDEO' ? <Preview uri={media.localUri} /> : <Image source={{ uri: media.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Mascot pose="dance" size={130} />
            <View style={styles.pick}><Icon name="image" size={18} color={colors.white} /><T v="bodyStrong" color={colors.white}>{t('stories.pick')}</T></View>
            <T v="small" color={colors.textMuted} center>{t('stories.hint')}</T>
          </View>
        )}
      </Pressable>
      <Btn title={t('stories.share')} icon="sparkles" disabled={!media} loading={busy} onPress={media ? publish : pick} style={{ marginVertical: 12 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, borderRadius: radius.xl, backgroundColor: colors.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ink, paddingHorizontal: 16, height: 42, borderRadius: 21 },
});
