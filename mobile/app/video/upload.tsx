import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius, webNoOutline } from '@/theme';
import { Btn, Chip, GradientCard, Header, Screen, T } from '@/components/ui';
import { Appear, Pressable3 } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { api } from '@/lib/api';
import { dateTime, errorText } from '@/lib/format';
import { MAX_VIDEO_SEC, pickImage, pickVideo } from '@/lib/media';
import { useStore } from '@/store';

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />;
}

type Kind = 'VIDEO' | 'PHOTO';
type Audience = 'PUBLIC' | 'TEASER' | 'FULL';
type When = 'now' | 'in1h' | 'tonight' | 'tomorrow';
const MAX_TAGS = 5;

function whenDate(w: When): Date | null {
  const d = new Date();
  if (w === 'now') return null;
  if (w === 'in1h') return new Date(d.getTime() + 3600_000);
  if (w === 'tonight') { const x = new Date(d); x.setHours(20, 0, 0, 0); return x.getTime() - d.getTime() < 10 * 60_000 ? new Date(x.getTime() + 86400_000) : x; }
  const x = new Date(d.getTime() + 86400_000); x.setHours(12, 0, 0, 0); return x;
}

/**
 * Post paylaşmaq: video (≤ 1:30) və ya foto.
 * Auditoriya: hamı · demo (lentdə bulanıq önizləmə, tam versiya abunəçilərə) · tam xüsusi (yalnız abunəçilər).
 * Heşteq (ən çox 5, populyarlardan təkliflər), məkan, paylaşma vaxtı (planlama), şərhləri bağlamaq.
 */
