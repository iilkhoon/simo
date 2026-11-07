import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, radius } from '@/theme';
import { Btn, EmptyState, Header, Input, Screen, T, Tabs, Tag } from '@/components/ui';
import { Appear, Pressable3 } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { FieldError } from '@/components/AuthKit';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { pickImageFull } from '@/lib/media';
import { useStore } from '@/store';

type Doc = 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE';

function Slot({ label, uri, onPress, icon = 'camera' }: { label: string; uri?: string; onPress: () => void; icon?: 'camera' | 'person' }) {
  return (
    <Pressable3 scaleTo={0.95} onPress={onPress} style={[styles.slot, uri ? { borderStyle: 'solid', borderColor: colors.online } : null]} accessibilityRole="button" accessibilityLabel={label}>
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.slotOk}><Icon name="checkmark" size={12} color={colors.white} /></View>
        </>
      ) : (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={styles.slotDisc}><Icon name={icon} size={20} color={colors.ink} /></View>
          <T v="tiny" color={colors.textMuted} center>{label}</T>
        </View>
      )}
    </Pressable3>
  );
}

/** Şəxsiyyət təsdiqi (KYC): ad, soyad, doğum tarixi, sənədin şəkli, selfi. Agentlik və pul çıxarışı üçün tələb olunur. */
export default function Verify() {
  const { t } = useTranslation();
  const { me, toast, refreshMe } = useStore();
  const [status, setStatus] = useState<{ status: string; note: string } | null>(null);
  const [f, setF] = useState({ firstName: '', lastName: '', birth: '', doc: 'ID_CARD' as Doc, front: '', back: '', selfie: '' });
  const [busy, setBusy] = useState(false);
  // Önizləmə yerli fayldan (yüklənmiş sənəd şəxsidir, linki açıq deyil)
  const [preview, setPreview] = useState<Record<string, string>>({});
  useEffect(() => { void api<{ verification: { status: string; note: string } | null }>('/kyc').then((r) => setStatus(r.verification)).catch(() => {}); }, []);

  const pick = (k: 'front' | 'back' | 'selfie') => async () => {
    try {
      const u = await pickImageFull({ camera: true, front: k === 'selfie', kyc: true });
      if (u) { setF((x) => ({ ...x, [k]: u.url })); setPreview((x) => ({ ...x, [k]: u.localUri })); }
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
        <EmptyState
          art={st === 'APPROVED' ? 'shield' : 'bell'}
          title={t(`kyc.status.${st}`)}
          sub={st === 'APPROVED' ? t('kyc.approvedSub') : t('kyc.pendingSub')}
          action={<Tag label={t(`kyc.status.${st}`)} icon={st === 'APPROVED' ? 'checkmark' : 'time'} bg={st === 'APPROVED' ? colors.onlineSoft : colors.coinSoft} style={{ height: 28, paddingHorizontal: 12 }} />}
        />
      </Screen>
    );
  }
  const bm = f.birth.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const bd = bm ? new Date(Number(bm[3]), Number(bm[2]) - 1, Number(bm[1])) : null;
  const birthOk = !!bd && bd.getDate() === Number(bm![1]) && bd.getMonth() === Number(bm![2]) - 1 && bd.getFullYear() > 1900 && bd.getTime() < Date.now();
  const ok = f.firstName.trim().length >= 2 && f.lastName.trim().length >= 2 && birthOk && f.front && f.selfie;
  return (
    <Screen scroll>
      <Header title={t('kyc.title')} />
      <Appear i={0}>
        <View style={styles.intro}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.introIcon}><Icon name="shield" size={18} color={colors.white} /></View>
            <T v="small" style={{ flex: 1 }}>{t('kyc.intro')}</T>
          </View>
          <View style={{ gap: 8, marginTop: 4 }}>
            {(['kycStep1', 'kycStep2', 'kycStep3'] as const).map((k, i) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.stepNum}><T v="tiny">{i + 1}</T></View>
                <T v="small" color={colors.textMuted} style={{ flex: 1 }}>{t(`u2.${k}`)}</T>
              </View>
            ))}
          </View>
        </View>
      </Appear>
      {status?.status === 'REJECTED' ? <T v="small" color={colors.danger} style={{ marginBottom: 10 }}>{t('kyc.rejected')}{status.note ? `: ${status.note}` : ''}</T> : null}
      <View style={{ gap: 12 }}>
        <Input label={t('kyc.firstName')} value={f.firstName} onChangeText={(v) => setF({ ...f, firstName: v })} autoCapitalize="words" />
        <Input label={t('kyc.lastName')} value={f.lastName} onChangeText={(v) => setF({ ...f, lastName: v })} autoCapitalize="words" />
        <Input label={t('kyc.birth')} value={f.birth} placeholder="GG.AA.İİİİ" keyboardType="number-pad" maxLength={10}
          onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 8); setF({ ...f, birth: [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('.') }); }} />
        {f.birth.length === 10 && !birthOk ? <FieldError text={t('u2.birthInvalid')} /> : null}
        <T v="label" color={colors.textMuted}>{t('kyc.docType')}</T>
        <Tabs<Doc> value={f.doc} onChange={(doc) => setF({ ...f, doc })} options={[{ key: 'ID_CARD', label: t('kyc.docs.ID_CARD') }, { key: 'PASSPORT', label: t('kyc.docs.PASSPORT') }, { key: 'DRIVER_LICENSE', label: t('kyc.docs.DRIVER_LICENSE') }]} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Slot label={t('kyc.front')} uri={preview.front || undefined} onPress={pick('front')} />
          <Slot label={t('kyc.back')} uri={preview.back || undefined} onPress={pick('back')} />
          <Slot label={t('kyc.selfie')} uri={preview.selfie || undefined} onPress={pick('selfie')} icon="person" />
        </View>
        <T v="tiny" color={colors.textDim}>{t('kyc.privacy')}</T>
        <Btn title={t('kyc.submit')} icon="shield" loading={busy} disabled={!ok} onPress={submit} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 10, backgroundColor: colors.skySoft, borderRadius: radius.lg, padding: 14, marginBottom: 14 },
  introIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.diamond, alignItems: 'center', justifyContent: 'center' },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  slotDisc: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  slotOk: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.online, alignItems: 'center', justifyContent: 'center' },
  slot: { flex: 1, aspectRatio: 0.8, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(26,21,18,0.18)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 6 },
});
