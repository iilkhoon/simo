import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '@/theme';
import { Btn, Chip, Header, Input, Loader, Screen, T, Tag } from '@/components/ui';
import { Appear, Pressable3 } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { FieldError } from '@/components/AuthKit';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImage } from '@/lib/media';
import { useStore } from '@/store';
import type { Me } from '@/lib/types';

const INTERESTS = ['music', 'travel', 'cooking', 'sport', 'fitness', 'movies', 'books', 'art', 'dance', 'gaming', 'fashion', 'photo', 'nature', 'cars', 'tech', 'coffee', 'tea', 'pets', 'football', 'mugham', 'business', 'yoga', 'sea', 'mountains', 'karaoke', 'shopping', 'anime', 'poetry'];
const LOOKING = ['RELATIONSHIP', 'FRIENDSHIP', 'CHAT', 'MARRIAGE'] as const;

export default function EditProfile() {
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [name, setName] = useState(me?.name ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [city, setCity] = useState(me?.city ?? '');
  const [photos, setPhotos] = useState<string[]>(me?.photos.length ? me.photos : me?.avatarUrl ? [me.avatarUrl] : []);
  const [interests, setInterests] = useState<string[]>(me?.interests ?? []);
  const [looking, setLooking] = useState(me?.lookingFor ?? 'RELATIONSHIP');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function add() {
    setUploading(true);
    try {
      const u = await pickImage();
      if (u) setPhotos((p) => [...p, u].slice(0, 6));
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api('/me/photos', { method: 'PUT', body: { photos } });
      setMe(await api<Me>('/me', { method: 'PATCH', body: { name: name.trim(), bio, city, interests, lookingFor: looking, avatarUrl: photos[0] } }));
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  const nameErr = name.trim().length < 2 ? t('u2.nameShort') : null;
  return (
    <Screen scroll>
      <Header title={t('me.editProfile')} right={
        <Pressable3 disabled={!!nameErr || !photos.length || saving} onPress={save} scaleTo={0.92} style={[styles.savePill, (!!nameErr || !photos.length) && { backgroundColor: colors.bgSunken }]}>
          <T v="small" color={nameErr || !photos.length ? colors.textDim : colors.white} style={{ fontFamily: fonts.bold }}>{t('common.save')}</T>
        </Pressable3>
      } />
      <Appear i={0}>
        <View style={styles.photos}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Pressable3 key={i} scaleTo={0.95} onPress={() => (photos[i] ? setPhotos(photos.filter((_, j) => j !== i)) : add())} style={[styles.photo, i === 0 && !photos[i] && { backgroundColor: colors.brandSoft, borderColor: 'rgba(242,52,79,0.35)' }, photos[i] ? { borderStyle: 'solid', borderColor: 'transparent' } : null]}>
              {photos[i] ? (
                <>
                  <Image source={{ uri: photos[i] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={styles.remove}><Icon name="close" size={12} color={colors.white} /></View>
                  {i === 0 ? <View style={styles.mainTag}><T v="tiny" color={colors.white}>{t('u2.mainPhoto')}</T></View> : null}
                </>
              ) : i === photos.length && uploading ? <Loader /> : <View style={styles.addDisc}><Icon name="add" size={20} color={i === 0 ? colors.white : colors.ink} /></View>}
            </Pressable3>
          ))}
        </View>
        <T v="small" color={colors.textDim} style={{ marginTop: 10 }}>{t('u2.photosHint')}</T>
        {!photos.length ? <FieldError text={t('onboarding.photoSub')} style={{ marginTop: 6 }} /> : null}
      </Appear>
      <Appear i={1} style={{ gap: 12, marginTop: 18 }}>
        <View style={{ gap: 6 }}>
          <Input label={t('onboarding.namePlaceholder')} value={name} onChangeText={setName} maxLength={30} autoCapitalize="words" />
          <FieldError text={nameErr} />
        </View>
        <View style={{ gap: 6 }}>
          <Input label={t('profile.about')} value={bio} onChangeText={setBio} multiline maxLength={300} style={{ height: 100, paddingTop: 14, textAlignVertical: 'top' }} />
          <T v="tiny" color={colors.textDim} style={{ alignSelf: 'flex-end' }}>{bio.length}/300</T>
        </View>
        <Input label={t('common.city')} value={city} onChangeText={setCity} maxLength={40} left={<Icon name="location" size={18} color={colors.textDim} />} />
        <T v="label" color={colors.textMuted} style={{ marginTop: 4 }}>{t('onboarding.lookingTitle')}</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LOOKING.map((l) => <Chip key={l} label={t(`lookingFor.${l}`)} active={looking === l} onPress={() => setLooking(l)} />)}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <T v="label" color={colors.textMuted} style={{ flex: 1 }}>{t('profile.interests')}</T>
          <Tag label={t('u2.picked', { n: interests.length })} bg={interests.length >= 3 ? colors.onlineSoft : colors.brandSoft} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {INTERESTS.map((i) => (
            <Chip key={i} label={t(`interests.${i}`)} active={interests.includes(i)} onPress={() => setInterests((c) => (c.includes(i) ? c.filter((x) => x !== i) : c.length < 10 ? [...c, i] : c))} />
          ))}
        </View>
        <Btn title={t('common.save')} icon="checkmark" loading={saving} disabled={!!nameErr || !photos.length} onPress={save} style={{ marginTop: 8 }} />
      </Appear>
    </Screen>
  );
}

const PHOTO_W = (Dimensions.get('window').width - 32 - 20) / 3;

const styles = StyleSheet.create({
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: PHOTO_W, aspectRatio: 0.75, borderRadius: radius.md, backgroundColor: colors.card, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(26,21,18,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  remove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  mainTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: colors.brand, borderRadius: 9, paddingHorizontal: 7, height: 18, justifyContent: 'center' },
  addDisc: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  savePill: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
});
