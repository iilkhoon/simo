import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';
import { Btn, Chip, EmptyState, Header, IconBtn, Input, Loader, PressBox, Screen, T } from '@/components/ui';
import { Appear } from '@/components/motion';
import { Icon } from '@/components/Icon';
import { Illustration } from '@/components/Illustration';
import { FieldError } from '@/components/AuthKit';
import { sheetStyles } from '@/components/ActionSheet';
import { ServiceCard, type Service } from '@/components/Services';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';

const KINDS: Service['kind'][] = ['VIDEO_CALL', 'VOICE_CALL', 'CHAT', 'CUSTOM'];
const EMPTY = { kind: 'VIDEO_CALL' as Service['kind'], title: '', description: '', price: '200', durationMin: '15', active: true };

/** Xidmətlərim: əlavə et, redaktə et, dayandır. Satmaq üçün KYC lazımdır */
export default function MyServices() {
  const { t } = useTranslation();
  const { me, toast } = useStore();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Service[] | null>(null);
  const [edit, setEdit] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { if (me) await api<{ items: Service[] }>(`/services/user/${me.id}`).then((r) => setItems(r.items)).catch(() => setItems((x) => x ?? [])); }, [me]);
  useEffect(() => { void load(); }, [load]);
  const kycOk = me?.kycStatus === 'APPROVED';

  async function save() {
    if (!edit) return;
    setBusy(true);
    const body = { kind: edit.kind, title: edit.title, description: edit.description, price: Number(edit.price), durationMin: Number(edit.durationMin || 0), active: edit.active };
    try {
      if (edit.id) await api(`/services/${edit.id}`, { method: 'PATCH', body });
      else await api('/services', { body });
      setEdit(null);
      void load();
      toast(t('u2.saved'), 'success');
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Header title={t('services.my')} right={<IconBtn name="receipt" size={40} onPress={() => router.push({ pathname: '/orders', params: { as: 'seller' } })} />} />
      <ScrollView
        contentContainerStyle={{ gap: 10, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.brand} colors={[colors.brand]} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {!kycOk ? (
          <Appear i={0}>
            <PressBox r={radius.lg} sh={1} bg={colors.skySoft} onPress={() => router.push('/verify')} inner={styles.notice}>
              <Illustration name="shield" size={64} float={false} bare />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{me?.kycStatus === 'PENDING' ? t('kyc.pending') : t('u2.servicesKycTitle')}</T>
                <T v="tiny" color={colors.textMuted}>{t('services.kycNeeded')}</T>
              </View>
              <Icon name="chevron" size={16} color={colors.ink} />
            </PressBox>
          </Appear>
        ) : null}
        {items === null ? <Loader variant="list" n={3} /> : null}
        {items && !items.length ? <EmptyState art="spark" title={t('services.empty')} sub={t('services.emptySub')} compact={!kycOk} /> : null}
        {items?.map((s, i) => <Appear key={s.id} i={i + 1}><ServiceCard s={s} onPress={() => setEdit({ id: s.id, kind: s.kind, title: s.title, description: s.description, price: String(s.price), durationMin: String(s.durationMin), active: s.active })} /></Appear>)}
        {items ? <Btn kind={items.length ? 'light' : 'primary'} icon="add" title={t('services.add')} disabled={!kycOk} onPress={() => setEdit({ ...EMPTY })} style={{ marginTop: 6 }} /> : null}
      </ScrollView>
      <Modal visible={!!edit} transparent animationType="slide" onRequestClose={() => setEdit(null)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.scrim }} onPress={() => setEdit(null)} />
        {edit ? (
          <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 14, paddingHorizontal: 16, paddingTop: 10, gap: 12 }]}>
            <View style={sheetStyles.grip} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T v="h3" style={{ flex: 1 }}>{edit.id ? t('services.edit') : t('services.add')}</T>
              <IconBtn name="close" size={34} sh={0} bg={colors.bgSunken} onPress={() => setEdit(null)} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {KINDS.map((k) => <Chip key={k} label={t(`services.kind.${k}`)} active={edit.kind === k} onPress={() => setEdit({ ...edit, kind: k })} />)}
            </View>
            <Input label={t('services.titleLabel')} value={edit.title} onChangeText={(v) => setEdit({ ...edit, title: v })} placeholder={t('services.titlePh')} maxLength={60} />
            <Input label={t('services.descLabel')} value={edit.description} onChangeText={(v) => setEdit({ ...edit, description: v })} placeholder={t('services.descPh')} maxLength={400} multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Input label={t('services.price')} value={edit.price} onChangeText={(v) => setEdit({ ...edit, price: v.replace(/\D/g, '') })} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Input label={t('services.duration')} value={edit.durationMin} onChangeText={(v) => setEdit({ ...edit, durationMin: v.replace(/\D/g, '') })} keyboardType="number-pad" /></View>
            </View>
            {edit.id ? (
              <View style={styles.activeRow}>
                <T v="bodyStrong" style={{ flex: 1 }}>{edit.active ? t('services.active') : t('services.paused')}</T>
                <Switch value={edit.active} onValueChange={(v) => setEdit({ ...edit, active: v })} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} />
              </View>
            ) : null}
            {edit.title && edit.title.trim().length < 3 ? <FieldError text={t('u2.titleMin')} /> : null}
            {edit.price !== '' && Number(edit.price) < 50 ? <FieldError text={t('u2.priceMin', { n: 50 })} /> : null}
            <Btn title={t('services.save')} loading={busy} disabled={edit.title.trim().length < 3 || Number(edit.price) < 50} onPress={save} />
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingRight: 14 },
  activeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSunken, borderRadius: radius.md, paddingHorizontal: 14, height: 52 },
});
