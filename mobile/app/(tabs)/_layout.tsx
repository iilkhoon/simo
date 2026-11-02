import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, fonts } from '@/theme';
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
 * Üzən neobrutal tab paneli: kağız kart + mürəkkəb kontur + sərt kölgə.
 * Aktiv tab — qara "həb" içində ikon + ad. Video lentində panel tünd rejimə keçir.
 */
function TabBar({ state, descriptors, navigation }: BarProps) {
  const insets = useSafeAreaInsets();
  const unread = useStore((s) => s.unreadChats);
  const night = state.routes[state.index]?.name === 'videos';
  const bg = night ? colors.night2 : colors.card;
  const edge = night ? 'rgba(246,240,232,0.9)' : colors.ink;
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: night ? colors.night : colors.bg }]} pointerEvents="box-none">
      <View style={[styles.shadow, { backgroundColor: night ? colors.brand : colors.ink }]} />
      <View style={[styles.bar, { backgroundColor: bg, borderColor: edge }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const [on, off] = ICONS[route.name] ?? ['heart', 'heartOutline'];
          const label = descriptors[route.key]?.options.title ?? route.name;
          const badge = route.name === 'chats' ? unread : 0;
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
              <View style={[styles.pill, focused && { backgroundColor: night ? colors.bg : colors.ink, paddingHorizontal: 12 }]}>
                <Icon name={focused ? on : off} size={20} color={focused ? (night ? colors.ink : colors.bg) : night ? colors.nightMuted : colors.ink} />
                {focused ? <Text style={[styles.label, { color: night ? colors.ink : colors.bg }]} numberOfLines={1}>{label}</Text> : null}
              </View>
              {badge ? <Badge n={badge} style={{ position: 'absolute', top: 2, right: 6 }} /> : null}
            </Pressable>
          );
        })}
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
  wrap: { paddingHorizontal: 14, paddingTop: 8, backgroundColor: colors.bg },
  shadow: { position: 'absolute', left: 18, right: 14, top: 12, height: 62, borderRadius: 24 },
  bar: { flexDirection: 'row', height: 62, borderRadius: 24, borderWidth: 2, alignItems: 'center', paddingHorizontal: 6, marginRight: 4 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, borderRadius: 20, paddingHorizontal: 8 },
  label: { fontFamily: fonts.bold, fontSize: 12, maxWidth: 74 },
});
