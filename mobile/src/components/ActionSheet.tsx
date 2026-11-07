import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts, noPad, radius } from '../theme';
import { Icon, type IconName } from './Icon';

export interface SheetOption {
  label: string;
  onPress: () => void;
  danger?: boolean;
  icon?: IconName;
}

export function ActionSheet({ visible, title, options, onClose }: { visible: boolean; title?: string; options: SheetOption[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  // Çağıranların əlavə etdiyi "Ləğv et" seçimi ayrıca aşağıdakı düymə ilə göstərilir (təkrar olmasın)
  const cancel = t('common.cancel');
  const items = options.filter((o) => o.label !== cancel);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.grip} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <View style={styles.group}>
          {items.map((o, i) => (
            <Pressable
              key={o.label}
              onPress={() => {
                onClose();
                o.onPress();
              }}
              style={({ pressed }) => [styles.opt, i < items.length - 1 && styles.optLine, pressed && { backgroundColor: colors.bgSunken }]}
              accessibilityRole="button"
            >
              {o.icon ? <Icon name={o.icon} size={19} color={o.danger ? colors.danger : colors.ink} /> : null}
              <Text style={[styles.optText, o.danger && { color: colors.danger }]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]} accessibilityRole="button">
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export const sheetStyles = StyleSheet.create({
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(26,21,18,0.18)', marginBottom: 6 },
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim },
  sheet: { ...sheetStyles.sheet, paddingTop: 10, paddingHorizontal: 14 },
  grip: sheetStyles.grip,
  title: { color: colors.textMuted, textAlign: 'center', paddingVertical: 10, fontFamily: fonts.bold, fontSize: 13 },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', marginTop: 4 },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 16 },
  optLine: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  optText: { ...noPad, color: colors.ink, fontSize: 16, lineHeight: 21, fontFamily: fonts.bold, textAlign: 'center' },
  cancel: { marginTop: 10, height: 52, borderRadius: radius.lg, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...noPad, color: colors.textMuted, fontSize: 16, lineHeight: 21, fontFamily: fonts.bold },
});
