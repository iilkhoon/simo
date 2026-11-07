import { Platform } from 'react-native';
import { API_URL } from '../config';
import { storage } from './storage';

export class ApiError extends Error {
  constructor(public code: string, public status: number, public data: Record<string, unknown> = {}) {
    super(code);
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onLogout: (() => void) | null = null;
let refreshing: Promise<boolean> | null = null;
/** Tokenlər yaddaşdan oxunana qədər heç bir sorğu göndərilmir (soyuq başlanğıc / deep link yarışına qarşı) */
let markLoaded: () => void = () => {};
const loaded = new Promise<void>((r) => {
  markLoaded = r;
});

export const tokens = {
  async load() {
    try {
      accessToken = await storage.get('simo.access');
      refreshToken = await storage.get('simo.refresh');
    } finally {
      markLoaded();
    }
    return !!accessToken;
  },
  async set(a: string | null, r: string | null) {
    accessToken = a;
    refreshToken = r;
    await storage.set('simo.access', a);
    await storage.set('simo.refresh', r);
  },
  get access() {
    return accessToken;
  },
  get refresh() {
    return refreshToken;
  },
  onLogout(fn: () => void) {
    onLogout = fn;
  },
};

async function doRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  const used = refreshToken;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return refreshToken !== used; // başqa sorğu artıq yeniləyibsə, uğurlu say
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    await tokens.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; form?: FormData; auth?: boolean } = {}, retry = true): Promise<T> {
  await loaded;
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body !== undefined || opts.form ? 'POST' : 'GET'),
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError('NETWORK', 0);
  }
  if (res.status === 401 && retry && refreshToken) {
    refreshing ??= doRefresh().finally(() => {
      refreshing = null;
    });
    if (await refreshing) return api<T>(path, opts, false);
    await tokens.set(null, null);
    onLogout?.();
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiError(data.error ?? 'SERVER_ERROR', res.status, data);
  return data as T;
}

/** Fayl yükləmə (şəkil/video) — irəliləyiş göstəricisi ilə */
export async function upload(uri: string, mime: string, onProgress?: (p: number) => void): Promise<{ url: string }> {
  await loaded;
  // Vebdə FormData {uri} obyektini qəbul etmir ("[object Object]" göndərilir) — faylı Blob kimi oxuyuruq
  const webBlob = Platform.OS === 'web' ? await fetch(uri).then((r) => r.blob()).catch(() => null) : null;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/uploads`);
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new ApiError(data.error ?? 'SERVER_ERROR', xhr.status));
      } catch {
        reject(new ApiError('SERVER_ERROR', xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('NETWORK', 0));
    const form = new FormData();
    const ext = mime.split('/')[1]?.replace('quicktime', 'mov') ?? 'bin';
    if (webBlob) form.append('file', webBlob, `upload.${ext}`);
    else form.append('file', { uri, name: `upload.${ext}`, type: mime } as unknown as Blob);
    xhr.send(form);
  });
}
