import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '@/theme';
import { Btn, Card, Header, Screen, T, Tabs, tap } from '@/components/ui';
import { Appear, Pressable3 } from '@/components/motion';
import { Icon, type IconName } from '@/components/Icon';
import { api } from '@/lib/api';
import { errorText } from '@/lib/format';
import { useStore } from '@/store';
import type { CallHours, Me } from '@/lib/types';

const PRESENCE: { key: 'AUTO' | 'ACTIVE' | 'BUSY' | 'AWAY'; icon: IconName; color: string }[] = [
  { key: 'AUTO', icon: 'sparkles', color: colors.diamond },
  { key: 'ACTIVE', icon: 'checkmark', color: colors.online },
  { key: 'BUSY', icon: 'ban', color: colors.brand },
  { key: 'AWAY', icon: 'time', color: colors.coin },
];
const HOURS = ['00:00', '06:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '23:00', '23:59'];

/** Zəng və status: görüntülü/səsli ayrıca, zəng saatları (Bakı vaxtı) və günlər, status */
export default function CallSettings() {
  const { t } = useTranslation();
  const { me, setMe, toast } = useStore();
  const [presence, setPresence] = useState(me?.presenceSetting ?? 'AUTO');
  const [video, setVideo] = useState(me?.acceptVideoSetting ?? true);
  const [voice, setVoice] = useState(me?.acceptVoiceSetting ?? true);
  const [custom, setCustom] = useState(!!me?.callHoursSetting);
  const [hours, setHours] = useState<CallHours>(me?.callHoursSetting ?? { from: '10:00', to: '23:00', days: [1, 2, 3, 4, 5, 6, 7] });
  const [busy, setBusy] = useState(false);
  const dayNames = t('callSettings.dayNames', { returnObjects: true }) as string[];

  async function save() {
    setBusy(true);
    try {
      setMe(await api<Me>('/me', { method: 'PATCH', body: { presence, acceptVideo: video, acceptVoice: voice, callHours: custom ? hours : null } }));
      toast(t('u2.saved'), 'success');
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const cycle = (k: 'from' | 'to', d: number) => setHours((h) => { const i = HOURS.indexOf(h[k]); return { ...h, [k]: HOURS[(Math.max(0, i) + d + HOURS.length) % HOURS.length] }; });

  return (
    <Screen scroll>
      <Header title={t('callSettings.title')} />
      <T v="label" color={colors.textMuted} style={styles.section}>{t('callSettings.status')}</T>
      <View style={styles.grid}>
        {PRESENCE.map((p, i) => {
          const on = presence === p.key;
          return (
            <Appear key={p.key} i={i} style={styles.presWrap}>
              <Pressable3 scaleTo={0.96} onPress={() => { tap(); setPresence(p.key); }} style={[styles.pres, on && { borderColor: p.color }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={[styles.presDot, { backgroundColor: p.color }]}><Icon name={p.icon} size={15} color={colors.white} /></View>
                  <View style={[styles.radio, on && { borderColor: p.color }]}>{on ? <View style={[styles.radioDot, { backgroundColor: p.color }]} /> : null}</View>
                </View>
                <T v="bodyStrong">{t(`callSettings.presence.${p.key}`)}</T>
                <T v="tiny" color={colors.textMuted}>{t(`callSettings.presenceSub.${p.key}`)}</T>
              </Pressable3>
            </Appear>
          );
        })}
      </View>

      <Card style={{ marginTop: 18, gap: 0, paddingVertical: 4 }}>
        {([['videocam', t('callSettings.acceptVideo'), video, setVideo], ['call', t('callSettings.acceptVoice'), voice, setVoice]] as const).map(([ic, label, val, set], i) => (
          <View key={label} style={[styles.row, i === 0 && styles.divider]}>
            <View style={[styles.rowIcon, { backgroundColor: ic === 'videocam' ? colors.brandSoft : colors.skySoft }]}><Icon name={ic} size={18} color={colors.ink} /></View>
            <View style={{ flex: 1 }}>
              <T v="bodyStrong">{label}</T>
              <T v="tiny" color={colors.textMuted}>{t('callSettings.acceptSub')}</T>
            </View>
            <Switch value={val} onValueChange={set} trackColor={{ true: colors.brand, false: colors.bgSunken }} thumbColor={colors.card} />
          </View>
        ))}
      </Card>

      <T v="label" color={colors.textMuted} style={styles.section}>{t('callSettings.hours')}</T>
      <Tabs<'all' | 'custom'> value={custom ? 'custom' : 'all'} onChange={(k) => setCustom(k === 'custom')} options={[{ key: 'all', label: t('callSettings.hoursAll'), icon: 'infinite' }, { key: 'custom', label: t('callSettings.hoursCustom'), icon: 'time' }]} />
      {custom ? (
        <Card style={{ marginTop: 12, gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['from', 'to'] as const).map((k) => (
              <View key={k} style={{ flex: 1, gap: 6 }}>
                <T v="tiny" color={colors.textMuted}>{t(`callSettings.${k}`)}</T>
                <View style={styles.time}>
                  <Pressable onPress={() => cycle(k, -1)} hitSlop={8} style={styles.timeBtn}><Icon name="back" size={16} color={colors.ink} /></Pressable>
                  <Text style={styles.timeVal}>{hours[k]}</Text>
                  <Pressable onPress={() => cycle(k, 1)} hitSlop={8} style={styles.timeBtn}><Icon name="chevron" size={16} color={colors.ink} /></Pressable>
                </View>
              </View>
            ))}
          </View>
          <T v="tiny" color={colors.textMuted}>{t('callSettings.days')}</T>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {dayNames.map((d, i) => {
              const n = i + 1; const on = !!hours.days?.includes(n);
              return (
                <Pressable key={d} onPress={() => setHours((h) => ({ ...h, days: on ? (h.days ?? []).filter((x) => x !== n) : [...(h.days ?? []), n].sort() }))} style={[styles.day, on && styles.dayOn]}>
                  <Text style={[styles.dayText, on && { color: colors.white }]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
          <T v="tiny" color={colors.textMuted}>{t('callSettings.hoursHint')}</T>
        </Card>
      ) : null}
      <Btn title={t('common.save')} loading={busy} onPress={save} style={{ marginTop: 22 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 18, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presWrap: { width: '48%', flexGrow: 1 },
  pres: { flex: 1, gap: 4, padding: 14, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 2, borderColor: 'transparent' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(26,21,18,0.18)', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  presDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: colors.bgSunken, borderRadius: 22, padding: 4 },
  segItem: { flex: 1, height: 40, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.ink },
  segText: { ...noPad, fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17, color: colors.ink },
  time: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 14, backgroundColor: colors.bgSunken, paddingHorizontal: 6 },
  timeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  timeVal: { ...noPad, flex: 1, textAlign: 'center', fontFamily: fonts.displayBold, fontSize: 18, lineHeight: 24, color: colors.ink },
  day: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.brand },
  dayText: { ...noPad, fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.ink },
});
