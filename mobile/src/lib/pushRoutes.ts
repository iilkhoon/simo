/**
 * Push bildirişinə toxunanda uyğun ekrana keçid (əvvəl tətbiq sadəcə açılırdı — bildirişin mənası itirdi).
 * Server push data-sı: { type, ...data } (backend/src/services/notify.ts).
 */
import { router } from 'expo-router';

type D = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' && v ? v : null);

export function routeForPush(d: D): Parameters<typeof router.push>[0] | null {
  const type = s(d.type);
  const conv = s(d.conversationId);
  switch (type) {
    case 'message':
    case 'match':
    case 'gift':
      return conv ? { pathname: '/chat/[id]', params: { id: conv } } : '/(tabs)/chats';
    case 'host_online':
      return s(d.userId) ? { pathname: '/user/[id]', params: { id: s(d.userId)! } } : null;
    case 'campaign':
      return s(d.campaignId) ? { pathname: '/campaign/[id]', params: { id: s(d.campaignId)! } } : null;
    case 'live':
      return s(d.roomId) ? { pathname: '/live/[id]', params: { id: s(d.roomId)! } } : null;
    case 'offer':
    case 'vip':
      return '/wallet';
    case 'visit_digest':
    case 'visit':
      return '/visitors';
    case 'like_digest':
    case 'like':
      return '/likes';
    default:
      return null;
  }
}

let wired = false;
/** Bir dəfə qoşulur; soyuq başlanğıcda (tətbiq bildirişdən açıldı) son toxunuşu da emal edir */
export function listenPushTaps(N: typeof import('expo-notifications')) {
  if (wired) return;
  wired = true;
  const go = (r: { notification: { request: { content: { data?: unknown } } } } | null | undefined) => {
    const route = r ? routeForPush((r.notification.request.content.data ?? {}) as D) : null;
    if (route) setTimeout(() => { try { router.push(route); } catch { /* naviqasiya hazır deyil */ } }, 300);
  };
  try {
    N.addNotificationResponseReceivedListener(go);
    void N.getLastNotificationResponseAsync().then(go).catch(() => {});
  } catch { /* veb / emulyator */ }
}
