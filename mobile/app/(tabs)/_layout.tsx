import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { colors, elev, fonts, glow } from '@/theme';
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
/** Panel: 2 tab · [+] · 2 tab (simmetrik). "Kəşf" Ana ekranın içindədir. */
const LEFT = ['index', 'videos'];
const RIGHT = ['chats', 'me'];

type BarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
};

/**
 * Üzən tab paneli: ağ kapsul + yumşaq kölgə, 2 tab · ortada qaldırılmış "+" (yaratma menyusu) · 2 tab.
 * Aktiv tab — ikon + ad + nar nöqtəsi. Video lentində panel tünd rejimə keçir.
 */
function TabBar({ state, descriptors, navigation }: BarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const unread = useStore((s) => s.unreadChats);
  const night = state.routes[state.index]?.name === 'videos';
  const item = (route: { key: string; name: string }, i: number) => {
    const focused = state.index === i;
    const [on, off] = ICONS[route.name] ?? ['heart', 'heartOutline'];
    const label = descriptors[route.key]?.options.title ?? route.name;
    const badge = route.name === 'chats' ? unread : 0;
    const fg = focused ? (night ? colors.white : colors.ink) : night ? colors.nightMuted : colors.textDim;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={() => {
          tap();
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.item}
      >
        <Icon name={focused ? on : off} size={23} color={fg} />
        <Text style={[styles.label, { color: fg }]} numberOfLines={1}>{label}</Text>
        {focused ? <View style={styles.dot} /> : null}
        {badge ? <Badge n={badge} style={{ position: 'absolute', top: 4, right: '18%' }} /> : null}
      </Pressable>
    );
  };
  const [create, setCreate] = useState(false);
  const idx = (name: string) => state.routes.findIndex((r) => r.name === name);
  const side = (names: string[]) => names.map((n) => (idx(n) >= 0 ? item(state.routes[idx(n)], idx(n)) : null));
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: night ? colors.night : colors.bg }]} pointerEvents="box-none">
      <View style={[styles.bar, night ? { backgroundColor: colors.night2 } : [{ backgroundColor: colors.card }, elev(3)]]}>
        {side(LEFT)}
        <View style={styles.centerSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('create.title')}
            onPress={() => { tap(); setCreate(true); }}
            style={({ pressed }) => [styles.center, glow(colors.brand), night && { borderColor: colors.night }, pressed && { transform: [{ scale: 0.92 }] }]}
          >
            <Icon name="add" size={32} color={colors.white} />
          </Pressable>
        </View>
        {side(RIGHT)}
      </View>
      <CreateSheet visible={create} onClose={() => setCreate(false)} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(p) => <TabBar {...(p as unknown as BarProps)} />}
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
  wrap: { paddingHorizontal: 12, paddingTop: 4 },
  bar: { flexDirection: 'row', height: 66, borderRadius: 33, alignItems: 'center', paddingHorizontal: 4 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 },
  label: { fontFamily: fonts.bold, fontSize: 10.5, maxWidth: 70 },
  dot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand },
  centerSlot: { width: 76, alignItems: 'center' },
  center: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: -26, borderWidth: 5, borderColor: colors.bg },
});
