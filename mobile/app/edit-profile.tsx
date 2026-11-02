import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, font, radius } from '@/theme';
import { Btn, Chip, Header, Input, Loader, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
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

  return (
    <Screen scroll>
      <Header title={t('me.editProfile')} />
      <View style={styles.photos}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Pressable key={i} onPress={() => (photos[i] ? setPhotos(photos.filter((_, j) => j !== i)) : add())} style={[styles.photo, i === 0 && { backgroundColor: colors.brandSoft }, photos[i] ? { borderStyle: 'solid' } : null]}>
            {photos[i] ? (
              <>
                <Image source={{ uri: photos[i] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={styles.remove}><Icon name="close" size={12} /></View>
              </>
            ) : i === photos.length && uploading ? <Loader /> : <Icon name="add" size={26} color={colors.textMuted} />}
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 12, marginTop: 16 }}>
        <Input label={t('onboarding.namePlaceholder')} value={name} onChangeText={setName} maxLength={30} />
        <Input label={t('profile.about')} value={bio} onChangeText={setBio} multiline maxLength={300} style={{ height: 100, paddingTop: 14, textAlignVertical: 'top' }} />
        <Input label={t('common.city')} value={city} onChangeText={setCity} maxLength={40} />
        <Text style={font.small}>{t('onboarding.lookingTitle')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LOOKING.map((l) => <Chip key={l} label={t(`lookingFor.${l}`)} active={looking === l} onPress={() => setLooking(l)} />)}
        </View>
        <Text style={font.small}>{t('profile.interests')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {INTERESTS.map((i) => (
            <Chip key={i} label={t(`interests.${i}`)} active={interests.includes(i)} onPress={() => setInterests((c) => (c.includes(i) ? c.filter((x) => x !== i) : c.length < 10 ? [...c, i] : c))} />
          ))}
        </View>
        <Btn title={t('common.save')} loading={saving} disabled={name.trim().length < 2 || !photos.length} onPress={save} style={{ marginTop: 8 }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: '31%', aspectRatio: 0.75, borderRadius: radius.md, backgroundColor: colors.card, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(26,21,18,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  remove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
});
