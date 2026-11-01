import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export interface SheetOption {
  label: string;
  onPress: () => void;
  danger?: boolean;
}

export function ActionSheet({ visible, title, options, onClose }: { visible: boolean; title?: string; options: SheetOption[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 10 }]}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {options.map((o) => (
          <Pressable
            key={o.label}
            onPress={() => {
              onClose();
              o.onPress();
            }}
            style={({ pressed }) => [styles.opt, pressed && { backgroundColor: colors.surface2 }]}
          >
            <Text style={[styles.optText, o.danger && { color: colors.danger }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#1A0C2C', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 8 },
  title: { color: colors.textMuted, textAlign: 'center', paddingVertical: 10, fontWeight: '600' },
  opt: { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14 },
  optText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
