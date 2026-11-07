import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../config';
import { tokens } from './api';

let socket: Socket | null = null;
const watchers = new Set<(s: Socket | null) => void>();

export function connectSocket(): Socket {
  if (socket?.connected) return socket;
  socket?.disconnect();
  socket = io(API_URL, {
    transports: ['websocket'],
    auth: (cb) => cb({ token: tokens.access }),
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });
  watchers.forEach((w) => w(socket));
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  watchers.forEach((w) => w(null));
}

/**
 * Cari socket (yarananda/dəyişəndə yenidən render olunur).
 * Ekran socket-dən ƏVVƏL açıla bilər (soyuq başlanğıc, CallKit-dən cavab, push linki):
 * uşaq ekranın effektləri kök layout-un effektindən əvvəl işləyir, ona görə `getSocket()` o an null olur.
 * Bu hook ilə dinləyicilər socket yarananda qoşulur.
 */
export function useSocket(): Socket | null {
  const [s, setS] = useState<Socket | null>(socket);
  useEffect(() => {
    watchers.add(setS);
    setS(socket);
    return () => { watchers.delete(setS); };
  }, []);
  return s;
}
