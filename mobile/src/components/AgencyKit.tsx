/**
 * Agentlik və qazanc ekranlarının ortaq elementləri: dövr seçici, statistik plitələr, mənbə bölgüsü,
 * mini sütun qrafiki, irəliləyiş xətti, təsdiq pəncərəsi. Yalnız theme.ts tokenləri.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, elev, fonts, noPad, palette, radius } from '@/theme';
import { Btn, T, Tabs } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { DiamondIcon } from '@/components/GiftIcon';
import { ECON, fmtAlmaz } from '@/lib/economy';

export type Period = 'today' | 'week' | 'month';

export function PeriodTabs({ value, onChange, night }: { value: Period; onChange: (p: Period) => void; night?: boolean }) {
  const { t } = useTranslation();
  return <Tabs night={night} value={value} onChange={onChange} options={(['today', 'week', 'month'] as const).map((k) => ({ key: k, label: t(`ag.period.${k}`) }))} />;
}

/** Almaz vahidi → ₼ (xidmət haqqından əvvəl) */
export const unitsToAzn = (units: number) => (Math.floor((units * 100) / ECON.diamondsPerAzn) / 100).toFixed(2);

export const SOURCE_COLORS: Record<string, string> = {
  GIFT: palette.nar, CALL: palette.xazar, MESSAGE: palette.saffron, SUBSCRIPTION: palette.lilac, SERVICE: palette.mint,
};
export const SOURCE_ICONS: Record<string, IconName> = { GIFT: 'gift', CALL: 'videocam', MESSAGE: 'chat', SUBSCRIPTION: 'lock', SERVICE: 'cart' };
const SOURCES = ['GIFT', 'CALL', 'MESSAGE', 'SUBSCRIPTION', 'SERVICE'];

/** Kiçik statistika plitəsi */
export function StatTile({ icon, label, value, sub, tint = colors.bgSunken, iconColor = colors.ink }: { icon: IconName; label: string; value: string; sub?: string; tint?: string; iconColor?: string }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: tint }]}><Icon name={icon} size={16} color={iconColor} /></View>
      <Text style={styles.tileNum} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <T v="tiny" color={colors.textMuted} numberOfLines={1}>{label}</T>
      {sub ? <T v="tiny" color={colors.online} numberOfLines={1}>{sub}</T> : null}
    </View>
  );
}

export function TileGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

/** Almaz məbləği: ikon + rəqəm (+ ₼) */
export function Almaz({ units, size = 15, color = colors.ink, cash }: { units: number; size?: number; color?: string; cash?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <DiamondIcon size={size} />
      <Text style={{ ...noPad, fontFamily: fonts.display, fontSize: size, lineHeight: size + 5, color }}>{fmtAlmaz(units)}</Text>
      {cash ? <Text style={{ ...noPad, fontFamily: fonts.semibold, fontSize: size - 3, lineHeight: size + 2, color: colors.textMuted }}> ≈ {unitsToAzn(units)} ₼</Text> : null}
    </View>
  );
}

/** Mənbə bölgüsü: üfüqi yığılmış zolaq + siyahı */
export function SourceBreakdown({ bySource, total }: { bySource: Record<string, number>; total: number }) {
  const { t } = useTranslation();
  const rows = SOURCES.map((k) => ({ k, v: bySource[k] ?? 0 })).filter((r) => r.v > 0);
  if (!total || !rows.length) {
    return <T v="small" color={colors.textMuted} style={{ paddingVertical: 6 }}>{t('earn.noEarnings')}</T>;
  }
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.stack}>
        {rows.map((r) => <View key={r.k} style={{ flex: r.v, backgroundColor: SOURCE_COLORS[r.k] }} />)}
      </View>
      {rows.map((r) => (
        <View key={r.k} style={styles.srcRow}>
          <View style={[styles.srcIcon, { backgroundColor: SOURCE_COLORS[r.k] }]}><Icon name={SOURCE_ICONS[r.k]} size={13} color={colors.white} /></View>
          <T v="bodyStrong" style={{ flex: 1 }}>{t(`ag.sources.${r.k}`)}</T>
          <T v="tiny" color={colors.textMuted}>{Math.round((r.v / total) * 100)}%</T>
          <View style={{ minWidth: 76, alignItems: 'flex-end' }}><Almaz units={r.v} size={14} /></View>
        </View>
      ))}
    </View>
  );
}

/** Mini sütun qrafiki (son N gün) */
export function MiniBars({ data, color = colors.brand, height = 72 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => (
          <View key={d.label + i} style={styles.barCol}>
            <View style={[styles.bar, { height: Math.max(3, (d.value / max) * height), backgroundColor: d.value ? color : colors.bgSunken, opacity: i === data.length - 1 ? 1 : 0.75 }]} />
          </View>
        ))}
      </View>
      <View style={styles.barLabels}>
        <T v="tiny" color={colors.textDim}>{data[0]?.label}</T>
        <T v="tiny" color={colors.textDim}>{data[data.length - 1]?.label}</T>
      </View>
    </View>
  );
}

/** İrəliləyiş xətti */
export function Progress({ value, max, color = colors.online, night }: { value: number; max: number; color?: string; night?: boolean }) {
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <View style={[styles.track, night && { backgroundColor: colors.nightLine }]}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

/** Sadə təsdiq pəncərəsi (Alert vebdə işləmir) */
export function ConfirmSheet({ visible, title, body, confirm, danger, onConfirm, onClose }: {
  visible: boolean; title: string; body?: string; confirm: string; danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.dialogWrap} pointerEvents="box-none">
        <View style={styles.dialog}>
          <T v="h3">{title}</T>
          {body ? <T v="small" color={colors.textMuted}>{body}</T> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}><Btn size="md" kind="ghost" title={t('ag.cancel')} onPress={onClose} /></View>
            <View style={{ flex: 1 }}><Btn size="md" kind={danger ? 'primary' : 'dark'} title={confirm} onPress={() => { onClose(); onConfirm(); }} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const minutesLabel = (min: number, t: (k: string, o?: Record<string, unknown>) => string) =>
  min >= 60 ? t('ag.hShort', { n: (min / 60).toFixed(min >= 600 ? 0 : 1).replace(/\.0$/, '') }) : t('ag.minShort', { n: min });

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '30%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, gap: 4, ...elev(1) },
  tileIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  tileNum: { ...noPad, fontFamily: fonts.display, fontSize: 18, lineHeight: 23, letterSpacing: -0.4, color: colors.ink },
  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, backgroundColor: colors.bgSunken },
  srcRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  srcIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 4 },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.bgSunken, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  dialogWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, gap: 8, ...elev(3) },
});
