import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { blocks, colors, elev, fonts, glow, noPad, radius, shadow as SH, type, type BlockName, type TypeName, webNoOutline } from '../theme';
import { Icon, type IconName } from './Icon';
import { Mascot, type MascotPose } from './Mascot';
import { MASCOT } from './mascotAssets';

export const tap = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

/* ───────────── Mətn ───────────── */
export function T({ v = 'body', color, style, center, ...rest }: TextProps & { v?: TypeName; color?: string; center?: boolean }) {
  return <Text {...rest} style={[type[v], { color: color ?? colors.text }, center && { textAlign: 'center' }, style]} />;
}

/* ───────────── Ekran ───────────── */
export function Screen({ children, edges = ['top'], scroll, style, padded = true, night, bg, keyboard }: {
  children: React.ReactNode; edges?: Edge[]; scroll?: boolean; style?: StyleProp<ViewStyle>; padded?: boolean; night?: boolean; bg?: string;
  /** Sürüşməyən formalar: klaviatura açılanda məzmun (və altdakı düymə) yuxarı qalxır */
  keyboard?: boolean;
}) {
  const inner = scroll ? (
    // Klaviatura açılanda fokusdakı sahə və altdakı düymələr görünən qalır
    <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={[padded && { paddingHorizontal: 16, paddingBottom: 48 }, style]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </KeyboardAwareScrollView>
  ) : keyboard ? (
    <KeyboardAvoidingView behavior="padding" style={[{ flex: 1 }, padded && { paddingHorizontal: 16 }, style]}>{children}</KeyboardAvoidingView>
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

/* ───────────── Kart qutusu ─────────────
 * Yumşaq üslub: ağ kart + iri radius + yumşaq kölgə (sh = 0–3).
 * `hard` — oynaq "stiker" görünüşü: nazik kontur + sərt ofset kölgə (promo, hədiyyə, bonus). */
export function Box({ children, style, inner, bg = colors.card, r = radius.md, sh = SH.md, borderColor, shadowColor = colors.ink, pressed, hard }: {
  children?: React.ReactNode; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle>; bg?: string; r?: number; sh?: number;
  borderColor?: string; shadowColor?: string; pressed?: boolean; hard?: boolean;
}) {
  if (hard) {
    const o = 4;
    const d = pressed ? o : 0;
    return (
      <View style={[{ marginRight: o, marginBottom: o }, style]}>
        <View style={{ position: 'absolute', left: o, top: o, right: -o, bottom: -o, borderRadius: r, backgroundColor: shadowColor }} />
        <View style={[{ flexGrow: 1, backgroundColor: bg, borderRadius: r, borderWidth: 2, borderColor: borderColor ?? colors.ink, overflow: 'hidden', transform: [{ translateX: d }, { translateY: d }] }, inner]}>
          {children}
        </View>
      </View>
    );
  }
  return (
    <View style={[{ borderRadius: r, backgroundColor: bg }, elev(sh), pressed && { transform: [{ scale: 0.97 }] }, style]}>
      <View style={[{ flexGrow: 1, borderRadius: r, overflow: 'hidden', backgroundColor: bg }, borderColor ? { borderWidth: 1.5, borderColor } : null, inner]}>
        {children}
      </View>
    </View>
  );
}

/** Toxunma qutusu — basılanda yüngülcə kiçilir */
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
type BtnKind = 'primary' | 'dark' | 'light' | 'coin' | 'mint' | 'diamond' | 'ghost';
const BTN: Record<BtnKind, { bg: string; fg: string }> = {
  primary: { bg: colors.brand, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.bg },
  light: { bg: colors.card, fg: colors.ink },
  coin: { bg: colors.coin, fg: colors.ink },
  mint: { bg: colors.online, fg: colors.white },
  diamond: { bg: colors.diamond, fg: colors.white },
  ghost: { bg: 'rgba(26,21,18,0.06)', fg: colors.ink },
};

export function Btn({ title, onPress, loading, disabled, kind = 'primary', size = 'lg', icon, iconRight, style, full = true }: {
  title: string; onPress?: () => void; loading?: boolean; disabled?: boolean; kind?: BtnKind; size?: 'lg' | 'md' | 'sm';
  icon?: IconName; iconRight?: React.ReactNode; style?: StyleProp<ViewStyle>; full?: boolean;
}) {
  const c = BTN[kind];
  const h = size === 'lg' ? 56 : size === 'md' ? 46 : 36;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={() => { tap(); onPress?.(); }}
      disabled={off}
      style={({ pressed }) => [
        { height: h, borderRadius: radius.pill, backgroundColor: disabled ? colors.bgSunken : c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: size === 'sm' ? 14 : 22, flexDirection: 'row', gap: 8 },
        !disabled && kind === 'primary' && size !== 'sm' ? glow(colors.brand) : null,
        !disabled && kind === 'light' ? elev(1) : null,
        !full && { alignSelf: 'center' },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.94 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 19} color={disabled ? colors.textDim : c.fg} /> : null}
          <Text style={{ ...noPad, fontFamily: fonts.bold, fontSize: size === 'lg' ? 16 : size === 'md' ? 15 : 13, lineHeight: size === 'lg' ? 20 : size === 'md' ? 19 : 17, color: disabled ? colors.textDim : c.fg }} numberOfLines={1}>
            {title}
          </Text>
          {iconRight}
        </>
      )}
    </Pressable>
  );
}

