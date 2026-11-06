/**
 * 1-ə-1 sesli/görüntülü zənglər: dəqiqəlik ödəniş (ilk dəqiqə qəbul anında), az balans xəbərdarlığı,
 * balans bitəndə avtomatik bitirmə, cavabsız zəngin 40 saniyədən sonra "buraxılmış" olması.
 */
import { prisma } from '../db.js';
import { rewardReceiver, spend } from './wallet.js';
import { emitToUser, getIo, isOnline } from '../realtime/hub.js';
import { ECONOMY } from '../economy.js';
import { AppError } from '../lib/errors.js';
import { getOrCreateConversation } from '../routes/chat.js';

export const RING_TIMEOUT_MS = 40_000;
const ringTimers = new Map<string, NodeJS.Timeout>();

export function scheduleRingTimeout(callId: string) {
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

/**
 * Növbəti dəqiqəni ödəyir (dəqiqə əvvəlcədən ödənir: qəbul anında 1-ci dəqiqə = minimum ödəniş).
 * Eyni dəqiqənin iki dəfə tutulmasına qarşı: `billedMinutes` şərti ilə "iddia" edilir — qəbul marşrutu və
 * billing taymeri eyni anda işləsə belə yalnız biri ödəyir. Balans çatmırsa false qaytarır.
 */
export async function chargeMinute(callId: string): Promise<boolean> {
  try {
    const out = await prisma.$transaction(async (tx) => {
      const call = await tx.call.findUniqueOrThrow({ where: { id: callId } });
      if (call.status !== 'ACTIVE') return null;
      const claimed = await tx.call.updateMany({
        where: { id: callId, status: 'ACTIVE', billedMinutes: call.billedMinutes },
        data: { billedMinutes: { increment: 1 }, coinsSpent: { increment: call.pricePerMin } },
      });
      if (claimed.count === 0) return null; // başqa proses artıq bu dəqiqəni ödədi
      let balance: number | null = null;
      if (call.pricePerMin > 0) {
        const r = await spend(tx, call.callerId, call.pricePerMin, 'CALL_SPENT', call.id);
        balance = r.balance;
        await rewardReceiver(tx, call.calleeId, r.paid, 'CALL_EARNED', call.id);
      }
      return { call, balance, minute: call.billedMinutes + 1 };
    });
    if (out && out.balance != null) {
      emitToUser(out.call.callerId, 'wallet:update', { coins: out.balance });
      // Növbəti dəqiqəyə balans çatmırsa — bu son dəqiqədir: "1 dəqiqə qaldı" xəbərdarlığı
      if (out.balance < out.call.pricePerMin * 2) {
        const minutesLeft = Math.floor(out.balance / out.call.pricePerMin);
        const startedAt = out.call.startedAt?.getTime() ?? Date.now();
        const endsAt = new Date(startedAt + (out.minute + minutesLeft) * 60_000);
        const payload = { callId, coins: out.balance, minutesLeft, endsAt, secondsLeft: Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 1000)) };
        emitToUser(out.call.callerId, 'call:low-balance', payload);
        if (minutesLeft === 0) emitToUser(out.call.calleeId, 'call:ending-soon', payload);
      }
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
  const from = status === 'ENDED' ? ['ACTIVE', 'RINGING'] : ['RINGING'];
  const res = await prisma.call.updateMany({
    where: { id: callId, status: { in: from as ('ACTIVE' | 'RINGING')[] } },
    data: { status, endedAt: new Date(), endReason: reason },
  });
  if (res.count === 0) return null;
  const call = await prisma.call.findUniqueOrThrow({ where: { id: callId } });
  const finalStatus = call.startedAt ? 'ENDED' : status === 'ENDED' ? 'CANCELLED' : status;
  if (finalStatus !== status) await prisma.call.update({ where: { id: callId }, data: { status: finalStatus } });
  const durationSec = call.startedAt ? Math.round((Date.now() - call.startedAt.getTime()) / 1000) : 0;
  const payload = { callId, status: finalStatus, reason, durationSec, coinsSpent: call.coinsSpent };
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

let billingTimer: NodeJS.Timeout | null = null;
/** Zəng iştirakçısının socket bağlantısı nə vaxtdan yoxdur (server yenidən başlasa da zəng sonsuz ödənməsin) */
const offlineSince = new Map<string, number>();

/** Billing dövrü (5 saniyədə bir): vaxtı çatan dəqiqələri ödəyir, bağlantısı kəsilən zəngləri bitirir */
export async function billingTick(now = Date.now()) {
  const active = await prisma.call.findMany({ where: { status: 'ACTIVE' } });
  const seen = new Set<string>();
  for (const c of active) {
    if (!c.startedAt) continue;
    seen.add(c.id);
    // Hər iki tərəf real-time bağlantıda olmalıdır; 45 saniyədən çox yoxdursa — zəng bitir (artıq ödəniş tutulmur)
    if (getIo()) {
      const gone = !isOnline(c.callerId) || !isOnline(c.calleeId);
      if (gone) {
        const since = offlineSince.get(c.id) ?? now;
        offlineSince.set(c.id, since);
        if (now - since >= ECONOMY.callDisconnectGraceSec * 1000) {
          offlineSince.delete(c.id);
          await finishCall(c.id, 'ENDED', 'DISCONNECTED');
          continue;
        }
      } else offlineSince.delete(c.id);
    }
    const due = c.startedAt.getTime() + c.billedMinutes * 60_000;
    if (now >= due) {
      const ok = await chargeMinute(c.id);
      if (!ok) await finishCall(c.id, 'ENDED', 'INSUFFICIENT_COINS');
    }
  }
  for (const id of offlineSince.keys()) if (!seen.has(id)) offlineSince.delete(id);
  // Server yenidən başladıqda qalmış zəngləri bağla
  const stale = await prisma.call.findMany({
    where: { status: 'RINGING', createdAt: { lt: new Date(now - RING_TIMEOUT_MS - 10_000) } },
    select: { id: true },
  });
  for (const s of stale) await finishCall(s.id, 'MISSED', 'NO_ANSWER');
}

export function startCallBilling() {
  if (billingTimer) return;
  let running = false;
  billingTimer = setInterval(async () => {
    if (running) return; // əvvəlki dövr hələ bitməyibsə üst-üstə düşməsin
    running = true;
    try {
      await billingTick();
    } catch (e) {
      console.error('call billing error', e);
    } finally {
      running = false;
    }
  }, 5000);
}

export function stopCallBilling() {
  if (billingTimer) clearInterval(billingTimer);
  billingTimer = null;
}
