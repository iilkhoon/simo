/**
 * Davranış izləmə — şəxsi alqoritm üçün (backend: POST /events).
 * Hadisələr növbəyə yığılır və 8 saniyədən bir (və ya 20 hadisə olanda) paketlə göndərilir.
 * Nə toplanır: hansı ekranlara baxılır, profilə/posta nə qədər baxılır, canlı yayınlar, axtarışlar.
 * Şəxsi yazışma mətni, yer, kontaktlar heç vaxt toplanmır.
 */
import { api, tokens } from './api';

type Ev = { kind: 'screen' | 'profile_view' | 'post_view' | 'live_watch' | 'search' | 'hashtag' | 'like_limit' | 'offer_view' | 'paywall_view'; targetId?: string | null; meta?: Record<string, string | number | boolean> };

let queue: Ev[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastScreen = '';

async function flush() {
  timer = null;
  if (!queue.length || !tokens.access) return;
  const batch = queue.splice(0, 50);
  try { await api('/events', { body: { events: batch } }); } catch { /* şəbəkə yoxdursa itirilir — kritik deyil */ }
}

export function track(e: Ev) {
  queue.push(e);
  if (queue.length >= 20) void flush();
  else if (!timer) timer = setTimeout(() => void flush(), 8000);
}

/** Ekran adı: /user/abc → user (id-lər atılır) */
export function trackScreen(pathname: string) {
  const name = pathname.split('/').filter((p) => p && !/^[a-z0-9]{20,}$/i.test(p) && !p.startsWith('[')).slice(0, 2).join('/') || 'home';
  if (name === lastScreen) return;
  lastScreen = name;
  track({ kind: 'screen', meta: { name } });
}

/** Profil/post baxış müddəti: açılanda başla, bağlananda göndər */
export function startView(kind: 'profile_view' | 'post_view' | 'live_watch', targetId: string) {
  const t0 = Date.now();
  return () => track({ kind, targetId, meta: { ms: Date.now() - t0 } });
}