/** Dairəvi ikon düyməsi */
export function IconBtn({ name, onPress, bg = colors.card, color = colors.ink, size = 44, sh = SH.sm, style, badge, iconSize }: {
  name: IconName; onPress?: () => void; bg?: string; color?: string; size?: number; sh?: number; style?: StyleProp<ViewStyle>; badge?: number; iconSize?: number;
}) {
  return (
    <View style={style}>
      <Pressable
        onPress={() => { tap(); onPress?.(); }}
        style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, bg !== 'transparent' && elev(sh), pressed && { transform: [{ scale: 0.92 }] }]}
      >
        <Icon name={name} size={iconSize ?? size * 0.46} color={color} />
      </Pressable>
      {badge ? <Badge n={badge} style={{ position: 'absolute', top: -4, right: -2 }} /> : null}
    </View>
  );
}

/* ───────────── Başlıq ───────────── */
export function Header({ title, right, back = true, night, sub }: { title?: string; right?: React.ReactNode; back?: boolean; night?: boolean; sub?: string }) {
  return (
    <View style={styles.header}>
      {back ? (
        <IconBtn name="back" size={42} sh={night ? 0 : SH.sm} bg={night ? colors.glassLight : colors.card} color={night ? colors.white : colors.ink} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
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
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 12, gap: 8, minHeight: 54 }}>
      <View style={{ flex: 1 }}>
        {kicker ? <T v="label" color={colors.brand}>{kicker}</T> : null}
        <T v="h1">{title}</T>
      </View>
      {right ? <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View> : null}
    </View>
  );
}

/* ───────────── Çip, seqment ───────────── */
export function Chip({ label, active, onPress, style, icon, color = colors.ink }: {
  label: string; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>; icon?: IconName; color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && { backgroundColor: color, borderColor: color }, pressed && { opacity: 0.8 }, style]}>
      {icon ? <Icon name={icon} size={14} color={active ? colors.bg : colors.ink} /> : null}
      <Text style={[styles.chipText, active && { color: colors.bg }]}>{label}</Text>
    </Pressable>
  );
}

