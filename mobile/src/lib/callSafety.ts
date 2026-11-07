/**
 * Zəng / video yayın təhlükəsizliyi (native):
 *  - hər 10–20 saniyədən bir (təsadüfi) ÖZ kameranın kadrı Agora takeSnapshot ilə götürülür və /safety/frames-ə göndərilir;
 *  - şikayətdə qarşı tərəfin videosunun kadrı sübut kimi əlavə olunur;
 *  - serverdən "safety:blur" gəldikdə qarşı tərəfin videosu qəbul edilmir (muteRemoteVideoStream) və ekran örtülür;
 *  - "safety:warning" gəldikdə öz videon müvəqqəti göndərilmir (muteLocalVideoStream).
 * Yeni native modul yoxdur: react-native-agora (artıq var) + expo-file-system-in keş qovluğu (expo ilə gəlir).
 */
import { useEffect, useRef } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { create } from 'zustand';
import i18n from '../i18n';
import { API_URL, WEB_URL } from '../config';
import { ApiError, api, tokens } from './api';
import { engine, snapshotSupported, takeSnapshot } from './callSafetyNative';

export { takeSnapshot };

export type SafetyContext = 'CALL' | 'LIVE';
export type ConsentKind = 'VIDEO_MONITORING' | 'HOST_AGREEMENT' | 'AGENCY_AGREEMENT';

export interface SafetyStatus {
  videoNoticeAccepted: boolean;
  hostAgreementAccepted: boolean;
  agencyAgreementAccepted: boolean;
  versions: Record<ConsentKind, string>;
  strikes: number;
  strikesToSuspend: number;
  suspendedUntil: string | null;
  monitoring: { enabled: boolean; provider: string; minSec: number; maxSec: number };
}

export interface BlurState { contextType: SafetyContext; contextId: string; offenderId: string; until: number; ended: boolean }
export interface WarnState { contextType: SafetyContext; contextId: string; count: number; endAfter: number; until: number }

export const useSafety = create<{ status: SafetyStatus | null; blur: BlurState | null; warning: WarnState | null }>(() => ({ status: null, blur: null, warning: null }));

/** Hüquqi sənədlərin ünvanları (veb sayt) */
export const LEGAL_URLS = {
  terms: `${WEB_URL}/terms.html`,
  privacy: `${WEB_URL}/privacy.html`,
  guidelines: `${WEB_URL}/community-guidelines.html`,
  host: `${WEB_URL}/host-agreement.html`,
  agency: `${WEB_URL}/agency-agreement.html`,
};

let loading: Promise<SafetyStatus | null> | null = null;

export async function loadSafetyStatus(force = false): Promise<SafetyStatus | null> {
  const cur = useSafety.getState().status;
  if (cur && !force) return cur;
  loading ??= api<SafetyStatus>('/safety/me')
    .then((s) => {
      useSafety.setState({ status: s });
      return s;
    })
    .catch(() => null)
    .finally(() => {
      loading = null;
    });
  return loading;
}

export async function acceptConsent(kind: ConsentKind): Promise<boolean> {
  const s = await loadSafetyStatus();
  if (!s) return false;
  try {
    const next = await api<SafetyStatus>('/safety/consent', { body: { kind, version: s.versions[kind] } });
    useSafety.setState({ status: next });
    return true;
  } catch {
    return false;
  }
}

/**
 * Host / agentlik müqaviləsi: qəbul edilməyibsə dialoq göstərir. true — qəbul edilib (və ya indi qəbul etdi).
 * İstifadə: if (!(await ensureAgreement('HOST'))) return;
 */
