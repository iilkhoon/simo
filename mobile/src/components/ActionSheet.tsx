import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

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
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.grip} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {options.map((o) => (
          <Pressable
            key={o.label}
            onPress={() => {
              onClose();
              o.onPress();
            }}
            style={({ pressed }) => [styles.opt, pressed && { backgroundColor: colors.bgSunken }]}
          >
            <Text style={[styles.optText, o.danger && { color: colors.danger }]}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

export const sheetStyles = StyleSheet.create({
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 2, borderBottomWidth: 0, borderColor: colors.ink },
  grip: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.ink, marginBottom: 6 },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: { ...sheetStyles.sheet, paddingTop: 10, paddingHorizontal: 10 },
  grip: sheetStyles.grip,
  title: { color: colors.textMuted, textAlign: 'center', paddingVertical: 10, fontFamily: fonts.bold, fontSize: 13 },
  opt: { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 14 },
  optText: { color: colors.ink, fontSize: 16, fontFamily: fonts.bold, textAlign: 'center' },
});
