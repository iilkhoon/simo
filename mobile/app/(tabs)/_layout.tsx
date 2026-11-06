import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import Reanimated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { colors, fonts, motion } from '@/theme';
import { Glass, TAB_BAR_H as BAR_H } from '@/components/Glass';
import { Icon, type IconName } from '@/components/Icon';
import { Badge, tap } from '@/components/ui';
import { useStore } from '@/store';
import { CreateSheet } from '@/components/CreateSheet';

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home', 'homeOutline'],
  videos: ['video', 'playOutline'],
  chats: ['chat', 'chatsOutline'],
  me: ['person', 'personOutline'],
};
/** Panel: 4 tab şüşə kapsulda + ayrıca "+" dairəsi. "Kəşf" Ana ekranın içindədir. */
const LEFT = ['index', 'videos'];
const RIGHT = ['chats', 'me'];

type BarProps = Pick<BottomTabBarProps, 'state' | 'descriptors' | 'emitter' | 'navigateToTab'>;

/** Aktiv olanda ikon kiçik "sıçrayış" edir (yay: 1 → 1.22 → 1) və bir az yuxarı qalxır */
function TabIcon({ focused, name, color }: { focused: boolean; name: IconName; color: string }) {
  const s = useSharedValue(1);
  const y = useSharedValue(0);
  useEffect(() => {
    if (focused) {
      s.value = withSequence(withTiming(1.22, { duration: 120 }), withSpring(1, motion.bouncy));
      y.value = withSpring(-1.5, motion.enter);
    } else {
      y.value = withSpring(0, motion.enter);
    }
  }, [focused, s, y]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: s.value }] }));
  return <Reanimated.View style={a}><Icon name={name} size={24} color={color} /></Reanimated.View>;
}


/**
 * iOS 27 üslubunda üzən şüşə tab paneli:
 * — şüşə kapsulda 4 tab, aktiv tabın arxasında "linza" yay effekti ilə sürüşür (toxunanda bir az şişir);
 * — sağda ayrıca şüşə dairə: "+" (yaratma menyusu), iOS-dakı ayrıca axtarış düyməsi kimi;
 * — məzmun panelin altından keçir (şüşə arxasında bulanır). Video lentində panel tünd şüşəyə keçir.
 */
function TabBar({ state, descriptors, emitter, navigateToTab }: BarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const unread = useStore((s) => s.unreadChats);
  const night = state.routes[state.index]?.name === 'videos';
  const order = [...LEFT, ...RIGHT];
  const activeName = state.routes[state.index]?.name;
  const activePos = Math.max(0, order.indexOf(activeName === 'discover' ? 'index' : activeName));
  const [w, setW] = useState(0);
  const tabW = w / order.length;
  const x = useRef(new Animated.Value(0)).current;
  const sx = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!tabW) return;
    Animated.parallel([
      Animated.spring(x, { toValue: activePos * tabW, useNativeDriver: true, damping: 16, stiffness: 190, mass: 0.9 }),
      // "maye" effekt: sürüşərkən linza enlənir, sonra yerinə oturur
      Animated.sequence([
        Animated.timing(sx, { toValue: 1.18, duration: 110, useNativeDriver: true }),
        Animated.spring(sx, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 220 }),
      ]),
    ]).start();
  }, [activePos, tabW, x, sx]);
  const [create, setCreate] = useState(false);
  const fgOn = colors.brand;
  const fgOff = night ? 'rgba(255,255,255,0.72)' : 'rgba(26,21,18,0.62)';
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <Glass radius={BAR_H / 2} dark={night} style={styles.bar} interactive>
        <View style={styles.row} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {tabW ? (
            <Animated.View pointerEvents="none" style={[styles.lens, { width: tabW - 8, transform: [{ translateX: x }, { scaleX: sx }] }, night ? styles.lensNight : null]} />
          ) : null}
          {order.map((name) => {
            const i = state.routes.findIndex((r) => r.name === name);
            if (i < 0) return null;
            const route = state.routes[i];
            const focused = order[activePos] === name;
            const [on, off] = ICONS[name] ?? ['heart', 'heartOutline'];
            const label = descriptors[route.key]?.options.title ?? name;
            const badge = name === 'chats' ? unread : 0;
            const fg = focused ? fgOn : fgOff;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={() => {
                  tap();
                  // expo-router SDK 58: tab paneli "navigation" yox, "emitter" + "navigateToTab" alır
                  const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!e.defaultPrevented && state.index !== i) navigateToTab(route.key);
                }}
                style={styles.item}
              >
                <TabIcon focused={focused} name={focused ? on : off} color={fg} />
                <Text style={[styles.label, { color: fg }, focused && styles.labelOn]} numberOfLines={1}>{label}</Text>
                {badge ? <Badge n={badge} style={{ position: 'absolute', top: 5, right: '20%' }} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Glass>
      <Pressable accessibilityRole="button" accessibilityLabel={t('create.title')} onPress={() => { tap(); setCreate(true); }} style={({ pressed }) => [pressed && { transform: [{ scale: 0.9 }] }]}>
        <Glass radius={BAR_H / 2} dark={night} tint="rgba(242,52,79,0.88)" style={styles.plus} interactive>
          <Icon name="add" size={30} color={colors.white} />
        </Glass>
      </Pressable>
      <CreateSheet visible={create} onClose={() => setCreate(false)} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(p) => <TabBar {...p} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="videos" options={{ title: t('tabs.feed') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats') }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.profile') }} />
      <Tabs.Screen name="discover" options={{ title: t('tabs.discover'), href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1, height: BAR_H },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 },
  lens: { position: 'absolute', left: 4, top: 5, bottom: 5, borderRadius: (BAR_H - 10) / 2, backgroundColor: 'rgba(242,52,79,0.09)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.95)', shadowColor: '#2A140F', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  lensNight: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.18)' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_H, gap: 1 },
  label: { fontFamily: fonts.semibold, fontSize: 10.5, maxWidth: 74 },
  labelOn: { fontFamily: fonts.black },
  plus: { width: BAR_H, height: BAR_H, alignItems: 'center', justifyContent: 'center' },
});
