/** Veb önizləmə üçün stub — zənglər yalnız iOS/Android native build-də işləyir */
import type { ComponentType } from 'react';
import type { RtcCreds } from './types';

export const rtcAvailable = () => false;
export const RtcSurfaceView = null as ComponentType<{ style?: unknown; canvas: { uid: number }; zOrderMediaOverlay?: boolean }> | null;
export async function requestAvPermissions(_video: boolean) {
  return true;
}
export function subscribe(_l: unknown) {
  return () => {};
}
export async function join(_creds: RtcCreds, _opts: { video: boolean; publish: boolean }) {
  throw new Error('RTC_UNAVAILABLE');
}
export function setPublishing(_creds: RtcCreds, _publish: boolean, _video = false) {}
export function leave(_channel?: string) {}
export const controls = {
  mute: (_m: boolean) => {},
  camera: (_on: boolean) => {},
  flip: () => {},
  speaker: (_on: boolean) => {},
  beauty: (_on: boolean) => {},
};
