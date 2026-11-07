import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api, upload } from './api';

export async function pickImage(opts: { camera?: boolean; front?: boolean } = {}): Promise<string | null> {
  return (await pickImageFull(opts))?.url ?? null;
}

/** Şəkil seçir və yükləyir; `kyc: true` — şəxsi fayl (önizləmə üçün localUri istifadə edin, url açıq deyil) */
export async function pickImageFull(opts: { camera?: boolean; front?: boolean; kyc?: boolean } = {}): Promise<{ url: string; localUri: string } | null> {
  const perm = opts.camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = opts.camera
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [3, 4], cameraType: opts.front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [3, 4] });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const r = await upload(a.uri, a.mimeType ?? 'image/jpeg', undefined, opts.kyc ? 'kyc' : 'media');
  return { url: r.url, localUri: a.uri };
}

/** Maksimum video uzunluğu (saniyə) — server də yoxlayır */
export const MAX_VIDEO_SEC = 90;

export async function pickVideo(onProgress?: (p: number) => void): Promise<{ url: string; localUri: string; durationSec: number } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: MAX_VIDEO_SEC, allowsEditing: true, quality: 1 });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const durationSec = Math.round((a.duration ?? 0) / 1000);
  if (durationSec > MAX_VIDEO_SEC) throw new Error('VIDEO_TOO_LONG');
  const r = await upload(a.uri, a.mimeType ?? 'video/mp4', onProgress);
  return { url: r.url, localUri: a.uri, durationSec };
}

/** Story üçün foto və ya video (kəsmədən) */
export async function pickStoryMedia(): Promise<{ url: string; localUri: string; type: 'PHOTO' | 'VIDEO' } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], videoMaxDuration: 30, quality: 0.85 });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const isVideo = a.type === 'video';
  const r = await upload(a.uri, a.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg'));
  return { url: r.url, localUri: a.uri, type: isVideo ? 'VIDEO' : 'PHOTO' };
}

/** Yerləşməni serverə göndərir (yaxınlıqdakılar və məsafə üçün). Dəqiq koordinat başqalarına göstərilmir. */
export async function syncLocation(ask = true): Promise<boolean> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && ask) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return false;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    let city: string | undefined;
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      city = geo[0]?.city ?? geo[0]?.region ?? undefined;
    } catch {
      /* ignore */
    }
    await api('/me/location', { method: 'PUT', body: { lat: pos.coords.latitude, lng: pos.coords.longitude, city: city?.slice(0, 40) } });
    return true;
  } catch {
    return false;
  }
}
