import React, { useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from '../../src/lib/keyboard';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { colors, fonts, noPad, radius, webNoOutline } from '@/theme';
import { Box, Btn, Chip, IconBtn, Loader, PressBox, Screen, T, Tag } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Mascot, type MascotPose } from '@/components/Mascot';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImage, syncLocation } from '@/lib/media';
import { useStore } from '@/store';
import type { Me, NotifPrefs, ProfileExtra } from '@/lib/types';

const INTERESTS = ['music', 'travel', 'cooking', 'sport', 'fitness', 'movies', 'books', 'art', 'dance', 'gaming', 'fashion', 'photo', 'nature', 'cars', 'tech', 'coffee', 'tea', 'pets', 'football', 'mugham', 'business', 'yoga', 'sea', 'mountains', 'karaoke', 'shopping', 'anime', 'poetry'];
const LOOKING = ['RELATIONSHIP', 'FRIENDSHIP', 'CHAT', 'MARRIAGE'] as const;
const EDU = ['SCHOOL', 'COLLEGE', 'BACHELOR', 'MASTER', 'PHD'];
const HABITS = ['NO', 'SOMETIMES', 'YES'];
const KIDS = ['NONE', 'HAVE', 'WANT', 'NOT_WANT'];
const COMM = ['TEXT', 'VOICE', 'VIDEO', 'LIVE'];
const TIMES = ['MORNING', 'DAY', 'EVENING', 'NIGHT'];
const PERS = ['INTROVERT', 'AMBIVERT', 'EXTROVERT'];
const IDEAS = ['tea', 'dinner', 'cinema', 'nature', 'sea', 'concert', 'walk', 'coffee'];
const MUSIC = ['pop', 'mugham', 'rap', 'rock', 'jazz', 'classic', 'electronic', 'folk'];
const NOTIF = ['messages', 'calls', 'likes', 'follows', 'visits', 'subscriptions', 'lives', 'offers', 'smart'] as const;

/**
 * Onboarding 2.0 — 11 addım: 7 məcburi (ad, cins, doğum tarixi, foto, kimi görmək istəyir, maraqlar, məqsəd)
 * və 4 opsional (haqqında, ünsiyyət üslubu, görüş və musiqi zövqü, bildirişlər) — "Keç" ilə ötürülə bilər.
 * Cavablar profildə görünür və şəxsi alqoritmə ilk siqnal olur (soyuq start).
 */
type Step = { key: string; required: boolean; pose: MascotPose };
const STEPS: Step[] = [
  { key: 'name', required: true, pose: 'wave' },
  { key: 'gender', required: true, pose: 'cute' },
  { key: 'birth', required: true, pose: 'think' },
  { key: 'photos', required: true, pose: 'shy' },
  { key: 'showMe', required: true, pose: 'search' },
  { key: 'interests', required: true, pose: 'music' },
  { key: 'looking', required: true, pose: 'love' },
  { key: 'about', required: false, pose: 'coffee' },
  { key: 'style', required: false, pose: 'call' },
  { key: 'vibe', required: false, pose: 'rose' },
  { key: 'notif', required: false, pose: 'thumbs' },
];

