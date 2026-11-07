/**
 * 1-ə-1 sesli/görüntülü zənglər: dəqiqəlik ödəniş (ilk dəqiqə qəbul anında), az balans xəbərdarlığı,
 * balans bitəndə avtomatik bitirmə, cavabsız zəngin 40 saniyədən sonra "buraxılmış" olması.
 *
 * Vəziyyət maşını (server):  RINGING ─accept→ ACTIVE ─end/hangup/balance/disconnect→ ENDED
 *                            RINGING ─reject→ REJECTED | ─cancel→ CANCELLED | ─40s→ MISSED
 * Bütün keçidlər şərtli `updateMany` ilə atomikdir: iki tərəf eyni anda "bitir" desə,
 * yalnız biri keçidi edir, digəri artıq bitmiş zəngi alır (ikiqat mesaj/hadisə yoxdur).
 * Dəqiqə ödənişi də şərtlidir (status=ACTIVE və billedMinutes=gözlənilən) — bitmiş zəngə
 * və ya eyni dəqiqəyə iki dəfə ödəniş yazılmır.
 */
import { prisma } from '../db.js';
import { rewardReceiver, spend } from './wallet.js';
import { emitToUser, isOnline } from '../realtime/hub.js';
import { AppError } from '../lib/errors.js';
import { getOrCreateConversation } from '../routes/chat.js';

export const RING_TIMEOUT_MS = 40_000;
/** Aktiv zəngdə tərəflərdən biri bu qədər oflayn qalsa, zəng bitirilir (server yenidən başladıqdan sonra da işləyir) */
export const OFFLINE_GRACE_MS = 60_000;
const ringTimers = new Map<string, NodeJS.Timeout>();

export function scheduleRingTimeout(callId: string) {
  clearRingTimeout(callId);
  const t = setTimeout(() => {
    ringTimers.delete(callId);
    void finishCall(callId, 'MISSED', 'NO_ANSWER').catch(() => {});
  }, RING_TIMEOUT_MS);
  ringTimers.set(callId, t);
}

export function clearRingTimeout(callId: string) {
  const t = ringTimers.get(callId);
  if (t) clearTimeout(t);
  ringTimers.delete(callId);
}

/** Hostun bu zəngdən qazandığı Almaz (daxili vahid) */
export async function callEarnings(callId: string, calleeId: string) {
  const agg = await prisma.walletTransaction.aggregate({
    where: { userId: calleeId, refId: callId, type: 'CALL_EARNED', currency: 'DIAMOND' },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

/**
 * Növbəti dəqiqəni ödəyir. Balans çatmırsa false qaytarır.
 * Zəng artıq aktiv deyilsə (və ya bu dəqiqə başqa axında ödənibsə) heç nə etmir və true qaytarır.
 */
export async function chargeMinute(callId: string): Promise<boolean> {
  try {
    const out = await prisma.$transaction(async (tx) => {
      const call = await tx.call.findUniqueOrThrow({ where: { id: callId } });
      if (call.status !== 'ACTIVE') return null;
      // Sətri kilidləyir: paralel finishCall/chargeMinute bu tranzaksiya bitənə qədər gözləyir
      const claimed = await tx.call.updateMany({
        where: { id: callId, status: 'ACTIVE', billedMinutes: call.billedMinutes },
        data: { billedMinutes: { increment: 1 }, coinsSpent: { increment: call.pricePerMin } },
      });
      if (claimed.count === 0) return null;
      let balance: number | null = null;
      if (call.pricePerMin > 0) {
        const r = await spend(tx, call.callerId, call.pricePerMin, 'CALL_SPENT', call.id);
        balance = r.balance;
        await rewardReceiver(tx, call.calleeId, r.paid, 'CALL_EARNED', call.id);
      }
      return { call, balance, billedMinutes: call.billedMinutes + 1, coinsSpent: call.coinsSpent + call.pricePerMin };
    });
    if (!out) return true;
    const { call } = out;
    const startedAt = call.startedAt?.getTime() ?? Date.now();
    const nextChargeAt = new Date(startedAt + out.billedMinutes * 60_000);
    if (out.balance != null) {
      emitToUser(call.callerId, 'wallet:update', { coins: out.balance });
      const minutesLeft = Math.floor(out.balance / call.pricePerMin);
      emitToUser(call.callerId, 'call:tick', {
        callId, billedMinutes: out.billedMinutes, coinsSpent: out.coinsSpent, coins: out.balance, minutesLeft, nextChargeAt,
      });
      if (out.balance < call.pricePerMin * 2) {
        const endsAt = new Date(startedAt + (out.billedMinutes + minutesLeft) * 60_000);
        const payload = { callId, coins: out.balance, minutesLeft, nextChargeAt, endsAt, secondsLeft: Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 1000)) };
        emitToUser(call.callerId, 'call:low-balance', payload);
        if (minutesLeft === 0) emitToUser(call.calleeId, 'call:ending-soon', payload);
      }
      emitToUser(call.calleeId, 'call:tick', {
        callId, billedMinutes: out.billedMinutes, earned: await callEarnings(callId, call.calleeId), nextChargeAt,
      });
    }
    return true;
  } catch (e) {
    if (e instanceof AppError && e.code === 'INSUFFICIENT_COINS') return false;
    throw e;
  }
}

export async function finishCall(
  callId: string,
  status: 'ENDED' | 'MISSED' | 'REJECTED' | 'CANCELLED',
  reason: string,
) {
  clearRingTimeout(callId);
  offlineSince.delete(callId);
  const from = status === 'ENDED' ? ['ACTIVE', 'RINGING'] : ['RINGING'];
  const res = await prisma.call.updateMany({
    where: { id: callId, status: { in: from as ('ACTIVE' | 'RINGING')[] } },
    data: { status, endedAt: new Date(), endReason: reason },
  });
  if (res.count === 0) return null;
  let call = await prisma.call.findUniqueOrThrow({ where: { id: callId } });
  const finalStatus = call.startedAt ? 'ENDED' : status === 'ENDED' ? 'CANCELLED' : status;
  if (finalStatus !== status) call = await prisma.call.update({ where: { id: callId }, data: { status: finalStatus } });
  const durationSec = call.startedAt ? Math.max(0, Math.round(((call.endedAt ?? new Date()).getTime() - call.startedAt.getTime()) / 1000)) : 0;
  const payload = { callId, status: finalStatus, reason, durationSec, coinsSpent: call.coinsSpent, billedMinutes: call.billedMinutes };
  emitToUser(call.callerId, 'call:ended', payload);
  emitToUser(call.calleeId, 'call:ended', payload);

  const conv = await getOrCreateConversation(call.callerId, call.calleeId);
  const msg = await prisma.message.create({
    data: {
      conversationId: conv.id, senderId: call.callerId, type: 'CALL',
      text: JSON.stringify({ type: call.type, status: finalStatus, durationSec }),
    },
  });
  await prisma.conversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: new Date(), lastMessageText: call.type === 'VIDEO' ? '📹' : '📞' },
  });
  emitToUser(call.callerId, 'message:new', msg);
  emitToUser(call.calleeId, 'message:new', msg);
  return call;
}

