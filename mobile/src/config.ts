import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

/**
 * İnkişaf rejimində (Expo Go / dev build) backend Metro-nun işlədiyi kompüterdədir:
 * hostUri "192.168.1.5:8081" → "http://192.168.1.5:4000". Beləliklə telefonda IP yazmağa ehtiyac yoxdur.
 */
function devApiUrl(): string | undefined {
  if (!__DEV__ || Platform.OS === 'web') return undefined;
  const host = (Constants.expoConfig?.hostUri ?? '').split(':')[0];
  if (!host || host.endsWith('.exp.direct')) return undefined; // tunel rejimində IP bilinmir
  return `http://${host}:4000`;
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? devApiUrl() ?? extra.apiUrl ?? 'http://localhost:4000';
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? extra.webUrl ?? 'https://simo.az';
/** Android build kanalı: "google" (Play Store) və ya "huawei" (AppGallery — HMS, Google Play Billing yoxdur) */
export const STORE: 'apple' | 'google' | 'huawei' =
  Platform.OS === 'ios' ? 'apple' : process.env.EXPO_PUBLIC_STORE === 'huawei' ? 'huawei' : 'google';
