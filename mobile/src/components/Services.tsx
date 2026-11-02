import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, noPad, radius, webNoOutline } from '../theme';
import { Btn, T } from './ui';
import { Icon, type IconName } from './Icon';
import { CoinIcon } from './GiftIcon';
import { sheetStyles } from './ActionSheet';
import { api } from '../lib/api';
import { errorText } from '../lib/format';
import { useStore } from '../store';

export interface Service { id: string; userId: string; kind: 'VIDEO_CALL' | 'VOICE_CALL' | 'CHAT' | 'CUSTOM'; title: string; description: string; price: number; durationMin: number; active: boolean }

export const SERVICE_ICON: Record<Service['kind'], IconName> = { VIDEO_CALL: 'videocam', VOICE_CALL: 'call', CHAT: 'chat', CUSTOM: 'sparkles' };
export const SERVICE_TINT: Record<Service['kind'], string> = { VIDEO_CALL: colors.brandSoft, VOICE_CALL: colors.skySoft, CHAT: colors.lilac, CUSTOM: colors.highlight };

/** Xidmət kartı (profil və "Xidmətlərim") */
export function ServiceCard({ s, onPress, right }: { s: Service; onPress?: () => void; right?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, !s.active && { opacity: 0.55 }, pressed && { opacity: 0.8 }]}>
      <View style={[styles.icon, { backgroundColor: SERVICE_TINT[s.kind] }]}><Icon name={SERVICE_ICON[s.kind]} size={20} color={colors.ink} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="bodyStrong" numberOfLines={1}>{s.title}</T>
        <T v="tiny" color={colors.textMuted} numberOfLines={2}>{[t(`services.kind.${s.kind}`), s.durationMin ? t('services.durationVal', { n: s.durationMin }) : null, s.description].filter(Boolean).join(' · ')}</T>
      </View>
      {right ?? (
        <View style={styles.price}><CoinIcon size={15} /><Text style={styles.priceText}>{s.price}</Text></View>
      )}
    </Pressable>
  );
}

/** Profildə: istifadəçinin aktiv xidmətləri + sifariş pəncərəsi (Nar escrow-da saxlanılır) */
export function ProfileServices({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { toast } = useStore();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Service[]>([]);
  const [sel, setSel] = useState<Service | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void api<{ items: Service[] }>(`/services/user/${userId}`).then((r) => setItems(r.items.filter((s) => s.active))).catch(() => {}); }, [userId]);
  if (!items.length) return null;
  async function order() {
    if (!sel) return;
    setBusy(true);
    try {
      await api(`/services/${sel.id}/order`, { body: { note } });
      toast(t('services.ordered'), 'success');
      setSel(null); setNote('');
    } catch (e) { toast(errorText(e), 'error'); } finally { setBusy(false); }
  }
  return (
    <View style={{ gap: 10 }}>
      <T v="h3">{t('profile2.services')}</T>
      {items.map((s) => <ServiceCard key={s.id} s={s} onPress={() => setSel(s)} />)}
      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setSel(null)} />
        {sel ? (
          <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 14, gap: 14 }]}>
            <View style={sheetStyles.grip} />
            <ServiceCard s={sel} />
            <View style={styles.escrow}><Icon name="shield" size={16} color={colors.online} /><T v="tiny" style={{ flex: 1 }}>{t('services.escrow')}</T></View>
            <TextInput value={note} onChangeText={setNote} placeholder={t('services.orderNotePh')} placeholderTextColor={colors.textDim} style={styles.input} maxLength={300} multiline />
            <Btn title={`${t('services.order')} · ${sel.price} Nar`} icon="cart" loading={busy} onPress={order} />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

/** Sifarişlər ekranına keçid (mesajlaşma, bildiriş) */
export const openOrders = (as: 'buyer' | 'seller' = 'buyer') => router.push({ pathname: '/orders', params: { as } });

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: colors.highlight },
  priceText: { ...noPad, fontFamily: fonts.black, fontSize: 14, lineHeight: 18, color: colors.ink },
  escrow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.onlineSoft, borderRadius: radius.md, padding: 12 },
  input: { minWidth: 0, ...webNoOutline, backgroundColor: colors.bgSunken, borderRadius: radius.md, color: colors.ink, padding: 14, minHeight: 70, textAlignVertical: 'top', fontFamily: fonts.medium, fontSize: 15 },
});
