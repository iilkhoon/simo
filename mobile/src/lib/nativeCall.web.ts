/** Webdə sistem zəng ekranı yoxdur — tətbiqdaxili IncomingCall işləyir */
import type { Call, PublicUser } from './types';
export async function setupNativeCalls(_l: { title: string; desc: string; cancel: string; ok: string; channel: string }) {}
export function displayIncoming(_c: Call, _u: Pick<PublicUser, 'name'>): boolean { return false; }
export function endNative(_id: string) {}
export function startNativeOutgoing(_id: string, _n: string, _v: boolean) {}
export function markConnected(_id: string) {}
export const CALL_PUSH_TASK = 'simo-incoming-call';
export async function registerCallPushTask() {}
export function answeredInApp(_id: string) {}
export function declinedInApp(_id: string) {}
export function onNativeMute(_cb: (callId: string, muted: boolean) => void) { return () => {}; }
