import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { rtcToken } from '../services/agora.js';
import { endLive, ensureRoomState, guestsPayload, seatsPayload } from '../services/live.js';
import { pkPayload, registerPkRoutes } from '../services/pk.js';
import { MAX_GUESTS, getRoom, initRoom, leaveSeat, takeSeat } from '../realtime/liveState.js';
import { emitToUser } from '../realtime/hub.js';
import { emitToRoom } from '../realtime/hub.js';
import { notify } from '../services/notify.js';
import { loadViewer } from '../services/discovery.js';
import type { Prisma } from '../generated/prisma/client.js';

export default async function liveRoutes(app: FastifyInstance) {
  app.get('/live', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const q = z.object({ tab: z.enum(['popular', 'new', 'nearby', 'voice', 'following']).default('popular') }).parse(req.query);
    const viewer = await loadViewer(me);
    const where: Prisma.LiveRoomWhereInput = { status: 'LIVE', host: { banned: false, deletedAt: null } };
    if (q.tab === 'voice') where.type = 'VOICE';
    if (q.tab === 'following') {
      const f = await prisma.follow.findMany({ where: { followerId: me }, select: { followingId: true } });
      where.hostId = { in: f.map((x) => x.followingId) };
    }
    const rooms = await prisma.liveRoom.findMany({
      where,
      include: { host: { select: { ...publicUserSelect, photos: true } } },
      orderBy: q.tab === 'new' ? { startedAt: 'desc' } : [{ viewerCount: 'desc' }, { giftsCoins: 'desc' }],
      take: 60,
    });
    let items = rooms.map((r) => ({
      id: r.id, type: r.type, title: r.title, coverUrl: r.coverUrl ?? r.host.avatarUrl, viewerCount: r.viewerCount,
      giftsCoins: r.giftsCoins, startedAt: r.startedAt, host: presentUser(r.host, viewer),
    }));
    if (q.tab === 'nearby') items = items.filter((i) => i.host.distanceKm != null).sort((a, b) => (a.host.distanceKm ?? 0) - (b.host.distanceKm ?? 0));
    if (q.tab === 'popular' && viewer.interestedIn) {
      // Üstünlük verilən cinsin yayınları öndə
      items.sort((a, b) => Number(b.host.gender === viewer.interestedIn) - Number(a.host.gender === viewer.interestedIn) || b.viewerCount - a.viewerCount);
    }
    return { items };
  });

  app.post('/live', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ type: z.enum(['VIDEO', 'VOICE']), title: z.string().max(60).default(''), coverUrl: z.string().url().optional(), seatCount: z.union([z.literal(4), z.literal(8), z.literal(12)]).default(8) }).parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    if (!user.onboarded) throw err.badRequest('ONBOARDING_REQUIRED');
    const existing = await prisma.liveRoom.findMany({ where: { hostId: me, status: 'LIVE' }, select: { id: true } });
    for (const r of existing) await endLive(r.id, 'RESTARTED');
    const room = await prisma.liveRoom.create({
      data: { hostId: me, type: b.type, title: b.title, coverUrl: b.coverUrl, seatCount: b.type === 'VOICE' ? b.seatCount : 0, channel: `live_${Date.now()}_${user.shortId}` },
    });
    initRoom(room.id, me, room.type === 'VOICE', room.seatCount);
    if (room.type === 'VOICE') takeSeat(room.id, me, 0);
    // İzləyicilərə bildiriş
    const followers = await prisma.follow.findMany({ where: { followingId: me }, select: { followerId: true }, take: 500 });
    for (const f of followers) void notify(f.followerId, 'live', { actorId: me, body: `${user.name} · ${b.title}`, data: { roomId: room.id } }).catch(() => {});
    return { room, rtc: rtcToken(room.channel, user.shortId, true) };
  });

  app.get('/live/:id', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const room = await prisma.liveRoom.findUnique({ where: { id }, include: { host: { select: { ...publicUserSelect, photos: true } } } });
    if (!room) throw err.notFound();
    const blocked = await prisma.block.findFirst({ where: { blockerId: room.hostId, blockedId: me } });
    if (blocked) throw err.forbidden('BLOCKED');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { shortId: true } });
    if (room.status === 'LIVE') await ensureRoomState(id);
    const state = getRoom(id);
    const isHost = room.hostId === me;
    const onSeat = !!state?.seats.includes(me) || !!state?.guests.has(me);
    const top = await prisma.giftTransaction.groupBy({
      by: ['senderId'], where: { context: 'LIVE', contextId: id }, _sum: { coins: true }, orderBy: { _sum: { coins: 'desc' } }, take: 10,
    });
    const topUsers = await prisma.user.findMany({ where: { id: { in: top.map((t) => t.senderId) } }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(topUsers.map((u) => [u.id, presentUser(u)]));
    const following = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me, followingId: room.hostId } } });
    return {
      room: { ...room, host: presentUser(room.host) },
      isHost,
      isFollowing: !!following,
      rtc: room.status === 'LIVE' ? rtcToken(room.channel, user.shortId, isHost || onSeat) : null,
      seats: await seatsPayload(id),
      guests: await guestsPayload(id),
      pk: state?.pk ? await pkPayload(state.pk.battleId) : null,
      topGifters: top.flatMap((t) => (byId.get(t.senderId) ? [{ user: byId.get(t.senderId)!, coins: t._sum.coins ?? 0 }] : [])),
    };
  });

  app.post('/live/:id/end', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    if (!room || room.hostId !== me) throw err.forbidden();
    await endLive(id);
    const ended = await prisma.liveRoom.findUniqueOrThrow({ where: { id } });
    const earned = await prisma.giftTransaction.aggregate({ where: { context: 'LIVE', contextId: id }, _sum: { diamonds: true } });
    const diamonds = earned._sum.diamonds ?? 0;
    return { room: ended, summary: { durationSec: Math.round(((ended.endedAt ?? new Date()).getTime() - ended.startedAt.getTime()) / 1000), peakViewers: ended.peakViewers, giftsCoins: ended.giftsCoins, diamonds, likes: ended.likes } };
  });

  app.post('/live/:id/seat', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ seat: z.number().int().min(0).max(11) }).parse(req.body);
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    if (!room || room.status !== 'LIVE' || room.type !== 'VOICE') throw err.badRequest('NOT_VOICE_ROOM');
    await ensureRoomState(id);
    if (b.seat === 0 && room.hostId !== me) throw err.forbidden('HOST_SEAT');
    if (!takeSeat(id, me, b.seat)) throw err.badRequest('SEAT_TAKEN');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { shortId: true } });
    emitToRoom(`live:${id}`, 'live:seats', { roomId: id, seats: await seatsPayload(id) });
    return { rtc: rtcToken(room.channel, user.shortId, true) };
  });

  app.post('/live/:id/seat/leave', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    leaveSeat(id, me);
    emitToRoom(`live:${id}`, 'live:seats', { roomId: id, seats: await seatsPayload(id) });
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { shortId: true } });
    return { rtc: room ? rtcToken(room.channel, user.shortId, false) : null };
  });

  app.post('/live/:id/kick-seat', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ userId: z.string() }).parse(req.body);
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    if (!room || room.hostId !== me) throw err.forbidden();
    leaveSeat(id, b.userId);
    emitToRoom(`live:${id}`, 'live:seats', { roomId: id, seats: await seatsPayload(id) });
    emitToRoom(`live:${id}`, 'live:kicked-seat', { roomId: id, userId: b.userId });
    return { ok: true };
  });

  /* ───────── Yayına qonaq (səsli və ya videolu) ───────── */
  const guestKind = z.object({ kind: z.enum(['AUDIO', 'VIDEO']).default('AUDIO') });

  /** İzləyici qoşulmaq istəyir → host-a sorğu */
  app.post('/live/:id/guests/request', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    if (!room || room.status !== 'LIVE' || room.type !== 'VIDEO') throw err.badRequest('NOT_VIDEO_LIVE');
    const st = await ensureRoomState(id);
    if (!st) throw err.badRequest();
    st.guestRequests.add(me);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { ...publicUserSelect, photos: true } });
    emitToUser(room.hostId, 'live:guest-request', { roomId: id, user: presentUser(u) });
    return { ok: true };
  });

  /** Host izləyicini dəvət edir */
  app.post('/live/:id/guests/invite', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = guestKind.extend({ userId: z.string() }).parse(req.body);
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    if (!room || room.hostId !== me || room.status !== 'LIVE') throw err.forbidden();
    const st = await ensureRoomState(id);
    st?.invites.set(b.userId, b.kind);
    const host = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { ...publicUserSelect, photos: true } });
    emitToUser(b.userId, 'live:guest-invite', { roomId: id, kind: b.kind, host: presentUser(host) });
    void notify(b.userId, 'guest', { actorId: me, data: { roomId: id } }).catch(() => {});
    return { ok: true };
  });

  /** Qəbul: host sorğunu qəbul edir (userId ilə) və ya dəvət olunan dəvəti qəbul edir */
  app.post('/live/:id/guests/accept', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = guestKind.extend({ userId: z.string().optional() }).parse(req.body ?? {});
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    if (!room || room.status !== 'LIVE') throw err.badRequest();
    const st = await ensureRoomState(id);
    if (!st) throw err.badRequest();
    let guestId: string;
    let kind = b.kind;
    if (b.userId && room.hostId === me) {
      if (!st.guestRequests.has(b.userId)) throw err.badRequest('NO_REQUEST');
      guestId = b.userId;
    } else {
      const inv = st.invites.get(me);
      if (!inv) throw err.badRequest('NO_INVITE');
      guestId = me;
      kind = inv;
    }
    if (st.guests.size >= MAX_GUESTS && !st.guests.has(guestId)) throw err.badRequest('GUESTS_FULL');
    st.guests.set(guestId, kind);
    st.guestRequests.delete(guestId);
    st.invites.delete(guestId);
    const g = await prisma.user.findUniqueOrThrow({ where: { id: guestId }, select: { shortId: true } });
    emitToRoom(`live:${id}`, 'live:guests', { roomId: id, guests: await guestsPayload(id) });
    emitToUser(guestId, 'live:guest-joined', { roomId: id, kind, rtc: rtcToken(room.channel, g.shortId, true) });
    return { ok: true, rtc: guestId === me ? rtcToken(room.channel, g.shortId, true) : undefined };
  });

  /** Qonaq çıxır və ya host çıxarır */
  app.post('/live/:id/guests/remove', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ userId: z.string().optional() }).parse(req.body ?? {});
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    if (!room) throw err.notFound();
    const target = b.userId ?? me;
    if (target !== me && room.hostId !== me) throw err.forbidden();
    getRoom(id)?.guests.delete(target);
    emitToRoom(`live:${id}`, 'live:guests', { roomId: id, guests: await guestsPayload(id) });
    emitToUser(target, 'live:guest-removed', { roomId: id });
    return { ok: true };
  });

  /** Hostun yayın paneli: canlı statistika */
  app.get('/live/:id/stats', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const room = await prisma.liveRoom.findUnique({ where: { id } });
    if (!room || room.hostId !== me) throw err.forbidden();
    const st = getRoom(id);
    const [agg, top] = await Promise.all([
      prisma.giftTransaction.aggregate({ where: { context: 'LIVE', contextId: id }, _sum: { coins: true, diamonds: true }, _count: true }),
      prisma.giftTransaction.groupBy({ by: ['senderId'], where: { context: 'LIVE', contextId: id }, _sum: { coins: true }, orderBy: { _sum: { coins: 'desc' } }, take: 5 }),
    ]);
    const users = await prisma.user.findMany({ where: { id: { in: top.map((t) => t.senderId) } }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
    const reqIds = st ? [...st.guestRequests] : [];
    const reqUsers = await prisma.user.findMany({ where: { id: { in: reqIds } }, select: { ...publicUserSelect, photos: true } });
    return {
      durationSec: Math.round((Date.now() - room.startedAt.getTime()) / 1000),
      viewers: room.viewerCount, peakViewers: room.peakViewers, likes: room.likes,
      giftsCoins: agg._sum.coins ?? 0, diamonds: agg._sum.diamonds ?? 0, gifts: agg._count,
      topGifters: top.flatMap((t) => (byId.get(t.senderId) ? [{ user: byId.get(t.senderId)!, coins: t._sum.coins ?? 0 }] : [])),
      guestRequests: reqUsers.map((u) => presentUser(u)),
    };
  });

  registerPkRoutes(app);
}
