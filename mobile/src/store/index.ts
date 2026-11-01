import { create } from 'zustand';
import { api, tokens } from '../lib/api';
import type { Call, Gift, Me, PublicUser } from '../lib/types';

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

interface IncomingCall {
  call: Call;
  caller: PublicUser;
}

interface State {
  ready: boolean;
  authed: boolean;
  me: Me | null;
  gifts: Gift[];
  unreadChats: number;
  unreadNotifications: number;
  incomingCall: IncomingCall | null;
  toasts: Toast[];
  setReady: (v: boolean) => void;
  setAuthed: (v: boolean) => void;
  setMe: (me: Me | null) => void;
  patchMe: (p: Partial<Me>) => void;
  refreshMe: () => Promise<Me | null>;
  loadGifts: () => Promise<void>;
  setUnreadChats: (n: number) => void;
  setUnreadNotifications: (n: number) => void;
  setIncomingCall: (c: IncomingCall | null) => void;
  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  logout: () => Promise<void>;
}

let toastId = 0;

export const useStore = create<State>((set, get) => ({
  ready: false,
  authed: false,
  me: null,
  gifts: [],
  unreadChats: 0,
  unreadNotifications: 0,
  incomingCall: null,
  toasts: [],
  setReady: (ready) => set({ ready }),
  setAuthed: (authed) => set({ authed }),
  setMe: (me) => set({ me }),
  patchMe: (p) => set((s) => (s.me ? { me: { ...s.me, ...p } } : {})),
  refreshMe: async () => {
    try {
      const me = await api<Me>('/me');
      set({ me });
      return me;
    } catch {
      return null;
    }
  },
  loadGifts: async () => {
    if (get().gifts.length) return;
    try {
      const r = await api<{ items: Gift[] }>('/gifts', { auth: false });
      set({ gifts: r.items });
    } catch {
      /* növbəti dəfə */
    }
  },
  setUnreadChats: (unreadChats) => set({ unreadChats }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  toast: (text, kind = 'info') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
    setTimeout(() => get().dismissToast(id), 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  logout: async () => {
    const refreshToken = tokens.refresh;
    try {
      if (tokens.access) await api('/auth/logout', { body: { refreshToken } });
    } catch {
      /* ignore */
    }
    await tokens.set(null, null);
    set({ authed: false, me: null, unreadChats: 0, unreadNotifications: 0 });
  },
}));
