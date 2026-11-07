import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { prisma } from '../db.js';
import { verifyAccess } from '../lib/auth.js';
import { emitToRoom, emitToUser, markOffline, markOnline, setIo } from './hub.js';
import { addViewer, getRoom, removeViewer, viewerCount } from './liveState.js';
import { broadcastViewers, endLive, ensureRoomState, seatsPayload } from '../services/live.js';
import { sanitizeText } from '../routes/chat.js';
import { activeVip, levelFromXp } from '../economy.js';
import { OFFLINE_GRACE_MS, finishCall } from '../services/calls.js';
import { hostCameOnline } from '../services/growth.js';

interface Data {
  userId: string;
  /** Bu soketin qoşulduğu canlı otaqlar (bir istifadəçinin bir neçə cihazı ola bilər) */
  liveRooms?: Set<string>;
}

const socketRooms = (socket: Socket) => ((socket.data as Data).liveRooms ??= new Set<string>());

const commentBuckets = new Map<string, number[]>();
function allowComment(userId: string): boolean {
  const now = Date.now();
  const arr = (commentBuckets.get(userId) ?? []).filter((t) => now - t < 10_000);
  if (arr.length >= 8) return false;
  arr.push(now);
  commentBuckets.set(userId, arr);
  return true;
}

const likeBuffer = new Map<string, number>();
setInterval(async () => {
  for (const [roomId, n] of likeBuffer) {
    likeBuffer.delete(roomId);
    await prisma.liveRoom.updateMany({ where: { id: roomId }, data: { likes: { increment: n } } }).catch(() => {});
  }
}, 3000).unref();

async function leaveLive(socket: Socket, roomId: string, userId: string) {
  // Yalnız bu soket həqiqətən otaqdadırsa — təkrar "leave" izləyici sayını iki dəfə azaltmasın
  if (!socketRooms(socket).delete(roomId)) return;
  await socket.leave(`live:${roomId}`);
  const last = removeViewer(roomId, userId);
  if (!last) return;
  const state = getRoom(roomId);
  if (state && state.hostId === userId) {
    // Host qəfil çıxdısa 60 saniyə gözlə, qayıtmasa yayını bağla
    state.hostLeftTimer = setTimeout(() => void endLive(roomId, 'HOST_LEFT'), 60_000);
  }
  if (state?.seats.length) emitToRoom(`live:${roomId}`, 'live:seats', { roomId, seats: await seatsPayload(roomId) });
  await broadcastViewers(roomId);
}

