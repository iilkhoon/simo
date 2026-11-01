import { router } from 'expo-router';
import { api, ApiError } from './api';
import { errorText } from './format';
import { useStore } from '../store';
import type { Call } from './types';

export async function startCall(userId: string, type: 'VIDEO' | 'VOICE') {
  const st = useStore.getState();
  try {
    const r = await api<{ call: Call }>('/calls', { body: { calleeId: userId, type } });
    router.push({ pathname: '/call/[id]', params: { id: r.call.id } });
  } catch (e) {
    st.toast(errorText(e), 'error');
    if (e instanceof ApiError && e.code === 'INSUFFICIENT_COINS') router.push('/wallet');
  }
}
