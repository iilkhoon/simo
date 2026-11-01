import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, gradients } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { UnreadDot } from '@/components/ui';
import { useStore } from '@/store';

function TabIcon({ name, focused, badge }: { name: IconName; focused: boolean; badge?: number }) {
  if (focused) {
    return (
      <View>
        <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 42, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={name} size={20} color="#fff" />
        </LinearGradient>
        <UnreadDot n={badge ?? 0} />
      </View>
    );
  }
  return (
    <View>
      <Icon name={name} size={22} color={colors.textDim} />
      <UnreadDot n={badge ?? 0} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const unread = useStore((s) => s.unreadChats);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: 'rgba(18,7,31,0.98)',
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 86 : 66,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.discover'), tabBarIcon: ({ focused }) => <TabIcon name="compass" focused={focused} /> }} />
      <Tabs.Screen name="live" options={{ title: t('tabs.live'), tabBarIcon: ({ focused }) => <TabIcon name="live" focused={focused} /> }} />
      <Tabs.Screen name="videos" options={{ title: t('tabs.videos'), tabBarIcon: ({ focused }) => <TabIcon name="video" focused={focused} /> }} />
      <Tabs.Screen name="chats" options={{ title: t('tabs.chats'), tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} badge={unread} /> }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me'), tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} /> }} />
    </Tabs>
  );
}
