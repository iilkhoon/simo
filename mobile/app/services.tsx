import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';
import { Btn, Chip, EmptyState, Header, IconBtn, Input, Screen, T } from '@/components/ui';
import { Icon } from '@/components/Icon';
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
  const load = useCallback(() => { if (me) void api<{ items: Service[] }>(`/services/user/${me.id}`).then((r) => setItems(r.items)).catch(() => setItems([])); }, [me]);
  useEffect(load, [load]);
  const kycOk = me?.kycStatus === 'APPROVED';

  async function save() {
    if (!edit) return;
    setBusy(true);
    const body = { kind: edit.kind, title: edit.title, description: edit.description, price: Number(edit.price), durationMin: Number(edit.durationMin || 0), active: edit.active };
    try {
      if (edit.id) await api(`/services/${edit.id}`, { method: 'PATCH', body });
      else await api('/services', { body });
      setEdit(null);
      load();
      toast('✓', 'success');
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Header title={t('services.my')} right={<IconBtn name="receipt" size={40} onPress={() => router.push({ pathname: '/orders', params: { as: 'seller' } })} />} />
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        {!kycOk ? (
          <Pressable onPress={() => router.push('/verify')} style={styles.notice}>
            <Icon name="shield" size={18} color={colors.diamond} />
            <T v="small" style={{ flex: 1 }}>{t('services.kycNeeded')}</T>
            <Icon name="chevron" size={16} color={colors.ink} />
          </Pressable>
        ) : null}
        {items && !items.length ? <EmptyState icon="sparkles" pose="coin" title={t('services.empty')} sub={t('services.emptySub')} /> : null}
        {items?.map((s) => <ServiceCard key={s.id} s={s} onPress={() => setEdit({ id: s.id, kind: s.kind, title: s.title, description: s.description, price: String(s.price), durationMin: String(s.durationMin), active: s.active })} />)}
        <Btn kind={items?.length ? 'light' : 'primary'} icon="add" title={t('services.add')} disabled={!kycOk} onPress={() => setEdit({ ...EMPTY })} style={{ marginTop: 6 }} />
      </ScrollView>
      <Modal visible={!!edit} transparent animationType="slide" onRequestClose={() => setEdit(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setEdit(null)} />
        {edit ? (
          <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 14, gap: 12 }]}>
            <View style={sheetStyles.grip} />
            <T v="h3">{edit.id ? t('services.edit') : t('services.add')}</T>
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
            <Btn title={t('services.save')} loading={busy} disabled={edit.title.trim().length < 3 || Number(edit.price) < 50} onPress={save} />
          </View>
        ) : null}
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.skySoft, borderRadius: radius.lg, padding: 14 },
  activeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSunken, borderRadius: radius.md, paddingHorizontal: 14, height: 52 },
});
