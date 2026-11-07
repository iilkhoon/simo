import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, elev, fonts, glow, gradients, noPad, radius, type GradientName } from '../theme';
import { Icon, type IconName } from './Icon';
import { tap } from './ui';
import { Pressable3 } from './motion';

type Item = { key: string; icon: IconName; g: GradientName; fg: string; href: Href };

const ITEMS: Item[] = [
  { key: 'video', icon: 'videocam', g: 'nar', fg: colors.white, href: { pathname: '/video/upload', params: { type: 'VIDEO' } } },
  { key: 'photo', icon: 'image', g: 'gold', fg: colors.ink, href: { pathname: '/video/upload', params: { type: 'PHOTO' } } },
  { key: 'story', icon: 'sparkles', g: 'lilac', fg: colors.ink, href: '/story/new' },
  { key: 'live', icon: 'radio', g: 'night', fg: colors.white, href: { pathname: '/live/start', params: { type: 'VIDEO' } } },
  { key: 'voice', icon: 'mic', g: 'diamond', fg: colors.white, href: { pathname: '/live/start', params: { type: 'VOICE' } } },
  { key: 'private', icon: 'lock', g: 'lime', fg: colors.ink, href: { pathname: '/video/upload', params: { private: '1' } } },
];

/** Ortadakı "+" — yaratma menyusu: video, foto, story, canlı yayın, səsli otaq, private post, video tanışlıq */
export function CreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      y.setValue(0);
      Animated.spring(y, { toValue: 1, damping: 18, stiffness: 180, mass: 0.9, useNativeDriver: true }).start();
    }
  }, [visible, y]);
  const go = (href: Href) => {
    tap();
    onClose();
    setTimeout(() => router.push(href), 120);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} />
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 18, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] }]}>
        <View style={styles.grip} />
        <Text style={styles.title}>{t('create.title')}</Text>
        <View style={styles.grid}>
          {ITEMS.map((it, i) => (
            <Animated.View key={it.key} style={{ width: '31%', opacity: y, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [30 + i * 8, 0] }) }] }}>
              <Pressable3 scaleTo={0.94} onPress={() => go(it.href)} style={[styles.item, elev(1)]} accessibilityRole="button">
                <View style={styles.disc}>
                  <LinearGradient colors={gradients[it.g] as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <Icon name={it.icon} size={24} color={it.fg} />
                </View>
                <Text style={styles.label} numberOfLines={1}>{t(`create.${it.key}`)}</Text>
              </Pressable3>
            </Animated.View>
          ))}
        </View>
        <Pressable3 scaleTo={0.97} onPress={() => go({ pathname: '/match', params: { type: 'VIDEO' } })} style={[styles.match, glow(colors.brand)]} accessibilityRole="button">
          <View style={[StyleSheet.absoluteFill, { borderRadius: 28, overflow: 'hidden' }]}>
            <LinearGradient colors={gradients.nar as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>
          <Icon name="shuffle" size={20} color={colors.white} />
          <Text style={styles.matchText}>{t('live.quickVideo')}</Text>
          <Icon name="arrowRight" size={18} color={colors.white} />
        </Pressable3>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 10 },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(26,21,18,0.18)', marginBottom: 14 },
  title: { ...noPad, fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: colors.ink, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  item: { alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.card },
  disc: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { ...noPad, fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  match: { marginTop: 16, height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  matchText: { ...noPad, fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.white },
});