export function createSocketServer(http: HttpServer) {
  const io = new Server(http, { cors: { origin: '*' }, pingInterval: 20_000, pingTimeout: 20_000 });
  setIo(io);

  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string | undefined) ?? (socket.handshake.query.token as string | undefined);
    if (!token) return next(new Error('UNAUTHORIZED'));
    try {
      (socket.data as Data).userId = verifyAccess(token).id;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = (socket.data as Data).userId;
    await socket.join(`u:${userId}`);
    if (markOnline(userId)) {
      await prisma.user.update({ where: { id: userId }, data: { online: true, lastSeenAt: new Date() } }).catch(() => {});
      // Host onlayn oldu — izləyicilərə push (tezlik limiti ilə; services/growth.ts)
      void hostCameOnline(userId).catch(() => {});
    }

    socket.on('typing', async (p: { conversationId: string; to: string }) => {
      if (typeof p?.to === 'string') emitToUser(p.to, 'typing', { conversationId: p.conversationId, from: userId });
    });

    socket.on('live:join', async (p: { roomId: string }, ack?: (r: unknown) => void) => {
      const state = await ensureRoomState(p?.roomId);
      if (!state) return ack?.({ ok: false, error: 'LIVE_ENDED' });
      await socket.join(`live:${p.roomId}`);
      if (state.hostId === userId) {
        if (state.hostLeftTimer) clearTimeout(state.hostLeftTimer);
        state.hostLeftTimer = undefined;
        state.hostAbsentSince = undefined;
      }
      // Eyni soketdən təkrar "join" (məs. ekran yenidən render olunanda) sayılmır
      if (socketRooms(socket).has(p.roomId)) {
        ack?.({ ok: true, viewers: viewerCount(p.roomId) });
        return;
      }
      socketRooms(socket).add(p.roomId);
      const first = addViewer(p.roomId, userId);
      if (first) {
        const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, avatarUrl: true, totalSpent: true, vipTier: true, vipUntil: true } });
        if (u && u.id !== state.hostId) {
          const vip = activeVip(u);
          emitToRoom(`live:${p.roomId}`, 'live:enter', {
            user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl, wealthLevel: levelFromXp(u.totalSpent), vipTier: vip?.tier ?? 'NONE' },
            effect: !!vip?.entryEffect,
          });
        }
      }
      await broadcastViewers(p.roomId);
      ack?.({ ok: true, viewers: viewerCount(p.roomId) });
    });

    socket.on('live:leave', async (p: { roomId: string }) => {
      if (p?.roomId) await leaveLive(socket, p.roomId, userId);
    });

    socket.on('live:comment', async (p: { roomId: string; text: string }) => {
      if (!p?.roomId || typeof p.text !== 'string' || !socket.rooms.has(`live:${p.roomId}`)) return;
      const text = sanitizeText(p.text).slice(0, 200);
      if (!text || !allowComment(userId)) return;
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, avatarUrl: true, totalSpent: true, vipTier: true, vipUntil: true } });
      if (!u) return;
      emitToRoom(`live:${p.roomId}`, 'live:comment', {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text,
        user: { id: u.id, name: u.name, avatarUrl: u.avatarUrl, wealthLevel: levelFromXp(u.totalSpent), vipTier: activeVip(u)?.tier ?? 'NONE' },
        at: new Date(),
      });
    });

    socket.on('live:like', (p: { roomId: string; count?: number }) => {
      if (!p?.roomId || !socket.rooms.has(`live:${p.roomId}`)) return;
      const n = Math.min(20, Math.max(1, Number(p.count) || 1));
      likeBuffer.set(p.roomId, (likeBuffer.get(p.roomId) ?? 0) + n);
      socket.to(`live:${p.roomId}`).emit('live:like', { roomId: p.roomId, count: n });
    });

    socket.on('disconnect', async () => {
      // Yalnız bu soketin otaqlarından çıx (istifadəçinin digər cihazı otaqda qala bilər)
      for (const roomId of [...socketRooms(socket)]) await leaveLive(socket, roomId, userId).catch(() => {});
      if (markOffline(userId)) {
        await prisma.user.update({ where: { id: userId }, data: { online: false, lastSeenAt: new Date() } }).catch(() => {});
        // Bağlantı tamamilə kəsilibsə və güzəşt müddətində qayıtmayıbsa — aktiv zəngi bitir.
        // (Server yenidən başlasa bu taymer itir — onda billingTick-dəki oflayn yoxlaması işləyir.)
        setTimeout(async () => {
          if (io.sockets.adapter.rooms.get(`u:${userId}`)?.size) return;
          const calls = await prisma.call.findMany({ where: { status: { in: ['ACTIVE', 'RINGING'] }, OR: [{ callerId: userId }, { calleeId: userId }] } });
          for (const c of calls) {
            // Zəng edən getdisə — ləğv; host cavab vermədən getdisə — zəng hələ ki çalır (push ilə cavab verə bilər)
            if (c.status === 'RINGING' && c.calleeId === userId) continue;
            await finishCall(c.id, c.status === 'ACTIVE' ? 'ENDED' : 'CANCELLED', 'DISCONNECTED');
          }
        }, OFFLINE_GRACE_MS).unref();
      }
    });
  });

  return io;
}
