import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { callWindowOpen, presentUser, publicUserSelect } from '../lib/present.js';
import { ECONOMY, activeVip } from '../economy.js';
import { rtcToken } from '../services/agora.js';
import { emitToUser } from '../realtime/hub.js';
import { notify, pushIncomingCall } from '../services/notify.js';
import { callEarnings, chargeMinute, clearRingTimeout, finishCall, scheduleRingTimeout } from '../services/calls.js';

/** Hostun qiyməti köhnə (aşağı) dəyərdə qalıbsa, cari minimuma qaldırılır */
const minPrice = (type: 'VIDEO' | 'VOICE', p: number) => Math.max(type === 'VIDEO' ? ECONOMY.videoCallPrice.min : ECONOMY.voiceCallPrice.min, p);

async function callPrice(callerId: string, calleeId: string, type: 'VIDEO' | 'VOICE') {
  const [caller, callee] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: callerId } }),
    prisma.user.findUniqueOrThrow({ where: { id: calleeId } }),
  ]);
  if (callee.hostStatus === 'APPROVED' && caller.hostStatus !== 'APPROVED') {
    const base = minPrice(type, type === 'VIDEO' ? callee.videoCallPrice : callee.voiceCallPrice);
    const vip = activeVip(caller);
    return { price: Math.ceil(base * (1 - (vip?.callDiscount ?? 0))), caller, callee };
  }
  // Adi istifadəçilər arasında zəng pulsuzdur, lakin yalnız qarşılıqlı uyğunluq olduqda
  const [a, b] = [callerId, calleeId].sort();
  const match = await prisma.match.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  // Test hesabları bir-birinə uyğunluqsuz zəng edə bilir
  if (!match && callee.hostStatus !== 'APPROVED' && !(caller.isTester && callee.isTester)) throw err.forbidden('MATCH_REQUIRED');
  return { price: 0, caller, callee };
}

