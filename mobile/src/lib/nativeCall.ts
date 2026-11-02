/**
 * Sistem zəng ekranı: iOS — CallKit, Android — ConnectionService (react-native-callkeep).
 * Gələn Simo zəngi telefonun öz zəng tətbiqi kimi görünür (kilid ekranında, "Son zənglər"də),
 * qəbul/rədd sistem düymələri ilə olur və zəng ekranımıza keçir.
 *
 * Çatdırılma:
 *  - tətbiq açıq/arxa fonda: socket "call:incoming" → displayIncoming()
 *  - Android, tətbiq bağlı: yüksək prioritetli data-push → fon tapşırığı (registerCallPushTask) → displayIncoming()
 *  - iOS, tətbiq bağlı: PushKit VoIP push → AppDelegate (plugins/withVoipPush.js) CallKit-ə bildirir;
 *    bu modul "answerCall"/"endCall" hadisələrini emal edir. VoIP tokeni /me/voip-token ilə serverə gedir.
 * Expo Go-da və webdə native modul yoxdur — hər şey səssizcə söndürülür (tətbiqdaxili IncomingCall işləyir).
 */
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { api } from './api';
import { useStore } from '../store';
import type { Call, PublicUser } from './types';

type CallKeep = typeof import('react-native-callkeep').default;
let RNCallKeep: CallKeep | null = null;
try { RNCallKeep = require('react-native-callkeep').default as CallKeep; } catch { RNCallKeep = null; }

const byUuid = new Map<string, { callId: string; video: boolean }>();
const byCall = new Map<string, string>();
const answered = new Set<string>();
let ready = false;

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function setupNativeCalls(labels: { title: string; desc: string; cancel: string; ok: string; channel: string }) {
  if (!RNCallKeep || ready) return;
  try {
    await RNCallKeep.setup({
      ios: { appName: 'Simo', supportsVideo: true, maximumCallGroups: '1', maximumCallsPerCallGroup: '1', includesCallsInRecents: true },
      android: {
        alertTitle: labels.title, alertDescription: labels.desc, cancelButton: labels.cancel, okButton: labels.ok,
        additionalPermissions: [], selfManaged: true,
        foregroundService: { channelId: 'az.simo.calls', channelName: labels.channel, notificationTitle: 'Simo' },
      },
    });
    RNCallKeep.setAvailable(true);
    ready = true;
  } catch {
    return;
  }
  RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
    const c = byUuid.get(callUUID);
    if (!c) return;
    answered.add(c.callId);
    RNCallKeep?.backToForeground();
    useStore.getState().setIncomingCall(null);
    router.push({ pathname: '/call/[id]', params: { id: c.callId, accept: '1' } });
  });
  RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
    const c = byUuid.get(callUUID);
    if (!c) return;
    byUuid.delete(callUUID); byCall.delete(c.callId);
    useStore.getState().setIncomingCall(null);
    // Qəbul olunmamış zəngi sistem düyməsi ilə rədd etmək = serverdə rədd
    if (!answered.has(c.callId)) void api(`/calls/${c.callId}/reject`, { method: 'POST', body: {} }).catch(() => {});
    else void api(`/calls/${c.callId}/end`, { method: 'POST', body: {} }).catch(() => {});
  });
  // iOS: PushKit VoIP tokeni (yalnız native build-də)
  if (Platform.OS === 'ios') {
    try {
      const Voip = require('react-native-voip-push-notification').default;
      Voip.addEventListener('register', (token: string) => void api('/me/voip-token', { method: 'PUT', body: { token } }).catch(() => {}));
      Voip.addEventListener('notification', (n: { callId?: string; uuid?: string; hasVideo?: boolean }) => {
        if (n.callId && n.uuid) { byUuid.set(n.uuid, { callId: n.callId, video: !!n.hasVideo }); byCall.set(n.callId, n.uuid); }
      });
      Voip.addEventListener('didLoadWithEvents', (events: { name: string; data: { callId?: string; uuid?: string; hasVideo?: boolean } }[]) => {
        events.forEach((e) => { if (e.name === 'RNVoipPushRemoteNotificationReceivedEvent' && e.data.callId && e.data.uuid) { byUuid.set(e.data.uuid, { callId: e.data.callId, video: !!e.data.hasVideo }); byCall.set(e.data.callId, e.data.uuid); } });
      });
      Voip.registerVoipToken();
    } catch { /* VoIP modulu yoxdur */ }
  }
}

/** Gələn zəngi sistem zəng ekranında göstərir. true — göstərildi (tətbiqdaxili ekrana ehtiyac yoxdur) */
export function displayIncoming(call: Call, caller: Pick<PublicUser, 'name'>): boolean {
  if (!RNCallKeep || !ready) return false;
  if (byCall.has(call.id)) return true;
  const uuid = uuidv4();
  byUuid.set(uuid, { callId: call.id, video: call.type === 'VIDEO' });
  byCall.set(call.id, uuid);
  try {
    RNCallKeep.displayIncomingCall(uuid, caller.name, caller.name, 'generic', call.type === 'VIDEO');
    return true;
  } catch {
    return false;
  }
}

/** Zəng bitəndə / başqa cihazda cavablananda sistem ekranını bağlayır */
export function endNative(callId: string) {
  const uuid = byCall.get(callId);
  if (!uuid || !RNCallKeep) return;
  byCall.delete(callId); byUuid.delete(uuid);
  try { RNCallKeep.reportEndCallWithUUID(uuid, 2); } catch { /* */ }
}

/** Gedən zəngi sistemə bildirir (iOS "Son zənglər", Bluetooth qulaqlıq düymələri) */
export function startNativeOutgoing(callId: string, name: string, video: boolean) {
  if (!RNCallKeep || !ready) return;
  const uuid = uuidv4();
  byUuid.set(uuid, { callId, video }); byCall.set(callId, uuid); answered.add(callId);
  try { RNCallKeep.startCall(uuid, name, name, 'generic', video); } catch { /* */ }
}

export function markConnected(callId: string) {
  const uuid = byCall.get(callId);
  if (uuid && RNCallKeep) try { RNCallKeep.setCurrentCallActive(uuid); } catch { /* */ }
}

/** Android: tətbiq bağlı olanda gələn zəng data-push-u → sistem zəng ekranı (fon tapşırığı) */
export const CALL_PUSH_TASK = 'simo-incoming-call';
TaskManager.defineTask(CALL_PUSH_TASK, async ({ data }) => {
  const payload = (data as { notification?: { data?: Record<string, unknown> }; data?: Record<string, unknown> } | undefined);
  const d = (payload?.notification?.data ?? payload?.data ?? {}) as { type?: string; callId?: string; callType?: string; callerName?: string };
  if (d.type !== 'call' || !d.callId) return;
  await setupNativeCalls({ title: 'Simo', desc: 'Simo zəngləri telefonun zəng ekranında göstərmək istəyir', cancel: 'Xeyr', ok: 'Bəli', channel: 'Simo zənglər' });
  displayIncoming({ id: d.callId, type: d.callType === 'VIDEO' ? 'VIDEO' : 'VOICE' } as Call, { name: d.callerName ?? 'Simo' });
});

export async function registerCallPushTask() {
  if (Platform.OS !== 'android' || !RNCallKeep) return;
  try { await Notifications.registerTaskAsync(CALL_PUSH_TASK); } catch { /* */ }
}
