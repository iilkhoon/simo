import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radius, shadow as SH, stroke, type, type TypeName } from '../theme';
import { Icon, type IconName } from './Icon';

export const tap = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

/* ───────────── Mətn ───────────── */
export function T({ v = 'body', color, style, center, ...rest }: TextProps & { v?: TypeName; color?: string; center?: boolean }) {
  return <Text {...rest} style={[type[v], { color: color ?? colors.text }, center && { textAlign: 'center' }, style]} />;
}

/* ───────────── Ekran ───────────── */
export function Screen({ children, edges = ['top'], scroll, style, padded = true, night, bg }: {
  children: React.ReactNode; edges?: Edge[]; scroll?: boolean; style?: StyleProp<ViewStyle>; padded?: boolean; night?: boolean; bg?: string;
}) {
  const inner = scroll ? (
    <ScrollView contentContainerStyle={[padded && { padding: 16, paddingBottom: 48 }, style]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { paddingHorizontal: 16 }, style]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: bg ?? (night ? colors.night : colors.bg) }}>
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {inner}
      </SafeAreaView>
    </View>
  );
}

/* ───────────── Neobrutal qutu: kontur + sərt kölgə ─────────────
 * Kölgə ayrıca arxa təbəqədir — iOS və Android-də eyni görünür. */
export function Box({ children, style, inner, bg = colors.card, r = radius.md, sh = SH.md, borderColor = colors.line, shadowColor = colors.ink, pressed }: {
  children?: React.ReactNode; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle>; bg?: string; r?: number; sh?: number;
  borderColor?: string; shadowColor?: string; pressed?: boolean;
}) {
  const d = pressed ? sh : 0;
  return (
    <View style={[{ marginRight: sh, marginBottom: sh }, style]}>
      {sh > 0 ? <View style={{ position: 'absolute', left: sh, top: sh, right: -sh, bottom: -sh, borderRadius: r, backgroundColor: shadowColor }} /> : null}
      <View style={[{ flexGrow: 1, backgroundColor: bg, borderRadius: r, borderWidth: stroke, borderColor, overflow: 'hidden', transform: [{ translateX: d }, { translateY: d }] }, inner]}>
        {children}
      </View>
    </View>
  );
}

/** Basılanda kölgəyə "oturan" toxunma qutusu */
export function PressBox({ onPress, disabled, children, haptic = true, ...box }: React.ComponentProps<typeof Box> & { onPress?: () => void; disabled?: boolean; haptic?: boolean }) {
  const [p, setP] = useState(false);
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => setP(true)}
      onPressOut={() => setP(false)}
      onPress={() => {
        if (haptic) tap();
        onPress?.();
      }}
      style={box.style}
    >
      <Box {...box} style={undefined} pressed={p}>
        {children}
      </Box>
    </Pressable>
  );
}

/* ───────────── Düymələr ───────────── */
type BtnKind = 'primary' | 'dark' | 'light' | 'coin' | 'mint' | 'diamond';
const BTN: Record<BtnKind, { bg: string; fg: string }> = {
  primary: { bg: colors.brand, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.bg },
  light: { bg: colors.card, fg: colors.ink },
  coin: { bg: colors.coin, fg: colors.ink },
  mint: { bg: colors.online, fg: colors.white },
  diamond: { bg: colors.diamond, fg: colors.white },
};

export function Btn({ title, onPress, loading, disabled, kind = 'primary', size = 'lg', icon, iconRight, style, full = true }: {
  title: string; onPress?: () => void; loading?: boolean; disabled?: boolean; kind?: BtnKind; size?: 'lg' | 'md' | 'sm';
  icon?: IconName; iconRight?: React.ReactNode; style?: StyleProp<ViewStyle>; full?: boolean;
}) {
  const c = BTN[kind];
  const h = size === 'lg' ? 56 : size === 'md' ? 46 : 36;
  const sh = size === 'sm' ? SH.sm : SH.md;
  return (
    <PressBox
      onPress={onPress}
      disabled={disabled || loading}
      bg={disabled ? colors.bgSunken : c.bg}
      r={radius.pill}
      sh={disabled ? 0 : sh}
      style={[!full && { alignSelf: 'flex-start' }, style]}
      inner={{ height: h, alignItems: 'center', justifyContent: 'center', paddingHorizontal: size === 'sm' ? 14 : 22, flexDirection: 'row', gap: 8 }}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 19} color={disabled ? colors.textDim : c.fg} /> : null}
          <Text style={{ fontFamily: fonts.bold, fontSize: size === 'lg' ? 16 : size === 'md' ? 15 : 13, color: disabled ? colors.textDim : c.fg }} numberOfLines={1}>
            {title}
          </Text>
          {iconRight}
        </>
      )}
    </PressBox>
  );
}

