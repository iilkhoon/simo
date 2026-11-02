import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, radius, fonts } from '@/theme';
import { Btn, Header, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickVideo } from '@/lib/media';
import { useStore } from '@/store';

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

export default function Upload() {
  const { t } = useTranslation();
  const toast = useStore((s) => s.toast);
  const [video, setVideo] = useState<{ url: string; localUri: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  async function pick() {
    try {
      setProgress(0);
      const v = await pickVideo(setProgress);
      if (v) setVideo(v);
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setProgress(null);
    }
  }

  async function publish() {
    if (!video) return;
    setPosting(true);
    try {
      await api('/videos', { body: { url: video.url, caption } });
      toast(t('videos.uploaded'), 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setPosting(false);
    }
  }

  return (
    <Screen>
      <Header title={t('videos.upload')} />
      <View style={{ gap: 16, flex: 1 }}>
        <Pressable onPress={pick} style={styles.box}>
          {video ? <Preview uri={video.localUri} /> : null}
          {progress != null ? (
            <Text style={font.h3}>{t('videos.uploading', { p: progress })}</Text>
          ) : !video ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Icon name="video" size={48} color={colors.textMuted} />
              <Text style={font.small}>{t('videos.pick')}</Text>
            </View>
          ) : null}
        </Pressable>
        <TextInput value={caption} onChangeText={setCaption} placeholder={t('videos.caption')} placeholderTextColor={colors.textDim} style={styles.input} multiline maxLength={300} />
        <View style={{ flex: 1 }} />
        <Btn title={t('videos.publish')} disabled={!video} loading={posting} onPress={publish} style={{ marginBottom: 20 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { height: 360, borderRadius: radius.lg, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: colors.ink, borderStyle: 'dashed' },
  input: { backgroundColor: colors.card, borderRadius: radius.md, color: colors.ink, padding: 14, minHeight: 90, textAlignVertical: 'top', borderWidth: 2, borderColor: colors.ink, fontFamily: fonts.medium, fontSize: 15 },
});