export default async function callRoutes(app: FastifyInstance) {
  app.get('/calls/price/:userId', { preHandler: requireAuth }, async (req) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const me = uid(req);
    const out: Record<string, number | null> = {};
    for (const t of ['VIDEO', 'VOICE'] as const) {
      try {
        out[t] = (await callPrice(me, userId, t)).price;
      } catch {
        out[t] = null;
      }
    }
    return out;
  });

  /**
   * Zəngdən əvvəl təsdiq ekranı üçün: dəqiqəlik qiymət, balans, neçə dəqiqəyə çatır.
   * `available=false` olduqda `reason` səbəbi bildirir (zəng ayarları, saatlar, məşğul, uyğunluq).
   */
  app.get('/calls/quote/:userId', { preHandler: requireAuth }, async (req) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const { type } = z.object({ type: z.enum(['VIDEO', 'VOICE']).default('VIDEO') }).parse(req.query);
    const me = uid(req);
    try {
      const { price, caller, callee } = await callPrice(me, userId, type);
      let reason: string | null = null;
      if (callee.deletedAt || callee.banned) reason = 'USER_NOT_FOUND';
      else if (type === 'VIDEO' && !callee.acceptVideo) reason = 'VIDEO_CALLS_OFF';
      else if (type === 'VOICE' && !callee.acceptVoice) reason = 'VOICE_CALLS_OFF';
      else if (!callWindowOpen(callee.callHours)) reason = 'OUTSIDE_CALL_HOURS';
      else if (callee.presence === 'BUSY') reason = 'USER_BUSY';
      const base = price > 0 ? minPrice(type, type === 'VIDEO' ? callee.videoCallPrice : callee.voiceCallPrice) : 0;
      return {
        type, price, basePrice: base, coins: caller.coins,
        minutes: price > 0 ? Math.floor(caller.coins / price) : null,
        enough: caller.coins >= price, available: !reason, reason,
      };
    } catch (e) {
      const code = (e as { code?: string }).code ?? 'FORBIDDEN';
      return { type, price: null, basePrice: null, coins: null, minutes: null, enough: false, available: false, reason: code };
    }
  });

  app.post('/calls', { preHandler: requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req) => {
    const me = uid(req);
    const b = z.object({ calleeId: z.string(), type: z.enum(['VIDEO', 'VOICE']) }).parse(req.body);
    if (b.calleeId === me) throw err.badRequest();
    const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: me, blockedId: b.calleeId }, { blockerId: b.calleeId, blockedId: me }] } });
    if (blocked) throw err.forbidden('BLOCKED');
    const { price, caller, callee } = await callPrice(me, b.calleeId, b.type);
    if (callee.deletedAt || callee.banned) throw err.notFound('USER_NOT_FOUND');
    // Qəbul edənin zəng ayarları: görüntülü/səsli ayrıca bağlana bilər, zəng saatları, "məşğulam" statusu
    if (b.type === 'VIDEO' && !callee.acceptVideo) throw err.badRequest('VIDEO_CALLS_OFF');
    if (b.type === 'VOICE' && !callee.acceptVoice) throw err.badRequest('VOICE_CALLS_OFF');
    if (!callWindowOpen(callee.callHours)) throw err.badRequest('OUTSIDE_CALL_HOURS', { hours: callee.callHours });
    if (callee.presence === 'BUSY') throw err.badRequest('USER_BUSY');
    if (caller.coins < price) throw err.insufficient(price);
    // Eyni anda iki zəng (iki fərqli zəng edəndən və ya iki cihazdan) eyni hosta düşməsin:
    // hər iki istifadəçi üzrə tranzaksiya kilidi altında yoxla və yarat
    const call = await prisma.$transaction(async (tx) => {
      for (const u of [me, b.calleeId].sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'call:' + u}))`;
      const busy = await tx.call.findFirst({
        where: {
          status: { in: ['RINGING', 'ACTIVE'] },
          OR: [{ callerId: { in: [me, b.calleeId] } }, { calleeId: { in: [me, b.calleeId] } }],
        },
      });
      if (busy) throw err.badRequest('USER_BUSY');
      return tx.call.create({
        data: { callerId: me, calleeId: b.calleeId, type: b.type, pricePerMin: price, channel: `call_${Date.now()}_${caller.shortId}_${Math.random().toString(36).slice(2, 6)}` },
      });
    });
    scheduleRingTimeout(call.id);
    const callerPublic = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { ...publicUserSelect, photos: true } });
    const payload = { call, caller: presentUser(callerPublic) };
    emitToUser(b.calleeId, 'call:incoming', payload);
    // Sistem zəng ekranı (CallKit / ConnectionService); alınmasa — adi bildiriş
    void pushIncomingCall(b.calleeId, { callId: call.id, type: b.type, callerName: caller.name, actorId: me })
      .then((native) => (native ? undefined : notify(b.calleeId, 'call', { actorId: me, store: false, pushIfOnline: false, body: `${caller.name} · ${b.type === 'VIDEO' ? '📹' : '📞'}`, data: { callId: call.id } })))
      .catch(() => {});
    const calleePublic = await prisma.user.findUniqueOrThrow({ where: { id: b.calleeId }, select: { ...publicUserSelect, photos: true } });
    return { call, peer: presentUser(calleePublic), rtc: rtcToken(call.channel, caller.shortId, true) };
  });

  /**
   * Təsadüfi video/səsli tanışlıq: hazırda onlayn olan, məşğul olmayan təsdiqlənmiş hostlardan birini seçir.
   * Seçim: üstünlük verilən cins, aktivlik, cazibə səviyyəsi + təsadüfilik. Zəngin özü POST /calls ilə başlayır.
   */
  app.get('/calls/match', { preHandler: requireAuth, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req) => {
    const me = uid(req);
    const q = z.object({ type: z.enum(['VIDEO', 'VOICE']).default('VIDEO'), skip: z.string().optional() }).parse(req.query);
    const viewer = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    const skip = new Set((q.skip ?? '').split(',').filter(Boolean).slice(0, 50));
    skip.add(me);
    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: me }, { blockedId: me }] }, select: { blockerId: true, blockedId: true } });
    blocks.forEach((b) => skip.add(b.blockerId === me ? b.blockedId : b.blockerId));
    const busy = await prisma.call.findMany({ where: { status: { in: ['RINGING', 'ACTIVE'] } }, select: { callerId: true, calleeId: true } });
    busy.forEach((c) => { skip.add(c.callerId); skip.add(c.calleeId); });
    const candidates = await prisma.user.findMany({
      where: {
        id: { notIn: [...skip] }, hostStatus: 'APPROVED', online: true, banned: false, deletedAt: null,
        ...(viewer.interestedIn ? { gender: viewer.interestedIn } : {}),
      },
      select: { ...publicUserSelect, photos: true },
      take: 40,
      orderBy: { lastSeenAt: 'desc' },
    });
    if (!candidates.length) return { user: null, price: null };
    const weighted = candidates.map((u) => ({ u, w: 1 + Math.min(10, Math.sqrt(u.totalEarned / 1000)) + Math.random() * 4 }));
    weighted.sort((a, b) => b.w - a.w);
    const pick = weighted[Math.floor(Math.random() * Math.min(5, weighted.length))].u;
    const vipDiscount = activeVip(viewer)?.callDiscount ?? 0;
    const base = minPrice(q.type, q.type === 'VIDEO' ? pick.videoCallPrice : pick.voiceCallPrice);
    return { user: presentUser(pick), price: Math.ceil(base * (1 - vipDiscount)) };
  });

  app.get('/calls/:id', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const call = await prisma.call.findUnique({ where: { id } });
    if (!call || (call.callerId !== me && call.calleeId !== me)) throw err.notFound();
    const peerId = call.callerId === me ? call.calleeId : call.callerId;
    const [peer, mine] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: peerId }, select: { ...publicUserSelect, photos: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: me }, select: { shortId: true } }),
    ]);
    const role = call.callerId === me ? 'caller' : 'callee';
    const nextChargeAt = call.status === 'ACTIVE' && call.startedAt ? new Date(call.startedAt.getTime() + call.billedMinutes * 60_000) : null;
    return {
      call, peer: presentUser(peer), rtc: rtcToken(call.channel, mine.shortId, true), role,
      serverNow: new Date(), nextChargeAt,
      earned: role === 'callee' && call.pricePerMin > 0 ? await callEarnings(call.id, call.calleeId) : 0,
    };
  });

  /** Zəngdən sonrakı xülasə: müddət, xərclənən Nar / qazanılan Almaz, hədiyyələr, izləmə, qiymət */
  app.get('/calls/:id/summary', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const call = await prisma.call.findUnique({ where: { id } });
    if (!call || (call.callerId !== me && call.calleeId !== me)) throw err.notFound();
    const isCaller = call.callerId === me;
    const peerId = isCaller ? call.calleeId : call.callerId;
    const [peer, gifts, follow] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: peerId }, select: { ...publicUserSelect, photos: true } }),
      prisma.giftTransaction.aggregate({ where: { context: 'CALL', contextId: id }, _sum: { coins: true, diamonds: true } }),
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me, followingId: peerId } } }),
    ]);
    const end = call.endedAt ?? new Date();
    return {
      call: { id: call.id, type: call.type, status: call.status, endReason: call.endReason, pricePerMin: call.pricePerMin, billedMinutes: call.billedMinutes, startedAt: call.startedAt, endedAt: call.endedAt },
      role: isCaller ? 'caller' : 'callee',
      durationSec: call.startedAt ? Math.max(0, Math.round((end.getTime() - call.startedAt.getTime()) / 1000)) : 0,
      coinsSpent: isCaller ? call.coinsSpent : 0,
      earned: isCaller ? 0 : await callEarnings(call.id, call.calleeId),
      giftsCoins: gifts._sum.coins ?? 0,
      giftsDiamonds: isCaller ? 0 : gifts._sum.diamonds ?? 0,
      peer: presentUser(peer),
      isFollowing: !!follow,
      myRating: isCaller ? call.callerRating : call.calleeRating,
    };
  });

  /** Zəngi qiymətləndirmək (yalnız başlamış və bitmiş zəng, bir dəfə dəyişdirilə bilər) */
  app.post('/calls/:id/rate', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ stars: z.number().int().min(1).max(5) }).parse(req.body);
    const call = await prisma.call.findUnique({ where: { id } });
    if (!call || (call.callerId !== me && call.calleeId !== me)) throw err.notFound();
    if (!call.startedAt || call.status !== 'ENDED') throw err.badRequest('CALL_NOT_ENDED');
    await prisma.call.update({ where: { id }, data: call.callerId === me ? { callerRating: b.stars } : { calleeRating: b.stars } });
    return { ok: true };
  });

  app.post('/calls/:id/accept', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const res = await prisma.call.updateMany({ where: { id, calleeId: me, status: 'RINGING' }, data: { status: 'ACTIVE', startedAt: new Date() } });
    if (res.count === 0) {
      // Təkrar qəbul (məs. sistem ekranı və tətbiq eyni anda): artıq aktiv zəngi qaytar, xəta vermə
      const cur = await prisma.call.findFirst({ where: { id, calleeId: me, status: 'ACTIVE' } });
      if (!cur) throw err.badRequest('CALL_NOT_RINGING');
      const callee = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { shortId: true } });
      return { call: cur, rtc: rtcToken(cur.channel, callee.shortId, true) };
    }
    clearRingTimeout(id);
    const ok = await chargeMinute(id);
    if (!ok) {
      await finishCall(id, 'ENDED', 'INSUFFICIENT_COINS');
      throw err.badRequest('CALLER_INSUFFICIENT');
    }
    const call = await prisma.call.findUniqueOrThrow({ where: { id } });
    // Zəng edən qəbul anında imtina etdisə
    if (call.status !== 'ACTIVE') throw err.badRequest('CALL_NOT_RINGING');
    const callee = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { shortId: true } });
    emitToUser(call.callerId, 'call:accepted', { callId: id, startedAt: call.startedAt });
    // Hostun digər cihazlarında gələn zəng ekranı bağlansın
    emitToUser(call.calleeId, 'call:accepted', { callId: id, startedAt: call.startedAt });
    return { call, rtc: rtcToken(call.channel, callee.shortId, true) };
  });

  app.post('/calls/:id/reject', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const call = await prisma.call.findUnique({ where: { id } });
    if (!call || (call.callerId !== me && call.calleeId !== me)) throw err.notFound();
    await finishCall(id, call.callerId === me ? 'CANCELLED' : 'REJECTED', call.callerId === me ? 'CANCELLED' : 'REJECTED');
    return { ok: true };
  });

  app.post('/calls/:id/end', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const call = await prisma.call.findUnique({ where: { id } });
    if (!call || (call.callerId !== me && call.calleeId !== me)) throw err.notFound();
    // Cavab verilməmiş zəngi host "bitir"sə — bu, imtinadır (zəng edənə "rədd edildi" görünsün)
    const ended = call.status === 'RINGING' && call.calleeId === me
      ? await finishCall(id, 'REJECTED', 'REJECTED')
      : await finishCall(id, 'ENDED', 'HANGUP');
    return { ok: true, call: ended ?? (await prisma.call.findUniqueOrThrow({ where: { id } })) };
  });

  app.get('/calls', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const items = await prisma.call.findMany({ where: { OR: [{ callerId: me }, { calleeId: me }] }, orderBy: { createdAt: 'desc' }, take: 50 });
    const ids = [...new Set(items.map((c) => (c.callerId === me ? c.calleeId : c.callerId)))];
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
    return { items: items.map((c) => ({ ...c, peer: byId.get(c.callerId === me ? c.calleeId : c.callerId) ?? null })) };
  });
}
