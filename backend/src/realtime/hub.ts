import type { Server } from 'socket.io';

let io: Server | null = null;
const onlineCounts = new Map<string, number>();

export function setIo(server: Server) {
  io = server;
}
export function getIo(): Server | null {
  return io;
}
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`u:${userId}`).emit(event, payload);
}
export function emitToRoom(room: string, event: string, payload: unknown) {
  io?.to(room).emit(event, payload);
}
export function markOnline(userId: string): boolean {
  const n = (onlineCounts.get(userId) ?? 0) + 1;
  onlineCounts.set(userId, n);
  return n === 1;
}
export function markOffline(userId: string): boolean {
  const n = (onlineCounts.get(userId) ?? 1) - 1;
  if (n <= 0) {
    onlineCounts.delete(userId);
    return true;
  }
  onlineCounts.set(userId, n);
  return false;
}
export function isOnline(userId: string): boolean {
  return onlineCounts.has(userId);
}

/** İstifadəçinin bütün soket bağlantılarını kəsir (blok / hesab silinməsi) */
export function disconnectUser(userId: string) {
  io?.in(`u:${userId}`).disconnectSockets(true);
}
