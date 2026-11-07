import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, elev, fonts, noPad, radius } from '../theme';
import { Icon, type IconName } from './Icon';

const KIND: Record<string, { icon: IconName; disc: string }> = {
  success: { icon: 'checkmark', disc: colors.online },
  error: { icon: 'close', disc: colors.brand },
  info: { icon: 'bell', disc: colors.ink },
};

/** Yuxarıdan sürüşən bildiriş həbləri: ikon + mətn (tünd fon — istənilən ekranda oxunur) */
export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      {toasts.map((t) => {
        const k = KIND[t.kind] ?? KIND.info;
        // köhnə çağırışlar yalnız "✓" göndərir — onu ikonla göstəririk
        const text = t.text === '✓' ? '' : t.text;
        return (
          <Animated.View key={t.id} entering={FadeInUp.springify().damping(18).stiffness(220)} exiting={FadeOutUp.duration(160)} layout={LinearTransition} style={[styles.toast, elev(3), !text && { alignSelf: 'center', paddingRight: 6 }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <View style={[styles.disc, { backgroundColor: k.disc }]}><Icon name={k.icon} size={14} color={colors.white} /></View>
            {text ? <Text style={styles.text} numberOfLines={3}>{text}</Text> : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, gap: 8, zIndex: 999, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 420, minHeight: 44, paddingVertical: 8, paddingLeft: 8, paddingRight: 16, borderRadius: radius.pill, backgroundColor: colors.night2 },
  disc: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  text: { ...noPad, flexShrink: 1, color: colors.nightText, fontSize: 14, lineHeight: 19, fontFamily: fonts.bold },
});
