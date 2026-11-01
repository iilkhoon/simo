/**
 * 1-ə-1 sesli/görüntülü zənglər: dəqiqəlik ödəniş (ilk dəqiqə qəbul anında), az balans xəbərdarlığı,
 * balans bitəndə avtomatik bitirmə, cavabsız zəngin 40 saniyədən sonra "buraxılmış" olması.
 */
import { prisma } from '../db.js';
import { rewardReceiver, spendCoins } from './wallet.js';
import { emitToUser } from '../realtime/hub.js';
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

/** Növbəti dəqiqəni ödəyir. Balans çatmırsa false qaytarır. */
export async function chargeMinute(callId: string): Promise<boolean> {
  try {
    const out = await prisma.$transaction(async (tx) => {
      const call = await tx.call.findUniqueOrThrow({ where: { id: callId } });
      if (call.status !== 'ACTIVE') return null;
      let balance: number | null = null;
      if (call.pricePerMin > 0) {
        balance = await spendCoins(tx, call.callerId, call.pricePerMin, 'CALL_SPENT', call.id);
        await rewardReceiver(tx, call.calleeId, call.pricePerMin, 'CALL_EARNED', call.id);
      }
      await tx.call.update({
        where: { id: callId },
        data: { billedMinutes: { increment: 1 }, coinsSpent: { increment: call.pricePerMin } },
      });
      return { call, balance };
    });
    if (out && out.balance != null) {
      emitToUser(out.call.callerId, 'wallet:update', { coins: out.balance });
      if (out.balance < out.call.pricePerMin * 2) {
        emitToUser(out.call.callerId, 'call:low-balance', {
          callId, coins: out.balance, minutesLeft: Math.floor(out.balance / out.call.pricePerMin),
        });
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

export function startCallBilling() {
  if (billingTimer) return;
  billingTimer = setInterval(async () => {
    try {
      const active = await prisma.call.findMany({ where: { status: 'ACTIVE' } });
      for (const c of active) {
        if (!c.startedAt) continue;
        const due = c.startedAt.getTime() + c.billedMinutes * 60_000;
        if (Date.now() >= due) {
          const ok = await chargeMinute(c.id);
          if (!ok) await finishCall(c.id, 'ENDED', 'INSUFFICIENT_COINS');
        }
      }
      // Server yenidən başladıqda qalmış zəngləri bağla
      const stale = await prisma.call.findMany({
        where: { status: 'RINGING', createdAt: { lt: new Date(Date.now() - RING_TIMEOUT_MS - 10_000) } },
        select: { id: true },
      });
      for (const s of stale) await finishCall(s.id, 'MISSED', 'NO_ANSWER');
    } catch (e) {
      console.error('call billing error', e);
    }
  }, 5000);
}

export function stopCallBilling() {
  if (billingTimer) clearInterval(billingTimer);
  billingTimer = null;
}
