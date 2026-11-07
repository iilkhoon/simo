/**
 * Agora kadr köməkçiləri (native). Veb üçün callSafetyNative.web.ts — boş stub.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';
import type * as AgoraTypes from 'react-native-agora';

type Agora = typeof AgoraTypes;
let agora: Agora | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  agora = require('react-native-agora') as Agora;
} catch {
  agora = null;
}

export const snapshotSupported = () => !!agora;

function cacheDir(): string | null {
  const fsm = requireOptionalNativeModule<{ cacheDirectory?: string }>('FileSystem');
  const dir = fsm?.cacheDirectory;
  if (!dir) return null;
  return decodeURI(dir.replace(/^file:\/\//, '')).replace(/\/$/, '');
}

export function engine(): AgoraTypes.IRtcEngine | null {
  try {
    return agora ? agora.createAgoraRtcEngine() : null;
  } catch {
    return null;
  }
}

/**
 * Kadr götürür. uid=0 — öz kameram, əks halda qarşı tərəfin RTC uid-i (qısa ID).
 * Eyni fayl adı hər dəfə üzərinə yazılır — telefonda kadr yığılmır.
 */
export function takeSnapshot(uid: number, name: 'local' | 'remote'): Promise<string | null> {
  const e = engine();
  const dir = cacheDir();
  if (!e || !dir) return Promise.resolve(null);
  const filePath = `${dir}/simo_safety_${name}.jpg`;
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { e.removeListener('onSnapshotTaken', onTaken); } catch { /* ignore */ }
      resolve(v);
    };
    const onTaken = (_c: unknown, _uid: number, path: string, _w: number, _h: number, errCode: number) => {
      if (path === filePath) finish(errCode === 0 ? path : null);
    };
    const timer = setTimeout(() => finish(null), 4000);
    try {
      e.addListener('onSnapshotTaken', onTaken);
      if (e.takeSnapshot(uid, filePath) < 0) finish(null);
    } catch {
      finish(null);
    }
  });
}