/** Dairəvi ikon düyməsi */
export function IconBtn({ name, onPress, bg = colors.card, color = colors.ink, size = 44, sh = SH.sm, style, badge, iconSize }: {
  name: IconName; onPress?: () => void; bg?: string; color?: string; size?: number; sh?: number; style?: StyleProp<ViewStyle>; badge?: number; iconSize?: number;
}) {
  return (
    <View style={style}>
      <PressBox onPress={onPress} bg={bg} r={size / 2} sh={sh} inner={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={name} size={iconSize ?? size * 0.46} color={color} />
      </PressBox>
      {badge ? <Badge n={badge} style={{ position: 'absolute', top: -4, right: -2 }} /> : null}
    </View>
  );
}

/* ───────────── Başlıq ───────────── */
export function Header({ title, right, back = true, night, sub }: { title?: string; right?: React.ReactNode; back?: boolean; night?: boolean; sub?: string }) {
  return (
    <View style={styles.header}>
      {back ? (
        <IconBtn name="back" size={40} sh={SH.sm} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      ) : (
        <View style={{ width: 42 }} />
      )}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <T v="h3" color={night ? colors.nightText : colors.ink} numberOfLines={1}>{title}</T>
        {sub ? <T v="tiny" color={night ? colors.nightMuted : colors.textMuted}>{sub}</T> : null}
      </View>
      <View style={{ minWidth: 42, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/** Böyük ekran başlığı (tab ekranları üçün) */
export function TitleBar({ title, kicker, right }: { title: string; kicker?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8, paddingBottom: 14, gap: 12 }}>
      <View style={{ flex: 1 }}>
        {kicker ? <T v="label" color={colors.brand}>{kicker}</T> : null}
        <T v="h1">{title}</T>
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 2 }}>{right}</View> : null}
    </View>
  );
}

/* ───────────── Çip, seqment ───────────── */
export function Chip({ label, active, onPress, style, icon, color = colors.ink }: {
  label: string; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; icon?: IconName; color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && { backgroundColor: color }, pressed && { opacity: 0.8 }, style]}>
      {icon ? <Icon name={icon} size={14} color={active ? colors.bg : colors.ink} /> : null}
      <Text style={[styles.chipText, active && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange, style }: { options: { key: T; label: string; icon?: IconName }[]; value: T; onChange: (k: T) => void; style?: StyleProp<ViewStyle> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[{ flexGrow: 0 }, style]} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingRight: 8 }}>
      {options.map((o) => (
        <Chip key={o.key} icon={o.icon} label={o.label} active={o.key === value} onPress={() => { tap(); onChange(o.key); }} />
      ))}
    </ScrollView>
  );
}