export default function Upload() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: Kind; private?: string }>();
  const { me, toast } = useStore();
  const [kind, setKind] = useState<Kind>(params.type === 'PHOTO' ? 'PHOTO' : 'VIDEO');
  const [media, setMedia] = useState<{ url: string; localUri: string; durationSec: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [suggest, setSuggest] = useState<{ tag: string; count: number }[]>([]);
  const [location, setLocation] = useState('');
  const canPrivate = !!me?.privatePrice;
  const [audience, setAudience] = useState<Audience>(params.private === '1' && canPrivate ? 'TEASER' : 'PUBLIC');
  const [when, setWhen] = useState<When>('now');
  const [comments, setComments] = useState(true);
  const [posting, setPosting] = useState(false);

  // Mətndəki #heşteqlər + əlavə edilənlər (cəmi ≤ 5)
  const captionTags = useMemo(() => [...new Set((caption.match(/#[\p{L}\d_]+/gu) ?? []).map((h) => h.slice(1).toLowerCase()))], [caption]);
  const allTags = useMemo(() => [...new Set([...captionTags, ...tags])], [captionTags, tags]);
  const tooMany = allTags.length > MAX_TAGS;

  useEffect(() => {
    const q = tagInput.replace(/^#/, '').trim().toLowerCase();
    const h = setTimeout(() => {
      void api<{ items: { tag: string; count: number }[] }>(`/hashtags/search?q=${encodeURIComponent(q)}`).then((r) => setSuggest(r.items.filter((x) => !allTags.includes(x.tag)).slice(0, 8))).catch(() => {});
    }, 250);
    return () => clearTimeout(h);
  }, [tagInput, allTags]);

  function addTag(raw: string) {
    const v = raw.replace(/^#/, '').trim().toLowerCase().replace(/[^\p{L}\d_]/gu, '').slice(0, 30);
    if (!v || allTags.includes(v)) { setTagInput(''); return; }
    if (allTags.length >= MAX_TAGS) { toast(t('errors.HASHTAG_LIMIT'), 'error'); return; }
    setTags((x) => [...x, v]);
    setTagInput('');
  }

  async function pick(k: Kind, camera = false) {
    setKind(k);
    try {
      setProgress(0);
      if (k === 'VIDEO') {
        const v = await pickVideo(setProgress);
        if (v) setMedia(v);
      } else {
        const u = await pickImage({ camera });
        if (u) setMedia({ url: u, localUri: u, durationSec: 0 });
      }
    } catch (e) {
      toast(e instanceof Error && e.message === 'VIDEO_TOO_LONG' ? t('posts.tooLong', { n: MAX_VIDEO_SEC }) : errorText(e), 'error');
    } finally {
      setProgress(null);
    }
  }

  async function publish() {
    if (!media || tooMany) return;
    setPosting(true);
    const at = whenDate(when);
    try {
      await api('/videos', {
        body: {
          url: media.url, caption, mediaType: kind, durationSec: media.durationSec,
          isPrivate: audience !== 'PUBLIC' && canPrivate, teaser: audience === 'TEASER',
          hashtags: tags, location: location.trim(), commentsOff: !comments,
          ...(at ? { scheduledAt: at.toISOString() } : {}),
        },
      });
      toast(at ? t('post2.scheduled') : t('videos.uploaded'), 'success');
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setPosting(false);
    }
  }

  const at = whenDate(when);

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <Header title={t('posts.new')} />
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* 1) Media */}
        {media ? (
          <View style={styles.preview}>
            {kind === 'VIDEO' ? <Preview uri={media.localUri} /> : <Image source={{ uri: media.localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
            <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
            <View style={styles.previewTop}>
              <View style={styles.kindPill}><Icon name={kind === 'VIDEO' ? 'videocam' : 'image'} size={13} color={colors.white} /><Text style={styles.kindText}>{kind === 'VIDEO' ? `${t('post2.pickVideo')} · ${media.durationSec}s` : t('post2.pickPhoto')}</Text></View>
            </View>
            <Pressable onPress={() => pick(kind)} style={styles.changeBtn}><Icon name="refresh" size={14} color={colors.ink} /><Text style={styles.changeText}>{t('post2.change')}</Text></Pressable>
            {audience !== 'PUBLIC' ? <View style={styles.lockPill}><Icon name="lock" size={12} color={colors.ink} /><Text style={styles.changeText}>{t(audience === 'TEASER' ? 'post2.teaser' : 'post2.full')}</Text></View> : null}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <T v="h3">{t('post2.pickTitle')}</T>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Appear i={0} style={{ flex: 1 }}><PickTile icon="videocam" title={t('post2.pickVideo')} sub={t('post2.pickVideoSub')} g="nar" accent={colors.brand} onPress={() => pick('VIDEO')} busy={kind === 'VIDEO' ? progress : null} /></Appear>
              <Appear i={1} style={{ flex: 1 }}><PickTile icon="image" title={t('post2.pickPhoto')} sub={t('post2.pickPhotoSub')} g="night" accent={colors.ink} onPress={() => pick('PHOTO')} busy={kind === 'PHOTO' ? progress : null} /></Appear>
            </View>
            <Appear i={2}>
              <Pressable3 scaleTo={0.98} onPress={() => pick('PHOTO', true)} style={styles.cameraRow}>
                <View style={styles.audIcon}><Icon name="camera" size={18} color={colors.ink} /></View>
                <T v="bodyStrong" style={{ flex: 1 }}>{t('stories.camera')}</T>
                <Icon name="chevron" size={16} color={colors.textDim} />
              </Pressable3>
            </Appear>
          </View>
        )}

        {/* 2) Təsvir */}
        <TextInput value={caption} onChangeText={setCaption} placeholder={t('videos.caption')} placeholderTextColor={colors.textDim} style={styles.caption} multiline maxLength={300} />

        {/* 3) Heşteqlər */}
        <Section title={t('post2.hashtags')} right={<Text style={[styles.counter, tooMany && { color: colors.brand }]}>{t('post2.hashtagsMax', { n: allTags.length })}</Text>}>
          {allTags.length ? (
            <View style={styles.wrap}>
              {allTags.map((h) => (
                <Pressable key={h} onPress={() => setTags((x) => x.filter((y) => y !== h))} style={styles.tag}>
                  <Text style={styles.tagText}>#{h}</Text>
                  {tags.includes(h) ? <Icon name="close" size={12} color={colors.white} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.tagInputRow}>
            <Text style={styles.hash}>#</Text>
            <TextInput value={tagInput} onChangeText={(v) => (/[\s,]$/.test(v) ? addTag(v) : setTagInput(v))} onSubmitEditing={() => addTag(tagInput)} placeholder={t('post2.hashtagsPh')} placeholderTextColor={colors.textDim} style={styles.tagInput} autoCapitalize="none" returnKeyType="done" editable={allTags.length < MAX_TAGS} />
            {tagInput ? <Pressable onPress={() => addTag(tagInput)} style={styles.addBtn}><Icon name="add" size={18} color={colors.white} /></Pressable> : null}
          </View>
          {suggest.length && allTags.length < MAX_TAGS ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {suggest.map((s) => <Chip key={s.tag} label={`#${s.tag} · ${s.count}`} onPress={() => addTag(s.tag)} />)}
            </ScrollView>
          ) : null}
        </Section>

        {/* 4) Məkan */}
        <Section title={t('post2.location')}>
          <View style={styles.tagInputRow}>
            <Icon name="location" size={18} color={colors.textMuted} />
            <TextInput value={location} onChangeText={(v) => setLocation(v.slice(0, 60))} placeholder={t('post2.locationPh')} placeholderTextColor={colors.textDim} style={styles.tagInput} />
            {location ? <Pressable onPress={() => setLocation('')} hitSlop={8}><Icon name="close" size={16} color={colors.textMuted} /></Pressable> : null}
          </View>
          {me?.city && location !== me.city ? <Chip icon="location" label={`${t('post2.useCity')}: ${me.city}`} onPress={() => setLocation(me.city)} style={{ alignSelf: 'flex-start' }} /> : null}
        </Section>

        {/* 5) Kim görsün */}
        <Section title={t('post2.audience')}>
          {(['PUBLIC', 'TEASER', 'FULL'] as const).map((a) => {
            const locked = a !== 'PUBLIC' && !canPrivate;
            const on = audience === a;
            const icon: IconName = a === 'PUBLIC' ? 'globe' : a === 'TEASER' ? 'eye' : 'lock';
            return (
              <Pressable key={a} disabled={locked} onPress={() => setAudience(a)} style={[styles.aud, on && styles.audOn, locked && { opacity: 0.5 }]}>
                <View style={[styles.audIcon, on && { backgroundColor: colors.brand }]}><Icon name={icon} size={17} color={on ? colors.white : colors.ink} /></View>
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong">{t(a === 'PUBLIC' ? 'post2.public' : a === 'TEASER' ? 'post2.teaser' : 'post2.full')}</T>
                  <T v="tiny" color={colors.textMuted}>{t(a === 'PUBLIC' ? 'post2.publicSub' : a === 'TEASER' ? 'post2.teaserSub' : 'post2.fullSub')}</T>
                </View>
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
              </Pressable>
            );
          })}
          {!canPrivate ? (
            <Pressable onPress={() => router.push('/host-settings')} style={styles.needPrice}>
              <Icon name="lock" size={14} color={colors.ink} />
              <T v="tiny" style={{ flex: 1 }}>{t('post2.needPrice')}</T>
              <T v="tiny" color={colors.brand} style={{ fontFamily: fonts.black }}>{t('post2.setPrice')}</T>
            </Pressable>
          ) : null}
        </Section>

        {/* 6) Paylaşma vaxtı */}
        <Section title={t('post2.schedule')}>
          <View style={styles.wrap}>
            {(['now', 'in1h', 'tonight', 'tomorrow'] as const).map((w) => <Chip key={w} icon={w === 'now' ? 'thunder' : 'time'} label={t(`post2.${w}`)} active={when === w} onPress={() => setWhen(w)} />)}
          </View>
          {at ? <T v="tiny" color={colors.textMuted}>{t('post2.scheduledFor', { t: dateTime(at.toISOString()) })}</T> : null}
        </Section>

        {/* 7) Şərhlər */}
        <View style={styles.toggle}>
          <View style={styles.audIcon}><Icon name="chat" size={17} color={colors.ink} /></View>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">{t('post2.comments')}</T>
            <T v="tiny" color={colors.textMuted}>{t('post2.commentsSub')}</T>
          </View>
          <Switch value={comments} onValueChange={setComments} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} />
        </View>
      </ScrollView>
      <Btn title={at ? t('post2.scheduleBtn') : t('post2.share')} icon={at ? 'time' : 'send'} disabled={!media || tooMany} loading={posting} onPress={publish} style={{ marginBottom: 12 }} />
    </Screen>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T v="label" color={colors.textMuted} style={{ flex: 1 }}>{title}</T>
        {right}
      </View>
      {children}
    </View>
  );
}

function PickTile({ icon, title, sub, g, accent, onPress, busy }: { icon: IconName; title: string; sub: string; g: 'nar' | 'night'; accent: string; onPress: () => void; busy: number | null }) {
  return (
    <GradientCard g={g} sh={2} onPress={busy != null ? undefined : onPress} inner={styles.tile}>
      <View style={styles.tileIcon}><Icon name={icon} size={26} color={accent} /></View>
      <Text style={[styles.tileTitle, { color: colors.white }]}>{busy != null ? `${Math.round(busy * 100)}%` : title}</Text>
      <Text style={[styles.tileSub, { color: colors.white }]}>{sub}</Text>
      {busy != null ? <View style={[styles.tileBar, { width: `${Math.max(6, busy * 100)}%` }]} /> : null}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  preview: { aspectRatio: 3 / 4, maxHeight: 460, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.night, alignSelf: 'stretch' },
  previewTop: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row' },
  kindPill: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.45)' },
  kindText: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15 },
  changeBtn: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.white },
  changeText: { ...noPad, color: colors.ink, fontFamily: fonts.black, fontSize: 12.5, lineHeight: 16 },
  lockPill: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.coin },
  tile: { padding: 16, paddingTop: 18, minHeight: 168, justifyContent: 'flex-end' },
  tileIcon: { position: 'absolute', top: 16, left: 16, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 22, lineHeight: 28 },
  tileSub: { ...noPad, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, opacity: 0.75 },
  tileBar: { position: 'absolute', left: 0, bottom: 0, height: 4, backgroundColor: colors.coin },
  cameraRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, paddingLeft: 12, paddingRight: 16, height: 60 },
  caption: { minWidth: 0, ...webNoOutline, backgroundColor: colors.card, borderRadius: radius.lg, color: colors.ink, padding: 16, minHeight: 88, textAlignVertical: 'top', fontFamily: fonts.medium, fontSize: 15 },
  counter: { ...noPad, fontFamily: fonts.black, fontSize: 12, lineHeight: 15, color: colors.textMuted },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.ink },
  tagText: { ...noPad, color: colors.white, fontFamily: fonts.bold, fontSize: 13, lineHeight: 16 },
  tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md, paddingLeft: 14, paddingRight: 6, height: 50 },
  hash: { ...noPad, fontFamily: fonts.displayBlack, fontSize: 18, lineHeight: 22, color: colors.brand },
  tagInput: { flex: 1, minWidth: 0, ...webNoOutline, color: colors.ink, fontFamily: fonts.semibold, fontSize: 15, height: 50 },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  aud: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, borderWidth: 2, borderColor: 'transparent' },
  audOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  audIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textDim, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  needPrice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.highlight, borderRadius: radius.md, padding: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 },
});
