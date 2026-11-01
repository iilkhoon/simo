import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl ?? 'http://localhost:4000';
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? extra.webUrl ?? 'https://simo.az';
/** Android build kanalı: "google" (Play Store) və ya "huawei" (AppGallery — HMS, Google Play Billing yoxdur) */
export const STORE: 'apple' | 'google' | 'huawei' =
  Platform.OS === 'ios' ? 'apple' : process.env.EXPO_PUBLIC_STORE === 'huawei' ? 'huawei' : 'google';
