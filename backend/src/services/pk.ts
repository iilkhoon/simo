/**
 * PK döyüşləri: iki video yayın 5 dəqiqə yarışır. Yayındakı hosta göndərilən hər hədiyyə
 * (Nar dəyəri) onun tərəfinə xal yazır. Qalib host bonus promo Nar alır.
 */
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { ECONOMY } from '../economy.js';
import { emitToRoom, emitToUser } from '../realtime/hub.js';
import { getRoom } from '../realtime/liveState.js';
import { creditCoins } from './wallet.js';
import { ensureRoomState } from './live.js';
import { notify } from './notify.js';

const timers = new Map<string, NodeJS.Timeout>();

export async function pkPayload(battleId: string) {
  const b = await prisma.pkBattle.findUnique({ where: { id: battleId } });
  if (!b) return null;
  const hosts = await prisma.user.findMany({ where: { id: { in: [b.hostAId, b.hostBId] } }, select: { ...publicUserSelect, photos: true } });
  const byId = new Map(hosts.map((h) => [h.id, presentUser(h)]));
  return {
    id: b.id, status: b.status, endsAt: b.endsAt, winnerId: b.winnerId,
    a: { roomId: b.roomAId, host: byId.get(b.hostAId) ?? null, score: b.scoreA },
    b: { roomId: b.roomBId, host: byId.get(b.hostBId) ?? null, score: b.scoreB },
  };
}

async function broadcast(battleId: string, event: string) {
  const p = await pkPayload(battleId);
  if (!p) return;
  emitToRoom(`live:${p.a.roomId}`, event, p);
  emitToRoom(`live:${p.b.roomId}`, event, p);
}

export async function endPk(battleId: string) {
  const t = timers.get(battleId);
  if (t) clearTimeout(t);
  timers.delete(battleId);
  // Taymer, sweeper və "bitir" düyməsi eyni anda çağıra bilər: keçid və bonus bir tranzaksiyada,
  // şərtli yeniləmə ilə — qalib bonusu yalnız bir dəfə yazılır
  const done = await prisma.$transaction(async (tx) => {
    const claimed = await tx.pkBattle.updateMany({ where: { id: battleId, status: 'ACTIVE' }, data: { status: 'ENDED' } });
    if (!claimed.count) return null;
    const b = await tx.pkBattle.findUniqueOrThrow({ where: { id: battleId } });
    const winnerId = b.scoreA === b.scoreB ? null : b.scoreA > b.scoreB ? b.hostAId : b.hostBId;
    await tx.pkBattle.update({ where: { id: battleId }, data: { winnerId, endsAt: b.endsAt && b.endsAt.getTime() < Date.now() ? b.endsAt : new Date() } });
    if (winnerId) await creditCoins(tx, winnerId, ECONOMY.pkWinnerBonusPromo, 'PK_WIN', battleId, '', true);
    return b;
  });
  if (!done) return;
  for (const r of [done.roomAId, done.roomBId]) {
    const st = getRoom(r);
    if (st?.pk?.battleId === battleId) st.pk = undefined;
  }
  await broadcast(battleId, 'pk:end');
}

export const PK_INVITE_TTL_MS = 60_000;

/** Server restartında itən taymerlər üçün: vaxtı keçmiş döyüşləri bitir, köhnə dəvətləri EXPIRED et */
export async function sweepPk(now = Date.now()) {
  const due = await prisma.pkBattle.findMany({ where: { status: 'ACTIVE', endsAt: { lt: new Date(now - 3_000) } }, select: { id: true } });
  for (const b of due) await endPk(b.id);
  const old = await prisma.pkBattle.findMany({ where: { status: 'PENDING', createdAt: { lt: new Date(now - PK_INVITE_TTL_MS) } }, select: { id: true, hostAId: true } });
  for (const b of old) {
    const r = await prisma.pkBattle.updateMany({ where: { id: b.id, status: 'PENDING' }, data: { status: 'EXPIRED' } });
    if (r.count) emitToUser(b.hostAId, 'pk:declined', { battleId: b.id, expired: true });
  }
}