export default function Onboarding() {
  const enterV = React.useRef(new Animated.Value(1)).current;
  const prevStep = React.useRef(0);
  const [dir, setDir] = React.useState(1);
  const { t, i18n } = useTranslation();
  const { toast, setMe } = useStore();
  // Yalnız önizləmə build-ində (EXPO_PUBLIC_PREVIEW=1): ?step=N — ekran şəkilləri üçün
  const preview = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState(process.env.EXPO_PUBLIC_PREVIEW === '1' && preview.step ? Number(preview.step) : 0);
  React.useEffect(() => {
    setDir(step >= prevStep.current ? 1 : -1);
    prevStep.current = step;
    enterV.setValue(0);
    Animated.spring(enterV, { toValue: 1, damping: 18, stiffness: 160, useNativeDriver: true }).start();
  }, [step, enterV]);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showMe, setShowMe] = useState<'MALE' | 'FEMALE' | 'ALL' | null>(null);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(35);
  const [interests, setInterests] = useState<string[]>([]);
  const [looking, setLooking] = useState<(typeof LOOKING)[number]>('RELATIONSHIP');
  const [extra, setExtra] = useState<ProfileExtra>({});
  const [notif, setNotif] = useState<NotifPrefs>({});
  const [saving, setSaving] = useState(false);

  const birth = new Date(Number(year), Number(month) - 1, Number(day));
  const validBirth = year.length === 4 && Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31 && !isNaN(birth.getTime());
  const age = validBirth ? Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400_000)) : 0;
  const cur = STEPS[step];
  const last = step === STEPS.length - 1;

  // Cins seçiləndə "kimi göstərək" və yaş aralığı üçün ağıllı defolt
  React.useEffect(() => {
    if (!gender || showMe) return;
    setShowMe(gender === 'MALE' ? 'FEMALE' : 'MALE');
  }, [gender, showMe]);
  React.useEffect(() => {
    if (!age) return;
    setAgeMin(Math.max(18, gender === 'FEMALE' ? age - 2 : age - 8));
    setAgeMax(Math.min(80, gender === 'FEMALE' ? age + 10 : age + 4));
  }, [age, gender]);

  const canNext: Record<string, boolean> = {
    name: name.trim().length >= 2, gender: !!gender, birth: validBirth && age >= 18 && age < 100, photos: photos.length > 0,
    showMe: !!showMe && ageMin <= ageMax, interests: interests.length >= 3, looking: true, about: true, style: true, vibe: true, notif: true,
  };

  const setX = <K extends keyof ProfileExtra>(k: K, v: ProfileExtra[K]) => setExtra((e) => ({ ...e, [k]: v }));
  const toggleIn = (k: 'comm' | 'activeTimes' | 'dateIdeas' | 'music', v: string, max = 6) =>
    setExtra((e) => { const arr = (e[k] as string[] | undefined) ?? []; return { ...e, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : arr.length < max ? [...arr, v] : arr }; });

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
          interestedIn: showMe === 'ALL' ? null : showMe, ageMin, ageMax,
          languages: [i18n.language], avatarUrl: photos[0], photos, extra,
          ...(Object.keys(notif).length ? { notifPrefs: notif } : {}),
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

  const next = () => (last ? finish() : setStep(step + 1));

  return (
    <Screen>
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View key={s.key} style={[styles.progressBar, { backgroundColor: i <= step ? (s.required ? colors.brand : colors.coin) : colors.card }]} />
        ))}
      </View>
      <View style={styles.headRow}>
        {step > 0 ? <IconBtn name="back" size={40} onPress={() => setStep(step - 1)} /> : <View style={{ width: 40 }} />}
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <T v="label" color={colors.textMuted}>{t('ob.stepOf', { n: step + 1, total: STEPS.length })}</T>
          <Tag label={cur.required ? t('ob.required') : t('ob.optional')} bg={cur.required ? colors.brandSoft : colors.highlight} style={{ height: 22, paddingHorizontal: 8 }} />
        </View>
        <Mascot key={step} pose={cur.pose} size={64} />
      </View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Animated.ScrollView
          key={step}
          style={{ opacity: enterV, transform: [{ translateX: enterV.interpolate({ inputRange: [0, 1], outputRange: [dir * 40, 0] }) }] }}
          contentContainerStyle={{ gap: 16, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {cur.key === 'name' && (
            <>
              <T v="h1">{t('onboarding.nameTitle')}</T>
              <TextInput autoFocus value={name} onChangeText={setName} placeholder={t('onboarding.namePlaceholder')} placeholderTextColor={colors.textDim} selectionColor={colors.brand} style={styles.bigInput} maxLength={30} />
            </>
          )}
          {cur.key === 'gender' && (
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
          {cur.key === 'birth' && (
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
          {cur.key === 'photos' && (
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
          {cur.key === 'showMe' && (
            <>
              <T v="h1">{t('ob.showMeTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('ob.showMeSub')}</T>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([['FEMALE', 'female', t('ob.showWomen')], ['MALE', 'male', t('ob.showMen')], ['ALL', 'people', t('ob.showAll')]] as const).map(([k, ic, label]) => (
                  <PressBox key={k} style={{ flex: 1 }} onPress={() => setShowMe(k)} r={20} sh={showMe === k ? 4 : 1} bg={showMe === k ? colors.ink : colors.card} inner={styles.tile}>
                    <Icon name={ic} size={26} color={showMe === k ? colors.bg : colors.ink} />
                    <T v="bodyStrong" color={showMe === k ? colors.bg : colors.ink}>{label}</T>
                  </PressBox>
                ))}
              </View>
              <Box r={20} sh={1} inner={{ padding: 16, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <T v="bodyStrong" style={{ flex: 1 }}>{t('ob.ageRange')}</T>
                  <T v="h3" color={colors.brand}>{t('ob.ageRangeVal', { a: ageMin, b: ageMax })}</T>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Stepper value={ageMin} min={18} max={ageMax} onChange={setAgeMin} />
                  <Stepper value={ageMax} min={ageMin} max={80} onChange={setAgeMax} />
                </View>
              </Box>
            </>
          )}
          {cur.key === 'interests' && (
            <>
              <T v="h1">{t('onboarding.interestsTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('onboarding.interestsSub')}</T>
              <View style={styles.wrap}>
                {INTERESTS.map((i) => (
                  <Chip key={i} label={t(`interests.${i}`)} active={interests.includes(i)} onPress={() => setInterests((c) => (c.includes(i) ? c.filter((x) => x !== i) : c.length < 10 ? [...c, i] : c))} />
                ))}
              </View>
            </>
          )}
          {cur.key === 'looking' && (
            <>
              <T v="h1">{t('onboarding.lookingTitle')}</T>
              {LOOKING.map((l) => (
                <PressBox key={l} onPress={() => setLooking(l)} r={20} sh={looking === l ? 4 : 2} bg={looking === l ? colors.ink : colors.card} inner={styles.option}>
                  <T v="h3" color={looking === l ? colors.bg : colors.ink} style={{ flex: 1 }}>{t(`lookingFor.${l}`)}</T>
                  {looking === l ? <Icon name="checkmark" color={colors.bg} /> : null}
                </PressBox>
              ))}
            </>
          )}
          {cur.key === 'about' && (
            <>
              <T v="h1">{t('ob.aboutTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('ob.aboutSub')}</T>
              <Field label={t('ob.height')} right={extra.heightCm ? t('ob.heightVal', { n: extra.heightCm }) : '—'}>
                <Stepper value={extra.heightCm ?? 170} min={140} max={220} onChange={(v) => setX('heightCm', v)} wide />
              </Field>
              <Field label={t('ob.education')}>
                <View style={styles.wrap}>{EDU.map((k) => <Chip key={k} label={t(`ob.educations.${k}`)} active={extra.education === k} onPress={() => setX('education', extra.education === k ? undefined : k)} />)}</View>
              </Field>
              <Field label={t('ob.job')}>
                <TextInput value={extra.job ?? ''} onChangeText={(v) => setX('job', v.slice(0, 40))} placeholder={t('ob.jobPh')} placeholderTextColor={colors.textDim} selectionColor={colors.brand} style={styles.input} />
              </Field>
              {([['smoking', HABITS, 'habits'], ['drinking', HABITS, 'habits'], ['kids', KIDS, 'kidsOpts']] as const).map(([k, opts, ns]) => (
                <Field key={k} label={t(`ob.${k}`)}>
                  <View style={styles.wrap}>{opts.map((o) => <Chip key={o} label={t(`ob.${ns}.${o}`)} active={extra[k] === o} onPress={() => setX(k, extra[k] === o ? undefined : o)} />)}</View>
                </Field>
              ))}
            </>
          )}
          {cur.key === 'style' && (
            <>
              <T v="h1">{t('ob.styleTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('ob.styleSub')}</T>
              <Field label={t('ob.comm')}>
                <View style={styles.wrap}>{COMM.map((k) => <Chip key={k} icon={k === 'TEXT' ? 'chat' : k === 'VOICE' ? 'call' : k === 'VIDEO' ? 'videocam' : 'radio'} label={t(`ob.commOpts.${k}`)} active={!!extra.comm?.includes(k)} onPress={() => toggleIn('comm', k, 4)} />)}</View>
              </Field>
              <Field label={t('ob.activeTimes')}>
                <View style={styles.wrap}>{TIMES.map((k) => <Chip key={k} label={t(`ob.times.${k}`)} active={!!extra.activeTimes?.includes(k)} onPress={() => toggleIn('activeTimes', k, 4)} />)}</View>
              </Field>
              <Field label={t('ob.personality')}>
                <View style={styles.wrap}>{PERS.map((k) => <Chip key={k} label={t(`ob.personalities.${k}`)} active={extra.personality === k} onPress={() => setX('personality', extra.personality === k ? undefined : k)} />)}</View>
              </Field>
            </>
          )}
          {cur.key === 'vibe' && (
            <>
              <T v="h1">{t('ob.vibeTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('ob.vibeSub')}</T>
              <Field label={t('ob.dateIdeas')}>
                <View style={styles.wrap}>{IDEAS.map((k) => <Chip key={k} label={t(`ob.ideas.${k}`)} active={!!extra.dateIdeas?.includes(k)} onPress={() => toggleIn('dateIdeas', k)} />)}</View>
              </Field>
              <Field label={t('ob.music')}>
                <View style={styles.wrap}>{MUSIC.map((k) => <Chip key={k} label={t(`ob.musics.${k}`)} active={!!extra.music?.includes(k)} onPress={() => toggleIn('music', k)} />)}</View>
              </Field>
              <Box r={20} sh={1} bg={colors.highlight} inner={styles.toggleRow}>
                <Icon name="cash" size={22} color={colors.ink} />
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong">{t('ob.earn')}</T>
                  <T v="tiny" color={colors.textMuted}>{t('ob.earnSub')}</T>
                </View>
                <Switch value={!!extra.wantsToEarn} onValueChange={(v) => setX('wantsToEarn', v)} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} />
              </Box>
            </>
          )}
          {cur.key === 'notif' && (
            <>
              <T v="h1">{t('ob.notifTitle')}</T>
              <T v="body" color={colors.textMuted}>{t('ob.notifSub')}</T>
              <Box r={20} sh={1} inner={{ paddingVertical: 4 }}>
                {NOTIF.map((k, i) => (
                  <View key={k} style={[styles.notifRow, i < NOTIF.length - 1 && styles.notifDivider]}>
                    <View style={{ flex: 1 }}>
                      <T v="bodyStrong">{t(`notifSettings.items.${k}`)}</T>
                      <T v="tiny" color={colors.textMuted}>{t(`notifSettings.subs.${k}`)}</T>
                    </View>
                    <Switch value={notif[k] !== false} onValueChange={(v) => setNotif((n) => ({ ...n, [k]: v }))} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} />
                  </View>
                ))}
              </Box>
              <Box bg={colors.coin} r={18} sh={3} inner={styles.bonus}>
                <Icon name="gift" size={22} color={colors.ink} />
                <T v="bodyStrong" style={{ flex: 1 }}>{t('onboarding.bonus')}</T>
              </Box>
            </>
          )}
        </Animated.ScrollView>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {!cur.required ? <Btn full={false} kind="light" title={t('ob.skip')} onPress={next} style={{ paddingHorizontal: 22 }} /> : null}
          <View style={{ flex: 1 }}>
            <Btn title={last ? t('onboarding.finish') : t('common.next')} disabled={!canNext[cur.key]} loading={saving} onPress={next} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({ label, right, children }: { label: string; right?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T v="label" color={colors.textMuted} style={{ flex: 1 }}>{label}</T>
        {right ? <T v="bodyStrong" color={colors.brand}>{right}</T> : null}
      </View>
      {children}
    </View>
  );
}

/** − dəyər + (basılı saxlayanda sürətli dəyişir) */
function Stepper({ value, min, max, onChange, wide }: { value: number; min: number; max: number; onChange: (v: number) => void; wide?: boolean }) {
  const btn = (d: number, icon: 'remove' | 'add') => (
    <Pressable onPress={() => onChange(Math.min(max, Math.max(min, value + d)))} onLongPress={() => onChange(Math.min(max, Math.max(min, value + d * 5)))} style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]} hitSlop={6}>
      <Icon name={icon} size={20} color={colors.ink} />
    </Pressable>
  );
  return (
    <View style={[styles.stepper, wide ? { alignSelf: 'stretch' } : { flex: 1 }]}>
      {btn(-1, 'remove')}
      <Text style={styles.stepVal}>{value}</Text>
      {btn(1, 'add')}
    </View>
  );
}

const PHOTO_W = (Dimensions.get('window').width - 32 - 20) / 3;

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8, minHeight: 64 },
  progress: { flexDirection: 'row', gap: 4, marginTop: 8 },
  progressBar: { flex: 1, height: 6, borderRadius: 3 },
  bigInput: { minWidth: 0, ...webNoOutline, backgroundColor: colors.card, borderRadius: radius.md, color: colors.ink, fontSize: 22, fontFamily: fonts.displayBold, paddingHorizontal: 16, height: 64 },
  input: { minWidth: 0, ...webNoOutline, backgroundColor: colors.card, borderRadius: radius.md, color: colors.ink, fontSize: 16, fontFamily: fonts.semibold, paddingHorizontal: 16, height: 52 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  optIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  tile: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: PHOTO_W, aspectRatio: 0.75, borderRadius: radius.md, backgroundColor: colors.card, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(26,21,18,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  remove: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.card, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bonus: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  notifDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSunken, borderRadius: 16, height: 52, paddingHorizontal: 6 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  stepVal: { ...noPad, flex: 1, textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, color: colors.ink },
});
