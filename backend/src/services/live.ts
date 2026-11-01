import { prisma } from '../db.js';
import { emitToRoom } from '../realtime/hub.js';
import { dropRoom, getRoom, initRoom, viewerCount } from '../realtime/liveState.js';
import { presentUser, publicUserSelect } from '../lib/present.js';

export async function endLive(roomId: string, reason = 'HOST_ENDED') {
  const res = await prisma.liveRoom.updateMany({ where: { id: roomId, status: 'LIVE' }, data: { status: 'ENDED', endedAt: new Date() } });
  dropRoom(roomId);
  if (res.count > 0) emitToRoom(`live:${roomId}`, 'live:ended', { roomId, reason });
  return res.count > 0;
}

export async function ensureRoomState(roomId: string) {
  if (getRoom(roomId)) return getRoom(roomId)!;
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } });
  if (!room || room.status !== 'LIVE') return null;
  initRoom(room.id, room.hostId, room.type === 'VOICE');
  return getRoom(roomId)!;
}

export async function seatsPayload(roomId: string) {
  const r = getRoom(roomId);
  if (!r) return [];
  const ids = r.seats.filter((s): s is string => !!s);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { ...publicUserSelect, photos: true } });
  const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
  return r.seats.map((s, i) => ({ seat: i, user: s ? byId.get(s) ?? null : null }));
}

export async function broadcastViewers(roomId: string) {
  const n = viewerCount(roomId);
  await prisma.liveRoom.updateMany({ where: { id: roomId, status: 'LIVE' }, data: { viewerCount: n } });
  await prisma.$executeRaw`UPDATE "LiveRoom" SET "peakViewers" = GREATEST("peakViewers", ${n}) WHERE id = ${roomId}`;
  emitToRoom(`live:${roomId}`, 'live:viewers', { roomId, count: n });
}

/** Server yenidən başladıqda: yaddaşda olmayan, 2 dəqiqədən çox izləyicisiz qalan yayınları bağla */
export async function sweepStaleLives() {
  const rooms = await prisma.liveRoom.findMany({ where: { status: 'LIVE' }, select: { id: true, startedAt: true } });
  for (const r of rooms) {
    if (!getRoom(r.id) && Date.now() - r.startedAt.getTime() > 120_000) await endLive(r.id, 'STALE');
  }
}
