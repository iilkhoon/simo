import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius, webNoOutline } from '@/theme';
import { Btn, Header, Screen, T, Tabs } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { MAX_VIDEO_SEC, pickImage, pickVideo } from '@/lib/media';
import { useStore } from '@/store';

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

type Kind = 'VIDEO' | 'PHOTO';

/** Post paylaşmaq: video (≤ 1:30) və ya foto; istəyə görə private (yalnız abunəçilər görür) */
export default function Upload() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: Kind; private?: string }>();
  const { me, toast } = useStore();
  const [kind, setKind] = useState<Kind>(params.type === 'PHOTO' ? 'PHOTO' : 'VIDEO');
  const [media, setMedia] = useState<{ url: string; localUri: string; durationSec: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [isPrivate, setPrivate] = useState(params.private === '1');
  const [posting, setPosting] = useState(false);
  const canPrivate = !!me?.privatePrice;

  async function pick() {
    try {
      setProgress(0);
      if (kind === 'VIDEO') {
        const v = await pickVideo(setProgress);
        if (v) setMedia(v);
      } else {
        const u = await pickImage();
        if (u) setMedia({ url: u, localUri: u, durationSec: 0 });
      }
    } catch (e) {
      toast(e instanceof Error && e.message === 'VIDEO_TOO_LONG' ? t('posts.tooLong', { n: MAX_VIDEO_SEC }) : errorText(e), 'error');
    } finally {
      setProgress(null);
    }
  }

  async function publish() {
    if (!media) return;
    setPosting(true);
    try {
      await api('/videos', { body: { url: media.url, caption, mediaType: kind, durationSec: media.durationSec, isPrivate: isPrivate && canPrivate } });
      toast(t('videos.uploaded'), 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setPosting(false);
    }
  }

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <Header title={t('posts.new')} />
      <View style={{ gap: 14, flex: 1 }}>
        <Tabs<Kind> value={kind} onChange={(k) => { setKind(k); setMedia(null); }} options={[{ key: 'VIDEO', label: t('create.video') }, { key: 'PHOTO', label: t('create.photo') }]} />
        <Pressable onPress={pick} style={styles.box}>
          {media ? (
            kind === 'VIDEO' ? <Preview uri={media.localUri} /> : <Image source={{ uri: media.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Mascot pose={kind === 'VIDEO' ? 'dance' : 'cute'} size={120} />
              <T v="bodyStrong">{progress != null ? `${Math.round(progress * 100)}%` : kind === 'VIDEO' ? t('videos.pick') : t('posts.pickPhoto')}</T>
              {kind === 'VIDEO' ? <T v="tiny" color={colors.textMuted}>{t('posts.maxLen', { n: MAX_VIDEO_SEC })}</T> : null}
            </View>
          )}
        </Pressable>
        <TextInput value={caption} onChangeText={setCaption} placeholder={t('videos.caption')} placeholderTextColor={colors.textDim} style={styles.input} multiline maxLength={300} />
        <View style={styles.privRow}>
          <View style={styles.privIcon}><Icon name="lock" size={16} color={colors.ink} /></View>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">{t('posts.private')}</T>
            <T v="tiny" color={colors.textMuted}>{canPrivate ? t('posts.privateSub') : t('posts.privateOff')}</T>
          </View>
          <Switch value={isPrivate && canPrivate} disabled={!canPrivate} onValueChange={setPrivate} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} />
        </View>
        <Btn title={t('videos.publish')} disabled={!media} loading={posting} onPress={publish} style={{ marginBottom: 12 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 220, borderRadius: radius.lg, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  input: { minWidth: 0, ...webNoOutline, backgroundColor: colors.card, borderRadius: radius.md, color: colors.ink, padding: 14, minHeight: 64, textAlignVertical: 'top', fontFamily: fonts.medium, fontSize: 15 },
  privRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 12 },
  privIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.highlight, alignItems: 'center', justifyContent: 'center' },
});
