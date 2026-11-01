import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      {toasts.map((t) => (
        <View key={t.id} style={[styles.toast, t.kind === 'error' && { borderColor: colors.danger }, t.kind === 'success' && { borderColor: colors.success }]}>
          <Text style={styles.text}>{t.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, gap: 8, zIndex: 999 },
  toast: { backgroundColor: 'rgba(34,18,56,0.97)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.borderStrong },
  text: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
