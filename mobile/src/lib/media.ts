import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api, upload } from './api';

export async function pickImage(opts: { camera?: boolean; front?: boolean } = {}): Promise<string | null> {
  const perm = opts.camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = opts.camera
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [3, 4], cameraType: opts.front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [3, 4] });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const r = await upload(a.uri, a.mimeType ?? 'image/jpeg');
  return r.url;
}

export async function pickVideo(onProgress?: (p: number) => void): Promise<{ url: string; localUri: string } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: 120, quality: 1 });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  const r = await upload(a.uri, a.mimeType ?? 'video/mp4', onProgress);
  return { url: r.url, localUri: a.uri };
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
