import { router } from 'expo-router';
import { create } from 'zustand';
import { api, ApiError } from './api';
import { errorText } from './format';
import { useStore } from '../store';
import type { Call, PublicUser } from './types';

export type CallType = 'VIDEO' | 'VOICE';

/** GET /calls/quote/:userId — zəngdən əvvəl təsdiq ekranı üçün */
export interface CallQuote {
  type: CallType;
  price: number | null;
  basePrice: number | null;
  coins: number | null;
  minutes: number | null;
  enough: boolean;
  available: boolean;
  reason: string | null;
  peer: PublicUser | null;
}

/** Zəngdən əvvəl təsdiq vərəqəsinin vəziyyəti (CallConfirm komponenti oxuyur) */
export const useCallConfirm = create<{
  quote: CallQuote | null;
  userId: string | null;
  open: (userId: string, q: CallQuote) => void;
  close: () => void;
}>((set) => ({
  quote: null,
  userId: null,
  open: (userId, quote) => set({ userId, quote }),
  close: () => set({ userId: null, quote: null }),
}));

export const fetchQuote = (userId: string, type: CallType) => api<CallQuote>(`/calls/quote/${userId}?type=${type}`);

let placing = false;

/** Zəngi faktiki başladır (POST /calls) və zəng ekranını açır */
export async function placeCall(userId: string, type: CallType): Promise<boolean> {
  if (placing) return false; // ikiqat toxunuş iki zəng yaratmasın
  placing = true;
  const st = useStore.getState();
  try {
    const r = await api<{ call: Call }>('/calls', { body: { calleeId: userId, type } });
    router.push({ pathname: '/call/[id]', params: { id: r.call.id } });
    return true;
  } catch (e) {
    st.toast(errorText(e), 'error');
    if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') router.push('/wallet');
    return false;
  } finally {
    placing = false;
  }
}

/**
 * Zəng düyməsi: ödənişli zənglərdə əvvəlcə qiymət təsdiqi göstərilir (Chamet/LivU üslubu:
 * "80 Nar/dəq · balansın ≈ 12 dəqiqəyə çatır"). Pulsuz (uyğunluq) zəngləri dərhal başlayır.
 * `confirm: false` — təsdiqsiz (məs. "yenidən zəng et" — istifadəçi qiyməti artıq görüb).
 */
export async function startCall(userId: string, type: CallType, opts: { confirm?: boolean } = {}) {
  const st = useStore.getState();
  let q: CallQuote;
  try {
    q = await fetchQuote(userId, type);
  } catch {
    // Köhnə server və ya şəbəkə xətası — birbaşa cəhd et, server özü yoxlayır
    await placeCall(userId, type);
    return;
  }
  if (!q.available) {
    st.toast(errorText(new ApiError(q.reason ?? 'FORBIDDEN', 400)), 'error');
    return;
  }
  if (!q.price || opts.confirm === false) {
    if (q.price && !q.enough) {
      useCallConfirm.getState().open(userId, q);
      return;
    }
    await placeCall(userId, type);
    return;
  }
  useCallConfirm.getState().open(userId, q);
}
