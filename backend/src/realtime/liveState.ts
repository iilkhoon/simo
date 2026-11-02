/** Canlı otaqların yaddaşdakı vəziyyəti (izləyicilər, səsli otaqda oturacaqlar). Çox serverli quruluşda Redis-ə köçürülür. */
export const VOICE_SEATS = 8;

export interface PkState { battleId: string; opponentRoomId: string; side: 'A' | 'B'; endsAt: number }

interface RoomState {
  hostId: string;
  viewers: Map<string, number>;
  seats: (string | null)[];
  hostLeftTimer?: NodeJS.Timeout;
  /** Video yayında qonaqlar (səsli və ya videolu), ən çox 3 */
  guests: Map<string, 'AUDIO' | 'VIDEO'>;
  guestRequests: Set<string>;
  invites: Map<string, 'AUDIO' | 'VIDEO'>;
  pk?: PkState;
}

export const MAX_GUESTS = 3;

const rooms = new Map<string, RoomState>();

export function initRoom(roomId: string, hostId: string, voice: boolean, seatCount = VOICE_SEATS) {
  rooms.set(roomId, { hostId, viewers: new Map(), seats: voice ? Array(seatCount).fill(null) : [], guests: new Map(), guestRequests: new Set(), invites: new Map() });
}

export function liveRoomIds(): { roomId: string; hostId: string }[] {
  return [...rooms.entries()].map(([roomId, r]) => ({ roomId, hostId: r.hostId }));
}

export function getRoom(roomId: string) {
  return rooms.get(roomId);
}

export function dropRoom(roomId: string) {
  const r = rooms.get(roomId);
  if (r?.hostLeftTimer) clearTimeout(r.hostLeftTimer);
  rooms.delete(roomId);
}

export function addViewer(roomId: string, userId: string): boolean {
  const r = rooms.get(roomId);
  if (!r) return false;
  const n = (r.viewers.get(userId) ?? 0) + 1;
  r.viewers.set(userId, n);
  return n === 1;
}

export function removeViewer(roomId: string, userId: string): boolean {
  const r = rooms.get(roomId);
  if (!r) return false;
  const n = (r.viewers.get(userId) ?? 1) - 1;
  if (n <= 0) {
    r.viewers.delete(userId);
    const idx = r.seats.indexOf(userId);
    if (idx >= 0) r.seats[idx] = null;
    r.guests.delete(userId);
    r.guestRequests.delete(userId);
    return true;
  }
  r.viewers.set(userId, n);
  return false;
}

export function viewerCount(roomId: string): number {
  const r = rooms.get(roomId);
  if (!r) return 0;
  let n = r.viewers.size;
  if (r.viewers.has(r.hostId)) n -= 1;
  return Math.max(0, n);
}

export function takeSeat(roomId: string, userId: string, seat: number): boolean {
  const r = rooms.get(roomId);
  if (!r || seat < 0 || seat >= r.seats.length) return false;
  if (r.seats[seat] && r.seats[seat] !== userId) return false;
  const prev = r.seats.indexOf(userId);
  if (prev >= 0) r.seats[prev] = null;
  r.seats[seat] = userId;
  return true;
}

export function leaveSeat(roomId: string, userId: string) {
  const r = rooms.get(roomId);
  if (!r) return;
  const idx = r.seats.indexOf(userId);
  if (idx >= 0) r.seats[idx] = null;
}

export function roomsOf(userId: string): string[] {
  return [...rooms.entries()].filter(([, r]) => r.viewers.has(userId)).map(([id]) => id);
}
