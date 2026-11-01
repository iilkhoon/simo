import agora from 'agora-token';
import { config } from '../config.js';

const { RtcTokenBuilder, RtcRole } = agora;

/** Agora RTC tokeni. Agora uid = istifadəçinin rəqəmsal shortId-si */
export function rtcToken(channel: string, uid: number, publisher: boolean, ttlSec = 3600) {
  if (!config.agora.appId) {
    return { appId: '', token: null as string | null, channel, uid };
  }
  if (!config.agora.appCertificate) {
    return { appId: config.agora.appId, token: null as string | null, channel, uid };
  }
  const token = RtcTokenBuilder.buildTokenWithUid(
    config.agora.appId,
    config.agora.appCertificate,
    channel,
    uid,
    publisher ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
    ttlSec,
    ttlSec,
  );
  return { appId: config.agora.appId, token, channel, uid };
}
