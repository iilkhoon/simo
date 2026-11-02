import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { colors, elev, fonts, glow } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { Badge, tap } from '@/components/ui';
import { useStore } from '@/store';

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['live', 'liveOutline'],
  discover: ['compass', 'compassOutline'],
  videos: ['video', 'playOutline'],
  chats: ['chat', 'chatsOutline'],
  me: ['person', 'personOutline'],
};

type BarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
};

/**
 * Üzən tab paneli: ağ kapsul + yumşaq kölgə, ortada qaldırılmış "Tanışlıq" düyməsi (təsadüfi video zəng).
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
  const routes = state.routes;
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: night ? colors.night : colors.bg }]} pointerEvents="box-none">
      <View style={[styles.bar, night ? { backgroundColor: colors.night2 } : [{ backgroundColor: colors.card }, elev(3)]]}>
        {routes.slice(0, 2).map((r, i) => item(r, i))}
        <View style={styles.centerSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('live.quickVideo')}
            onPress={() => { tap(); router.push({ pathname: '/match', params: { type: 'VIDEO' } }); }}
            style={({ pressed }) => [styles.center, glow(colors.brand), night && { borderColor: colors.night }, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <Icon name="videocam" size={26} color={colors.white} />
          </Pressable>
        </View>
        {routes.slice(2).map((r, i) => item(r, i + 2))}
      </View>
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
      <Tabs.Screen name="index" options={{ title: t('tabs.live') }} />
      <Tabs.Screen name="discover" options={{ title: t('tabs.discover') }} />
      <Tabs.Screen name="videos" options={{ title: t('tabs.videos') }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats') }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingTop: 4 },
  bar: { flexDirection: 'row', height: 66, borderRadius: 33, alignItems: 'center', paddingHorizontal: 4 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 },
  label: { fontFamily: fonts.bold, fontSize: 10.5, maxWidth: 70 },
  dot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brand },
  centerSlot: { width: 70, alignItems: 'center' },
  center: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: -26, borderWidth: 5, borderColor: colors.bg },
});