/** Hədiyyə PK zamanı yayın hostuna gedirsə — xal əlavə et */
export async function addPkScore(roomId: string, receiverId: string, coins: number) {
  const st = getRoom(roomId);
  if (!st?.pk || st.hostId !== receiverId || Date.now() > st.pk.endsAt) return;
  const field = st.pk.side === 'A' ? 'scoreA' : 'scoreB';
  await prisma.pkBattle.update({ where: { id: st.pk.battleId }, data: { [field]: { increment: coins } } });
  await broadcast(st.pk.battleId, 'pk:score');
}

export function registerPkRoutes(app: FastifyInstance) {
  /** Host başqa canlı video yayına PK dəvəti göndərir */
  app.post('/live/:id/pk/invite', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({ targetRoomId: z.string() }).parse(req.body);
    const [mine, target] = await Promise.all([prisma.liveRoom.findUnique({ where: { id } }), prisma.liveRoom.findUnique({ where: { id: b.targetRoomId } })]);
    if (!mine || mine.hostId !== me || mine.status !== 'LIVE' || mine.type !== 'VIDEO') throw err.forbidden();
    if (!target || target.status !== 'LIVE' || target.type !== 'VIDEO' || target.id === mine.id) throw err.badRequest('TARGET_NOT_LIVE');
    const [s1, s2] = await Promise.all([ensureRoomState(mine.id), ensureRoomState(target.id)]);
    if (s1?.pk || s2?.pk) throw err.badRequest('PK_BUSY');
    const battle = await prisma.pkBattle.create({ data: { roomAId: mine.id, roomBId: target.id, hostAId: me, hostBId: target.hostId, durationSec: ECONOMY.pkDurationSec } });
    const host = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { ...publicUserSelect, photos: true } });
    emitToUser(target.hostId, 'pk:invite', { battleId: battle.id, from: presentUser(host), roomId: mine.id });
    void notify(target.hostId, 'pk', { actorId: me, data: { battleId: battle.id } }).catch(() => {});
    return { battle };
  });

  app.post('/pk/:id/:action', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const p = z.object({ id: z.string(), action: z.enum(['accept', 'decline', 'end']) }).parse(req.params);
    const b = await prisma.pkBattle.findUnique({ where: { id: p.id } });
    if (!b) throw err.notFound();
    if (p.action === 'end') {
      if (b.hostAId !== me && b.hostBId !== me) throw err.forbidden();
      await endPk(b.id);
      return { ok: true };
    }
    if (b.hostBId !== me || b.status !== 'PENDING') throw err.forbidden();
    if (p.action === 'decline') {
      await prisma.pkBattle.updateMany({ where: { id: b.id, status: 'PENDING' }, data: { status: 'DECLINED' } });
      emitToUser(b.hostAId, 'pk:declined', { battleId: b.id });
      return { ok: true };
    }
    if (Date.now() - b.createdAt.getTime() > PK_INVITE_TTL_MS) {
      await prisma.pkBattle.updateMany({ where: { id: b.id, status: 'PENDING' }, data: { status: 'EXPIRED' } });
      throw err.badRequest('PK_EXPIRED');
    }
    const [sa, sb] = await Promise.all([ensureRoomState(b.roomAId), ensureRoomState(b.roomBId)]);
    if (!sa || !sb) throw err.badRequest('TARGET_NOT_LIVE');
    // Dəvətlər arasında otaqlardan biri artıq başqa PK-ya girib
    if (sa.pk || sb.pk) throw err.badRequest('PK_BUSY');
    const endsAt = new Date(Date.now() + b.durationSec * 1000);
    const started = await prisma.pkBattle.updateMany({ where: { id: b.id, status: 'PENDING' }, data: { status: 'ACTIVE', startedAt: new Date(), endsAt } });
    if (!started.count) throw err.badRequest('PK_EXPIRED');
    sa.pk = { battleId: b.id, opponentRoomId: b.roomBId, side: 'A', endsAt: endsAt.getTime() };
    sb.pk = { battleId: b.id, opponentRoomId: b.roomAId, side: 'B', endsAt: endsAt.getTime() };
    timers.set(b.id, setTimeout(() => void endPk(b.id).catch(() => {}), b.durationSec * 1000));
    await broadcast(b.id, 'pk:start');
    return { ok: true };
  });
}
