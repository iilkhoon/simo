import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, font, gradients, radius } from '@/theme';
import { Chip, GradientButton, Loader, Screen } from '@/components/ui';
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
          <View key={i} style={[styles.progressBar, { backgroundColor: i <= step ? colors.rose : colors.surface2 }]} />
        ))}
      </View>
      {step > 0 ? (
        <Pressable onPress={() => setStep(step - 1)} style={{ paddingVertical: 8 }} hitSlop={10}>
          <Icon name="back" color={colors.text} />
        </Pressable>
      ) : <View style={{ height: 38 }} />}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <Text style={font.h1}>{t('onboarding.nameTitle')}</Text>
              <TextInput autoFocus value={name} onChangeText={setName} placeholder={t('onboarding.namePlaceholder')} placeholderTextColor={colors.textDim} style={styles.bigInput} maxLength={30} />
            </>
          )}
          {step === 1 && (
            <>
              <Text style={font.h1}>{t('onboarding.genderTitle')}</Text>
              {(['FEMALE', 'MALE'] as const).map((g) => (
                <Pressable key={g} onPress={() => setGender(g)}>
                  <LinearGradient colors={gender === g ? gradients.primary : [colors.surface, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.option}>
                    <Text style={{ fontSize: 30 }}>{g === 'FEMALE' ? '👩' : '👨'}</Text>
                    <Text style={[font.h3, { flex: 1 }]}>{g === 'FEMALE' ? t('onboarding.female') : t('onboarding.male')}</Text>
                    {gender === g ? <Icon name="checkmark" /> : null}
                  </LinearGradient>
                </Pressable>
              ))}
            </>
          )}
          {step === 2 && (
            <>
              <Text style={font.h1}>{t('onboarding.birthTitle')}</Text>
              <Text style={font.small}>{t('onboarding.birthSub')}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput value={day} onChangeText={(v) => setDay(v.replace(/\D/g, '').slice(0, 2))} placeholder={t('onboarding.day')} keyboardType="number-pad" placeholderTextColor={colors.textDim} style={[styles.bigInput, { flex: 1, textAlign: 'center' }]} />
                <TextInput value={month} onChangeText={(v) => setMonth(v.replace(/\D/g, '').slice(0, 2))} placeholder={t('onboarding.month')} keyboardType="number-pad" placeholderTextColor={colors.textDim} style={[styles.bigInput, { flex: 1, textAlign: 'center' }]} />
                <TextInput value={year} onChangeText={(v) => setYear(v.replace(/\D/g, '').slice(0, 4))} placeholder={t('onboarding.year')} keyboardType="number-pad" placeholderTextColor={colors.textDim} style={[styles.bigInput, { flex: 1.4, textAlign: 'center' }]} />
              </View>
              {validBirth ? (
                <Text style={{ color: age >= 18 ? colors.online : colors.danger, fontWeight: '700', fontSize: 16 }}>
                  {age >= 18 ? t('common.years', { n: age }) : t('errors.UNDERAGE')}
                </Text>
              ) : null}
            </>
          )}
          {step === 3 && (
            <>
              <Text style={font.h1}>{t('onboarding.photoTitle')}</Text>
              <Text style={font.small}>{t('onboarding.photoSub')}</Text>
              <View style={styles.photos}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Pressable key={i} onPress={() => (photos[i] ? setPhotos(photos.filter((_, j) => j !== i)) : addPhoto())} style={[styles.photo, i === 0 && { borderColor: colors.rose }]}>
                    {photos[i] ? (
                      <>
                        <Image source={{ uri: photos[i] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View style={styles.remove}><Icon name="close" size={14} /></View>
                      </>
                    ) : i === photos.length && uploading ? <Loader /> : <Icon name="add" size={30} color={colors.textMuted} />}
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {step === 4 && (
            <>
              <Text style={font.h1}>{t('onboarding.interestsTitle')}</Text>
              <Text style={font.small}>{t('onboarding.interestsSub')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {INTERESTS.map((i) => (
                  <Chip key={i} label={t(`interests.${i}`)} active={interests.includes(i)} onPress={() => setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < 10 ? [...cur, i] : cur))} />
                ))}
              </View>
            </>
          )}
          {step === 5 && (
            <>
              <Text style={font.h1}>{t('onboarding.lookingTitle')}</Text>
              {LOOKING.map((l) => (
                <Pressable key={l} onPress={() => setLooking(l)}>
                  <LinearGradient colors={looking === l ? gradients.primary : [colors.surface, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.option}>
                    <Text style={[font.h3, { flex: 1 }]}>{t(`lookingFor.${l}`)}</Text>
                    {looking === l ? <Icon name="checkmark" /> : null}
                  </LinearGradient>
                </Pressable>
              ))}
              <LinearGradient colors={gradients.gold} style={styles.bonus}>
                <Text style={{ color: '#3A1F00', fontWeight: '800', textAlign: 'center' }}>{t('onboarding.bonus')}</Text>
              </LinearGradient>
            </>
          )}
        </ScrollView>
        <GradientButton
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
  progress: { flexDirection: 'row', gap: 6, marginTop: 8 },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  bigInput: { backgroundColor: colors.surface, borderRadius: radius.md, color: '#fff', fontSize: 22, fontWeight: '700', paddingHorizontal: 16, height: 62, borderWidth: 1, borderColor: colors.border },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: radius.lg },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: '31%', aspectRatio: 0.75, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  remove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  bonus: { padding: 14, borderRadius: radius.md, marginTop: 8 },
});