/** Foto üzərində şüşə-həb (məlumat etiketləri) */
export function GlassPill({ label, icon, color = colors.white, bg = colors.glass, style }: { label: string; icon?: IconName; color?: string; bg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.glass, { backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <Text style={[styles.glassText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
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
    <View style={[styles.tabs, night && { backgroundColor: colors.night3 }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => { tap(); onChange(o.key); }} style={[styles.tab, on && [{ backgroundColor: night ? colors.bg : colors.card }, elev(1)]]}>
            <Text style={{ ...noPad, fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: on ? colors.ink : night ? colors.nightMuted : colors.textMuted }} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────── Brend blokları (çat-qabarcığı başlıq) ───────────── */
/** Düz rəngli "danışıq qabarcığı" blok — promo başlıqlar, boş vəziyyətlər, marketinq */
export function SpeechBlock({ children, color = 'nar', tail = 'left', style, rotate = 0, size = 'md' }: {
  children: React.ReactNode; color?: BlockName; tail?: 'left' | 'right' | 'none'; style?: StyleProp<ViewStyle>; rotate?: number; size?: 'sm' | 'md' | 'lg';
}) {
  const b = blocks[color];
  const pad = size === 'lg' ? 18 : size === 'md' ? 14 : 10;
  return (
    <View style={[{ alignSelf: 'flex-start', transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <View style={{ backgroundColor: b.bg, borderRadius: size === 'sm' ? 14 : 22, paddingHorizontal: pad + 4, paddingVertical: pad }}>
        {typeof children === 'string' ? (
          <Text style={{ fontFamily: fonts.displayBlack, fontSize: size === 'lg' ? 30 : size === 'md' ? 22 : 15, lineHeight: size === 'lg' ? 32 : size === 'md' ? 25 : 18, letterSpacing: -0.8, color: b.fg }}>{children}</Text>
        ) : children}
      </View>
      {tail !== 'none' ? (
        <View style={{ position: 'absolute', bottom: -9, [tail === 'left' ? 'left' : 'right']: 22, width: 22, height: 22, backgroundColor: b.bg, borderRadius: 3, transform: [{ rotate: '45deg' }, { skewX: '12deg' }], zIndex: -1 }} />
      ) : null}
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

/** Boş vəziyyətlərdə ikon əvəzinə maskot pozası */
const EMPTY_POSE: Partial<Record<IconName, MascotPose>> = {
  heart: 'heart', chat: 'wave', call: 'call', video: 'dance', location: 'search', compass: 'search', bell: 'sleep',
  live: 'sing', mic: 'sing', ban: 'cool', people: 'welcome', gift: 'gift', eye: 'shy', trophy: 'trophy', time: 'think',
};

export function EmptyState({ icon = 'heart', title, sub, action, tint = colors.brandSoft, pose }: { icon?: IconName; title: string; sub?: string; action?: React.ReactNode; tint?: string; pose?: MascotPose }) {
  const p = pose ?? EMPTY_POSE[icon];
  const hasMascot = !!(p && MASCOT[p]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, flex: 1 }}>
      {hasMascot ? <Mascot pose={p} size={150} /> : (
        <View style={{ width: 96, height: 96, borderRadius: 34, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
          <Icon name={icon} size={40} color={colors.ink} />
        </View>
      )}
      <T v="h3" center style={{ marginTop: 6 }}>{title}</T>
      {sub ? <T v="small" color={colors.textMuted} center>{sub}</T> : null}
      {action}
    </View>
  );
}

/* ───────────── Siyahı sətirləri ───────────── */
export function MenuRow({ icon, label, value, onPress, tint = colors.brandSoft, badge, last, right, danger }: {
  icon: IconName; label: string; value?: string; onPress?: () => void; tint?: string; badge?: number; last?: boolean; right?: React.ReactNode; danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { backgroundColor: colors.bgSunken }]}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={danger ? colors.danger : colors.ink} />
      </View>
      <T v="bodyStrong" color={danger ? colors.danger : colors.ink} style={{ flex: 1 }} numberOfLines={1}>{label}</T>
      {badge ? <Badge n={badge} /> : null}
      {value ? <T v="small" color={colors.textMuted}>{value}</T> : null}
      {right ?? <Icon name="chevron" size={16} color={colors.textDim} />}
    </Pressable>
  );
}

const OUTER_KEYS = new Set(['margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'flex', 'width', 'alignSelf', 'position', 'top', 'left', 'right', 'bottom', 'transform']);

/** Kart: xarici yerləşmə (margin, flex, width) kölgəli qutuya, qalanı (padding, gap…) daxili sahəyə tətbiq olunur */
export function Card({ children, style, bg, sh = SH.md, r = radius.lg, hard }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; bg?: string; sh?: number; r?: number; hard?: boolean }) {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const innerS: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) (OUTER_KEYS.has(k) ? outer : innerS)[k] = v;
  const tinted = bg && bg !== colors.card;
  return <Box bg={bg} sh={tinted && !hard ? 0 : sh} r={r} hard={hard} style={outer as ViewStyle} inner={innerS as ViewStyle}>{children}</Box>;
}

export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 }, style]}>
      <T v="h3" style={{ flex: 1, fontSize: 19 }}>{title}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: colors.card }}>
          <T v="small" color={colors.ink} style={{ fontFamily: fonts.bold }}>{action}</T>
          <Icon name="chevron" size={13} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Kiçik etiket (düz rəngli həb) */
export function Tag({ label, bg = colors.highlight, fg = colors.ink, icon, style }: { label: string | number; bg?: string; fg?: string; icon?: IconName; style?: StyleProp<ViewStyle>; border?: boolean }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
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
  return <View style={[{ height: 1, backgroundColor: colors.hairline }, style]} />;
}

export function LiveDot({ color = colors.brand }: { color?: string }) {
  return <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  header: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 15, height: 38, borderRadius: radius.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(26,21,18,0.1)',
  },
  chipText: { ...noPad, fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17, color: colors.ink },
  glass: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 26, borderRadius: 13, alignSelf: 'flex-start' },
  glassText: { ...noPad, fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 14 },
  tabs: { flexDirection: 'row', borderRadius: radius.pill, padding: 4, backgroundColor: colors.bgSunken },
  tab: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgSunken, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 16, minHeight: 56,
  },
  inputText: { flex: 1, minWidth: 0, ...webNoOutline, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, height: 22, borderRadius: 11, alignSelf: 'flex-start' },
  tagText: { ...noPad, fontFamily: fonts.black, fontSize: 10.5, lineHeight: 13, letterSpacing: 0.2 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: colors.card },
  badgeText: { ...noPad, color: colors.white, fontSize: 10, lineHeight: 12, fontFamily: fonts.black },
});
