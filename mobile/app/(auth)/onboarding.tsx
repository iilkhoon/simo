import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { colors, fonts, radius } from '@/theme';
import { Box, Btn, Chip, IconBtn, Loader, PressBox, Screen, T, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImage, syncLocation } from '@/lib/media';
import { useStore } from '@/store';
import type { Me } from '@/lib/types';

const INTERESTS = ['music', 'travel', 'cooking', 'sport', 'fitness', 'movies', 'books', 'art', 'dance', 'gaming', 'fashion', 'photo', 'nature', 'cars', 'tech', 'coffee', 'tea', 'pets', 'football', 'mugham', 'business', 'yoga', 'sea', 'mountains', 'karaoke', 'shopping', 'anime', 'poetry'];
const LOOKING = ['RELATIONSHIP', 'FRIENDSHIP', 'CHAT', 'MARRIAGE'] as const;
const STEPS = 6;

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const { toast, setMe } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [looking, setLooking] = useState<(typeof LOOKING)[number]>('RELATIONSHIP');
  const [saving, setSaving] = useState(false);

  const birth = new Date(Number(year), Number(month) - 1, Number(day));
  const validBirth = year.length === 4 && Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31 && !isNaN(birth.getTime());
  const age = validBirth ? Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400_000)) : 0;

  const canNext = [name.trim().length >= 2, !!gender, validBirth && age >= 18 && age < 100, photos.length > 0, interests.length >= 3, true][step];

  async function addPhoto() {
    setUploading(true);
    try {
      const url = await pickImage();
      if (url) setPhotos((p) => [...p, url].slice(0, 6));
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function finish() {
    setSaving(true);
    try {
      const me = await api<Me>('/me/onboarding', {
        method: 'PUT',
        body: {
          name: name.trim(), gender, birthDate: birth.toISOString(), lookingFor: looking, interests,
          languages: [i18n.language], avatarUrl: photos[0], photos,
        },
      });
      void syncLocation(true);
      setMe(me);
      toast(t('onboarding.bonus'), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.progress}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View key={i} style={[styles.progressBar, { backgroundColor: i <= step ? colors.brand : colors.card }]} />
        ))}
      </View>
      {step > 0 ? (
        <IconBtn name="back" size={40} style={{ marginVertical: 10 }} onPress={() => setStep(step - 1)} />
      ) : <View style={{ height: 62 }} />}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <T v="h1">{t('onboarding.nameTitle')}</T>
              <TextInput autoFocus value={name} onChangeText={setName} placeholder={t('onboarding.namePlaceholder')} placeholderTextColor={colors.textDim} selectionColor={colors.brand} style={styles.bigInput} maxLength={30} />
            </>
          )}
          {step === 1 && (
            <>
              <T v="h1">{t('onboarding.genderTitle')}</T>
              {(['FEMALE', 'MALE'] as const).map((g) => (
                <PressBox key={g} onPress={() => setGender(g)} r={22} sh={gender === g ? 5 : 2} bg={gender === g ? (g === 'FEMALE' ? colors.brand : colors.diamond) : colors.card} inner={styles.option}>
                  <View style={styles.optIcon}><Icon name={g === 'FEMALE' ? 'female' : 'male'} size={24} color={colors.ink} /></View>
                  <T v="h3" color={gender === g ? colors.white : colors.ink} style={{ flex: 1 }}>{g === 'FEMALE' ? t('onboarding.female') : t('onboarding.male')}</T>
                  {gender === g ? <Icon name="checkmark" color={colors.white} /> : null}
                </PressBox>
              ))}
            </>
          )}
          {step === 2 && (
            <>
              <T v="h1">{t('onboarding.birthTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('onboarding.birthSub')}</T>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput value={day} onChangeText={(v) => setDay(v.replace(/\D/g, '').slice(0, 2))} placeholder={t('onboarding.day')} keyboardType="number-pad" placeholderTextColor={colors.textDim} selectionColor={colors.brand} style={[styles.bigInput, { flex: 1, textAlign: 'center' }]} />
                <TextInput value={month} onChangeText={(v) => setMonth(v.replace(/\D/g, '').slice(0, 2))} placeholder={t('onboarding.month')} keyboardType="number-pad" placeholderTextColor={colors.textDim} selectionColor={colors.brand} style={[styles.bigInput, { flex: 1, textAlign: 'center' }]} />
                <TextInput value={year} onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))} placeholder={t('onboarding.year')} keyboardType="number-pad" placeholderTextColor={colors.textDim} selectionColor={colors.brand} style={[styles.bigInput, { flex: 1.4, textAlign: 'center' }]} />
              </View>
              {validBirth ? (
                <Tag label={age >= 18 ? t('common.years', { n: age }) : t('errors.UNDERAGE')} bg={age >= 18 ? colors.onlineSoft : colors.brandSoft} style={{ height: 28, paddingHorizontal: 10 }} />
              ) : null}
            </>
          )}
          {step === 3 && (
            <>
              <T v="h1">{t('onboarding.photoTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('onboarding.photoSub')}</T>
              <View style={styles.photos}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Pressable key={i} onPress={() => (photos[i] ? setPhotos(photos.filter((_, j) => j !== i)) : addPhoto())} style={[styles.photo, i === 0 && { borderStyle: 'solid', backgroundColor: colors.brandSoft }, photos[i] ? { borderStyle: 'solid' } : null]}>
                    {photos[i] ? (
                      <>
                        <Image source={{ uri: photos[i] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View style={styles.remove}><Icon name="close" size={14} color={colors.ink} /></View>
                      </>
                    ) : i === photos.length && uploading ? <Loader /> : <Icon name="add" size={30} color={colors.ink} />}
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {step === 4 && (
            <>
              <T v="h1">{t('onboarding.interestsTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('onboarding.interestsSub')}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {INTERESTS.map((i) => (
                  <Chip key={i} label={t(`interests.${i}`)} active={interests.includes(i)} onPress={() => setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < 10 ? [...cur, i] : cur))} />
                ))}
              </View>
            </>
          )}
          {step === 5 && (
            <>
              <T v="h1">{t('onboarding.lookingTitle')}</T>
              {LOOKING.map((l) => (
                <PressBox key={l} onPress={() => setLooking(l)} r={20} sh={looking === l ? 4 : 2} bg={looking === l ? colors.ink : colors.card} inner={styles.option}>
                  <T v="h3" color={looking === l ? colors.bg : colors.ink} style={{ flex: 1 }}>{t(`lookingFor.${l}`)}</T>
                  {looking === l ? <Icon name="checkmark" color={colors.bg} /> : null}
                </PressBox>
              ))}
              <Box bg={colors.coin} r={18} sh={3} style={{ marginTop: 8 }} inner={styles.bonus}>
                <Icon name="gift" size={22} color={colors.ink} />
                <T v="bodyStrong" style={{ flex: 1 }}>{t('onboarding.bonus')}</T>
              </Box>
            </>
          )}
        </ScrollView>
        <Btn
          title={step === STEPS - 1 ? t('onboarding.finish') : t('common.next')}
          disabled={!canNext}
          loading={saving}
          onPress={() => (step === STEPS - 1 ? finish() : setStep(step + 1))}
          style={{ marginBottom: 16 }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 5, marginTop: 8 },
  progressBar: { flex: 1, height: 8, borderRadius: 4 },
  bigInput: { backgroundColor: colors.card, borderRadius: radius.md, color: colors.ink, fontSize: 22, fontFamily: fonts.displayBold, paddingHorizontal: 16, height: 64 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  optIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: '31%', aspectRatio: 0.75, borderRadius: radius.md, backgroundColor: colors.card, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(26,21,18,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  remove: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.card, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bonus: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