export async function ensureAgreement(kind: 'HOST' | 'AGENCY'): Promise<boolean> {
  const s = await loadSafetyStatus(true);
  if (!s) return false;
  if (kind === 'HOST' ? s.hostAgreementAccepted : s.agencyAgreementAccepted) return true;
  const consent: ConsentKind = kind === 'HOST' ? 'HOST_AGREEMENT' : 'AGENCY_AGREEMENT';
  const url = kind === 'HOST' ? LEGAL_URLS.host : LEGAL_URLS.agency;
  const t = i18n.t.bind(i18n);
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(`${t(`safety.agreementTitle${kind}`)}\n\n${t(`safety.agreementBody${kind}`)}\n\n${url}`);
    return ok ? acceptConsent(consent) : false;
  }
  return new Promise((resolve) => {
    Alert.alert(t(`safety.agreementTitle${kind}`), t(`safety.agreementBody${kind}`), [
      { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: t('safety.agreementRead'), onPress: () => { void Linking.openURL(url); resolve(false); } },
      { text: t('safety.agreementAccept'), onPress: () => void acceptConsent(consent).then(resolve) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** Xəta kodu müqavilə tələb edirsə — dialoqu göstərir (true: qəbul etdi, əməliyyatı təkrarla) */
export async function handleAgreementError(e: unknown): Promise<boolean> {
  const code = e instanceof ApiError ? e.code : '';
  if (code === 'HOST_AGREEMENT_REQUIRED') return ensureAgreement('HOST');
  if (code === 'AGENCY_AGREEMENT_REQUIRED') return ensureAgreement('AGENCY');
  return false;
}

function postImage<T>(path: string, fileUri: string | null, query: Record<string, string>): Promise<T> {
  const qs = Object.entries(query).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${path}?${qs}`);
    if (tokens.access) xhr.setRequestHeader('Authorization', `Bearer ${tokens.access}`);
    xhr.timeout = 15000;
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
        else reject(new ApiError(data.error ?? 'SERVER_ERROR', xhr.status, data));
      } catch {
        reject(new ApiError('SERVER_ERROR', xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError('NETWORK', 0));
    xhr.ontimeout = () => reject(new ApiError('NETWORK', 0));
    const form = new FormData();
    if (fileUri) form.append('file', { uri: fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`, name: 'frame.jpg', type: 'image/jpeg' } as unknown as Blob);
    xhr.send(form);
  });
}

export interface FrameResult { verdict: string; action: 'NONE' | 'QUEUED' | 'WARNED' | 'ENDED' }

/** Zəng daxilində şikayət: qarşı tərəfin kadrı (alınarsa) ilə */
export async function reportInCall(p: { contextType: SafetyContext; contextId: string; targetUserId: string; reason: string; remoteUid: number | null }) {
  const shot = p.remoteUid != null ? await takeSnapshot(p.remoteUid, 'remote') : null;
  const q = { contextType: p.contextType, contextId: p.contextId, targetUserId: p.targetUserId, reason: p.reason };
  if (shot) return postImage<{ reportId: string }>('/safety/reports', shot, q);
  return api<{ reportId: string }>('/safety/reports', { body: q });
}

/** Qarşı tərəfin videosunu müvəqqəti qəbul etmə (bulanıqlaşma zamanı) */
export function hideRemote(uid: number | null, hide: boolean) {
  if (uid == null) return;
  try { engine()?.muteRemoteVideoStream(uid, hide); } catch { /* ignore */ }
}

/** Öz videonu müvəqqəti göndərmə (xəbərdarlıq zamanı) */
export function pauseLocalVideo(pause: boolean) {
  try { engine()?.muteLocalVideoStream(pause); } catch { /* ignore */ }
}

/**
 * Kadr moderasiyası: `active` olduqca (görüntülü zəng qoşulub, kamera açıqdır) təsadüfi intervalla öz kadrını göndərir.
 */
export function useFrameModeration(contextType: SafetyContext, contextId: string | null | undefined, active: boolean) {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (!active || !contextId || !snapshotSupported()) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const loop = async () => {
      const s = useSafety.getState().status ?? (await loadSafetyStatus());
      if (!alive.current) return;
      if (s && !s.monitoring.enabled) return;
      const min = s?.monitoring.minSec ?? 10;
      const max = Math.max(min, s?.monitoring.maxSec ?? 20);
      timer = setTimeout(async () => {
        if (!alive.current) return;
        try {
          const shot = await takeSnapshot(0, 'local');
          if (shot && alive.current) await postImage<FrameResult>('/safety/frames', shot, { contextType, contextId });
        } catch {
          /* şəbəkə xətası — növbəti dövrdə yenidən */
        }
        if (alive.current) void loop();
      }, (min + Math.random() * (max - min)) * 1000);
    };
    // İlk kadr qoşulmadan bir neçə saniyə sonra (təsadüfi), sonra dövrlə
    void loop();
    return () => {
      alive.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [contextType, contextId, active]);
}
