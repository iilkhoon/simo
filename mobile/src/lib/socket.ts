import { io, type Socket } from 'socket.io-client';
import { API_URL } from '../config';
import { tokens } from './api';

let socket: Socket | null = null;

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
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