/** Aktiv zəngdə hər tərəfin oflayn olmağa başladığı an (yaddaşda) */
const offlineSince = new Map<string, number>();

/**
 * Bir "tik": vaxtı çatan dəqiqələri ödəyir, balansı bitəni bağlayır, köhnə RINGING-ləri MISSED edir,
 * tərəfi uzun müddət oflayn olan ACTIVE zəngləri bitirir. `now` və `online` testlər üçün ötürülə bilər.
 */
export async function billingTick(now = Date.now(), online: (userId: string) => boolean = isOnline) {
  const active = await prisma.call.findMany({ where: { status: 'ACTIVE' } });
  for (const c of active) {
    if (!c.startedAt) continue;
    // Tərəflərdən biri (bütün cihazlarda) oflayndırsa — güzəşt müddətindən sonra bitir
    const bothOnline = online(c.callerId) && online(c.calleeId);
    if (!bothOnline) {
      const since = offlineSince.get(c.id) ?? now;
      offlineSince.set(c.id, since);
      if (now - since >= OFFLINE_GRACE_MS) {
        await finishCall(c.id, 'ENDED', 'DISCONNECTED');
        continue;
      }
    } else {
      offlineSince.delete(c.id);
    }
    const due = c.startedAt.getTime() + c.billedMinutes * 60_000;
    if (now >= due) {
      const ok = await chargeMinute(c.id);
      if (!ok) await finishCall(c.id, 'ENDED', 'INSUFFICIENT_COINS');
    }
  }
  // Server yenidən başladıqda qalmış (taymeri itmiş) zəngləri bağla
  const stale = await prisma.call.findMany({
    where: { status: 'RINGING', createdAt: { lt: new Date(now - RING_TIMEOUT_MS - 5_000) } },
    select: { id: true },
  });
  for (const s of stale) await finishCall(s.id, 'MISSED', 'NO_ANSWER');
}

let billingTimer: NodeJS.Timeout | null = null;
let ticking = false;

export function startCallBilling() {
  if (billingTimer) return;
  billingTimer = setInterval(async () => {
    // Əvvəlki tik bitməyibsə (yavaş DB) — üst-üstə düşməsin
    if (ticking) return;
    ticking = true;
    try {
      await billingTick();
    } catch (e) {
      console.error('call billing error', e);
    } finally {
      ticking = false;
    }
  }, 5000);
}

export function stopCallBilling() {
  if (billingTimer) clearInterval(billingTimer);
  billingTimer = null;
  for (const t of ringTimers.values()) clearTimeout(t);
  ringTimers.clear();
}
