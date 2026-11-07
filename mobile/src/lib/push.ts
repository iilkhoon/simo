import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from './api';
import { listenPushTaps } from './pushRoutes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Expo Push tokeni alır (iOS APNs / Android FCM). Huawei cihazlarında Google xidmətləri olmadan push işləmir. */
export async function registerPush() {
  try {
    if (!Device.isDevice) return;
    // Bildirişə toxunanda uyğun ekran (host profili, kampaniya, söhbət...)
    listenPushTaps(Notifications);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Simo',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF4D8D',
      });
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await api('/me/push-token', { method: 'PUT', body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } });
  } catch {
    /* push məcburi deyil */
  }
}
