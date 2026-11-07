import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius } from '@/theme';
import { Btn, Header, Input, Screen, T, Tabs } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImage } from '@/lib/media';
import { useStore } from '@/store';

type Doc = 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE';

function Slot({ label, uri, onPress, icon = 'camera' }: { label: string; uri?: string; onPress: () => void; icon?: 'camera' | 'person' }) {
  return (
    <Pressable onPress={onPress} style={styles.slot}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : (
        <View style={{ alignItems: 'center', gap: 6 }}><Icon name={icon} size={24} color={colors.textMuted} /><T v="tiny" color={colors.textMuted} center>{label}</T></View>
      )}
    </Pressable>
  );
}

/** Şəxsiyyət təsdiqi (KYC): ad, soyad, doğum tarixi, sənədin şəkli, selfi. Agentlik və pul çıxarışı üçün tələb olunur. */
export default function Verify() {
  const { t } = useTranslation();
  const { me, toast, refreshMe } = useStore();
  const [status, setStatus] = useState<{ status: string; note: string } | null>(null);
  const [f, setF] = useState({ firstName: '', lastName: '', birth: '', doc: 'ID_CARD' as Doc, front: '', back: '', selfie: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { void api<{ verification: { status: string; note: string } | null }>('/kyc').then((r) => setStatus(r.verification)).catch(() => {}); }, []);

  const pick = (k: 'front' | 'back' | 'selfie') => async () => {
    try {
      const u = await pickImage({ camera: true, front: k === 'selfie' });
      if (u) setF((x) => ({ ...x, [k]: u }));
    } catch (e) { toast(errorText(e), 'error'); }
  };

  async function submit() {
    const m = f.birth.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) return toast(t('kyc.birthFormat'), 'error');
    setBusy(true);
    try {
      await api('/kyc', { body: { firstName: f.firstName.trim(), lastName: f.lastName.trim(), birthDate: `${m[3]}-${m[2]}-${m[1]}`, docType: f.doc, docFrontUrl: f.front, docBackUrl: f.back || undefined, selfieUrl: f.selfie } });
      toast(t('kyc.sent'), 'success');
      await refreshMe();
      router.back();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const st = me?.kycStatus ?? 'NONE';
  if (st === 'PENDING' || st === 'APPROVED') {
    return (
      <Screen>
        <Header title={t('kyc.title')} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
          <Mascot pose={st === 'APPROVED' ? 'trophy' : 'coffee'} size={160} />
          <T v="h2" center>{t(`kyc.status.${st}`)}</T>
          <T v="small" color={colors.textMuted} center>{st === 'APPROVED' ? t('kyc.approvedSub') : t('kyc.pendingSub')}</T>
        </View>
      </Screen>
    );
  }
  const ok = f.firstName.trim().length >= 2 && f.lastName.trim().length >= 2 && f.birth.length === 10 && f.front && f.selfie;
  return (
    <Screen scroll>
      <Header title={t('kyc.title')} />
      <View style={styles.intro}>
        <Icon name="shield" size={20} color={colors.diamond} />
        <T v="small" style={{ flex: 1 }}>{t('kyc.intro')}</T>
      </View>
      {status?.status === 'REJECTED' ? <T v="small" color={colors.danger} style={{ marginBottom: 10 }}>{t('kyc.rejected')}{status.note ? `: ${status.note}` : ''}</T> : null}
      <View style={{ gap: 12 }}>
        <Input label={t('kyc.firstName')} value={f.firstName} onChangeText={(v) => setF({ ...f, firstName: v })} autoCapitalize="words" />
        <Input label={t('kyc.lastName')} value={f.lastName} onChangeText={(v) => setF({ ...f, lastName: v })} autoCapitalize="words" />
        <Input label={t('kyc.birth')} value={f.birth} placeholder={t('kyc.birthPh')} keyboardType="number-pad" maxLength={10}
          onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 8); setF({ ...f, birth: [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('.') }); }} />
        <T v="label" color={colors.textMuted}>{t('kyc.docType')}</T>
        <Tabs<Doc> value={f.doc} onChange={(doc) => setF({ ...f, doc })} options={[{ key: 'ID_CARD', label: t('kyc.docs.ID_CARD') }, { key: 'PASSPORT', label: t('kyc.docs.PASSPORT') }, { key: 'DRIVER_LICENSE', label: t('kyc.docs.DRIVER_LICENSE') }]} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Slot label={t('kyc.front')} uri={f.front} onPress={pick('front')} />
          <Slot label={t('kyc.back')} uri={f.back} onPress={pick('back')} />
          <Slot label={t('kyc.selfie')} uri={f.selfie} onPress={pick('selfie')} icon="person" />
        </View>
        <T v="tiny" color={colors.textDim}>{t('kyc.privacy')}</T>
        <Btn title={t('kyc.submit')} icon="shield" loading={busy} disabled={!ok} onPress={submit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.skySoft, borderRadius: radius.md, padding: 14, marginBottom: 14 },
  slot: { flex: 1, aspectRatio: 0.8, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(26,21,18,0.18)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 6 },
});
