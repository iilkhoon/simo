/**
 * Agora RTC sarğısı — 1-ə-1 zənglər, video yayınlar və səsli otaqlar üçün vahid mühərrik.
 * Modul "lazy" yüklənir ki, Expo Go-da (native modul olmadan) tətbiqin qalan hissəsi işləsin.
 */
import { PermissionsAndroid, Platform } from 'react-native';
import type * as AgoraTypes from 'react-native-agora';
import type { RtcCreds } from './types';

type Agora = typeof AgoraTypes;
let agora: Agora | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  agora = require('react-native-agora') as Agora;
} catch {
  agora = null;
}

type Listener = {
  onJoined?: () => void;
  onRemoteJoined?: (uid: number) => void;
  onRemoteLeft?: (uid: number) => void;
  onVolume?: (speakers: { uid: number; volume: number }[]) => void;
  onError?: (code: number) => void;
};

let engine: AgoraTypes.IRtcEngine | null = null;
let currentAppId = '';
let currentChannel: string | null = null;
const listeners = new Set<Listener>();

export const rtcAvailable = () => !!agora;
export const RtcSurfaceView = agora?.RtcSurfaceView ?? null;

export async function requestAvPermissions(video: boolean): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const perms = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, ...(video ? [PermissionsAndroid.PERMISSIONS.CAMERA] : [])];
  const res = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((p) => res[p] === PermissionsAndroid.RESULTS.GRANTED);
}

function ensureEngine(appId: string) {
  if (!agora) throw new Error('RTC_UNAVAILABLE');
  if (engine && currentAppId === appId) return engine;
  engine?.release();
  engine = agora.createAgoraRtcEngine();
  engine.initialize({ appId, channelProfile: agora.ChannelProfileType.ChannelProfileLiveBroadcasting });
  engine.registerEventHandler({
    onJoinChannelSuccess: () => listeners.forEach((l) => l.onJoined?.()),
    onUserJoined: (_c, uid) => listeners.forEach((l) => l.onRemoteJoined?.(uid)),
    onUserOffline: (_c, uid) => listeners.forEach((l) => l.onRemoteLeft?.(uid)),
    onAudioVolumeIndication: (_c, speakers) =>
      listeners.forEach((l) => l.onVolume?.(speakers.map((s) => ({ uid: s.uid ?? 0, volume: s.volume ?? 0 })))),
    onError: (code) => listeners.forEach((l) => l.onError?.(code)),
  });
  engine.enableAudioVolumeIndication(400, 3, true);
  currentAppId = appId;
  return engine;
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export interface JoinOpts {
  video: boolean;
  publish: boolean;
}

export async function join(creds: RtcCreds, opts: JoinOpts) {
  if (!agora || !creds.appId) throw new Error('RTC_UNAVAILABLE');
  const ok = await requestAvPermissions(opts.video && opts.publish);
  if (!ok) throw new Error('PERMISSION');
  const e = ensureEngine(creds.appId);
  if (opts.video) {
    e.enableVideo();
    if (opts.publish) e.startPreview();
  } else {
    e.disableVideo();
  }
  e.enableAudio();
  currentChannel = creds.channel;
  e.joinChannel(creds.token ?? '', creds.channel, creds.uid, {
    clientRoleType: opts.publish ? agora.ClientRoleType.ClientRoleBroadcaster : agora.ClientRoleType.ClientRoleAudience,
    publishMicrophoneTrack: opts.publish,
    publishCameraTrack: opts.publish && opts.video,
    autoSubscribeAudio: true,
    autoSubscribeVideo: opts.video,
  });
  e.setDefaultAudioRouteToSpeakerphone(true);
}

/** Səsli otaqda oturacaq tutanda/qalxanda rolu dəyiş */
export function setPublishing(creds: RtcCreds, publish: boolean, video = false) {
  if (!agora || !engine) return;
  engine.renewToken(creds.token ?? '');
  engine.updateChannelMediaOptions({
    clientRoleType: publish ? agora.ClientRoleType.ClientRoleBroadcaster : agora.ClientRoleType.ClientRoleAudience,
    publishMicrophoneTrack: publish,
    publishCameraTrack: publish && video,
  });
}

/** Kanaldan çıxır. `channel` verilsə — yalnız hazırda həmin kanaldadırsa (köhnə ekran yenisinin zəngini kəsməsin) */
export function leave(channel?: string) {
  if (channel && currentChannel && channel !== currentChannel) return;
  currentChannel = null;
  try {
    engine?.stopPreview();
    engine?.leaveChannel();
  } catch {
    /* ignore */
  }
}

export const controls = {
  mute: (m: boolean) => engine?.muteLocalAudioStream(m),
  camera: (on: boolean) => engine?.enableLocalVideo(on),
  flip: () => engine?.switchCamera(),
  speaker: (on: boolean) => engine?.setEnableSpeakerphone(on),
  beauty: (on: boolean) => {
    if (!agora || !engine) return;
    engine.setBeautyEffectOptions(on, {
      lighteningContrastLevel: agora.LighteningContrastLevel.LighteningContrastNormal,
      lighteningLevel: 0.6,
      smoothnessLevel: 0.65,
      rednessLevel: 0.15,
      sharpnessLevel: 0.2,
    });
  },
};
