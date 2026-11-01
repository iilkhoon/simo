import React from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, font, gradients, radius } from '../theme';
import { Icon, type IconName } from './Icon';

export function Screen({ children, edges = ['top'], scroll, style, padded = true }: {
  children: React.ReactNode; edges?: Edge[]; scroll?: boolean; style?: StyleProp<ViewStyle>; padded?: boolean;
}) {
  const inner = scroll ? (
    <ScrollView contentContainerStyle={[padded && { padding: 16, paddingBottom: 40 }, style]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { paddingHorizontal: 16 }, style]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['#2B1055', colors.bg, colors.bg]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {inner}
      </SafeAreaView>
    </View>
  );
}

export function Header({ title, right, back = true, transparent }: { title?: string; right?: React.ReactNode; back?: boolean; transparent?: boolean }) {
  return (
    <View style={[styles.header, transparent && { backgroundColor: 'transparent' }]}>
      {back ? (
        <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.headerBtn}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <Text style={[font.h3, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.headerBtn, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export function GradientButton({ title, onPress, loading, disabled, colors: c = gradients.primary, style, icon, small, textStyle }: {
  title: string; onPress?: () => void; loading?: boolean; disabled?: boolean; colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>; icon?: IconName; small?: boolean; textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      <LinearGradient colors={c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, small && styles.btnSmall]}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon ? <Icon name={icon} size={small ? 16 : 20} color="#fff" /> : null}
            <Text style={[styles.btnText, small && { fontSize: 14 }, textStyle]}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function OutlineButton({ title, onPress, style, icon, small, danger }: {
  title: string; onPress?: () => void; style?: StyleProp<ViewStyle>; icon?: IconName; small?: boolean; danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.outline, small && styles.btnSmall, { opacity: pressed ? 0.7 : 1 }, style]}>
      {icon ? <Icon name={icon} size={18} color={danger ? colors.danger : colors.text} /> : null}
      <Text style={[styles.btnText, { color: danger ? colors.danger : colors.text }, small && { fontSize: 14 }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, style }: { label: string; active?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={style}>
      {active ? (
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.chip}>
          <Text style={[styles.chipText, { color: '#fff' }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {props.label ? <Text style={font.small}>{props.label}</Text> : null}
      <TextInput placeholderTextColor={colors.textDim} {...props} style={[styles.input, props.style]} />
    </View>
  );
}

export function Loader({ full }: { full?: boolean }) {
  return (
    <View style={[{ padding: 24, alignItems: 'center', justifyContent: 'center' }, full && { flex: 1 }]}>
      <ActivityIndicator color={colors.rose} size="large" />
    </View>
  );
}

export function EmptyState({ icon = 'heart', title, sub, action }: { icon?: IconName; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, flex: 1 }}>
      <LinearGradient colors={gradients.primary} style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={38} color="#fff" />
      </LinearGradient>
      <Text style={[font.h3, { textAlign: 'center' }]}>{title}</Text>
      {sub ? <Text style={[font.small, { textAlign: 'center' }]}>{sub}</Text> : null}
      {action}
    </View>
  );
}

export function MenuRow({ icon, label, value, onPress, color, badge }: { icon: IconName; label: string; value?: string; onPress?: () => void; color?: string; badge?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: (color ?? colors.rose) + '22' }]}>
        <Icon name={icon} size={18} color={color ?? colors.rose} />
      </View>
      <Text style={[font.body, { flex: 1 }]}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      {value ? <Text style={font.small}>{value}</Text> : null}
      <Icon name="chevron" size={16} color={colors.textDim} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {options.map((o) => (
        <Chip key={o.key} label={o.label} active={o.key === value} onPress={() => onChange(o.key)} />
      ))}
    </ScrollView>
  );
}

export function UnreadDot({ n }: { n: number }) {
  if (!n) return null;
  return (
    <View style={[styles.badge, { position: 'absolute', top: -4, right: -10 }]}>
      <Text style={styles.badgeText}>{n > 99 ? '99+' : n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 4 },
  btn: { height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  btnSmall: { height: 40, paddingHorizontal: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  outline: { height: 54, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.borderStrong, flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 16, paddingHorizontal: 16, height: 54 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
