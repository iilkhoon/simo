import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors, fonts } from '../theme';
import { Box } from './ui';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      {toasts.map((t) => (
        <Box key={t.id} sh={3} r={14} bg={t.kind === 'error' ? colors.brandSoft : t.kind === 'success' ? colors.onlineSoft : colors.card} inner={styles.toast}>
          <Text style={styles.text}>{t.text}</Text>
        </Box>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, gap: 6, zIndex: 999 },
  toast: { paddingVertical: 12, paddingHorizontal: 16 },
  text: { color: colors.ink, fontSize: 14, fontFamily: fonts.bold, textAlign: 'center' },
});