/** Tam enli tab-seçici (2–3 seçim) */
export function Tabs<K extends string>({ options, value, onChange, night }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; night?: boolean }) {
  return (
    <View style={[styles.tabs, night && { backgroundColor: colors.night2, borderColor: 'rgba(246,240,232,0.25)' }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => { tap(); onChange(o.key); }} style={[styles.tab, on && { backgroundColor: night ? colors.bg : colors.ink }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: on ? (night ? colors.ink : colors.bg) : night ? colors.nightMuted : colors.textMuted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────── Sahələr ───────────── */
export function Input({ label, hint, left, style, ...props }: TextInputProps & { label?: string; hint?: string; left?: React.ReactNode }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <T v="label" color={colors.textMuted}>{label}</T> : null}
      <View style={[styles.input, focus && { borderColor: colors.brand }]}>
        {left}
        <TextInput
          placeholderTextColor={colors.textDim}
          selectionColor={colors.brand}
          {...props}
          onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
          style={[styles.inputText, props.multiline && { minHeight: 90, textAlignVertical: 'top', paddingTop: 14 }, style as StyleProp<TextStyle>]}
        />
      </View>
      {hint ? <T v="tiny" color={colors.textDim}>{hint}</T> : null}
    </View>
  );
}

/* ───────────── Vəziyyətlər ───────────── */
export function Loader({ full, night }: { full?: boolean; night?: boolean }) {
  return (
    <View style={[{ padding: 24, alignItems: 'center', justifyContent: 'center' }, full && { flex: 1 }]}>
      <ActivityIndicator color={night ? colors.bg : colors.brand} size="large" />
    </View>
  );
}

export function EmptyState({ icon = 'heart', title, sub, action, tint = colors.brandSoft }: { icon?: IconName; title: string; sub?: string; action?: React.ReactNode; tint?: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, flex: 1 }}>
      <Box bg={tint} r={28} sh={SH.md} inner={{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={38} color={colors.ink} />
      </Box>
      <T v="h3" center style={{ marginTop: 6 }}>{title}</T>
      {sub ? <T v="small" color={colors.textMuted} center>{sub}</T> : null}
      {action}
    </View>
  );
}

/* ───────────── Siyahı sətirləri ───────────── */
export function MenuRow({ icon, label, value, onPress, tint = colors.brandSoft, badge, last, right }: {
  icon: IconName; label: string; value?: string; onPress?: () => void; tint?: string; badge?: number; last?: boolean; right?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { backgroundColor: colors.bgSunken }]}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={17} color={colors.ink} />
      </View>
      <T v="bodyStrong" style={{ flex: 1 }}>{label}</T>
      {badge ? <Badge n={badge} /> : null}
      {value ? <T v="small" color={colors.textMuted}>{value}</T> : null}
      {right ?? <Icon name="chevron" size={16} color={colors.textDim} />}
    </Pressable>
  );
}

const OUTER_KEYS = new Set(['margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'flex', 'width', 'alignSelf', 'position', 'top', 'left', 'right', 'bottom', 'transform']);

/** Kart: xarici yerləşmə (margin, flex, width) kölgəli qutuya, qalanı (padding, gap…) daxili sahəyə tətbiq olunur */
export function Card({ children, style, bg, sh = SH.md, r = radius.lg }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; bg?: string; sh?: number; r?: number }) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const innerS: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (OUTER_KEYS.has(k) ? outer : innerS)[k] = v;
  return <Box bg={bg} sh={sh} r={r} style={outer as ViewStyle} inner={innerS as ViewStyle}>{children}</Box>;
}

export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 12 }, style]}>
      <T v="h3" style={{ flex: 1 }}>{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <T v="small" color={colors.brand} style={{ fontFamily: fonts.bold }}>{action}</T>
          <Icon name="chevron" size={14} color={colors.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Kiçik stiker etiketi */
export function Tag({ label, bg = colors.highlight, fg = colors.ink, icon, style, border = true }: { label: string | number; bg?: string; fg?: string; icon?: IconName; style?: StyleProp<ViewStyle>; border?: boolean }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }, !border && { borderWidth: 0 }, style]}>
      {icon ? <Icon name={icon} size={11} color={fg} /> : null}
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Badge({ n, style }: { n: number; style?: StyleProp<ViewStyle> }) {
  if (!n) return null;
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{n > 99 ? '99+' : n}</Text>
    </View>
  );
}
/** geriyə uyğunluq */
export const UnreadDot = ({ n }: { n: number }) => <Badge n={n} style={{ position: 'absolute', top: -6, right: -12 }} />;

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 2, backgroundColor: colors.ink, borderRadius: 1 }, style]} />;
}

export function LiveDot({ color = colors.brand }: { color?: string }) {
  return <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  header: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: radius.pill,
    borderWidth: stroke, borderColor: colors.ink, backgroundColor: colors.card,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  tabs: { flexDirection: 'row', borderWidth: stroke, borderColor: colors.ink, borderRadius: radius.pill, padding: 3, backgroundColor: colors.card },
  tab: { flex: 1, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: stroke, borderColor: colors.ink, paddingHorizontal: 14, minHeight: 54,
  },
  inputText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rowLine: { borderBottomWidth: 1.5, borderBottomColor: colors.hairline },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.ink },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.ink, alignSelf: 'flex-start' },
  tagText: { fontFamily: fonts.black, fontSize: 10, letterSpacing: 0.3 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 1.5, borderColor: colors.ink },
  badgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.black },
});
