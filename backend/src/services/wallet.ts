/**
 * Pul kisəsi — bütün balans dəyişiklikləri atomikdir və kitabda (ledger) qeyd olunur.
 * Balans heç vaxt mənfi ola bilməz: azaltma "coins >= amount" şərti ilə yerinə yetirilir.
 */
import type { Tx } from '../db.js';
import { err } from '../lib/errors.js';
import { agencyTier, splitEarnings } from '../economy.js';

/**
 * Coin xərcləyir. Promo (pulsuz) coinlər birinci xərclənir.
 * Qaytarır: yeni balans və ödənişli hissə (`paid`) — qəbul edənə almaz yalnız ödənişli hissədən yazılır.
 */
export async function spend(tx: Tx, userId: string, amount: number, type: string, refId?: string, note = '') {
  if (amount <= 0) return { balance: null as number | null, paid: 0 };
  const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { promoCoins: true } });
  const fromPromo = Math.min(Math.max(0, before.promoCoins), amount);
  const res = await tx.user.updateMany({
    where: { id: userId, coins: { gte: amount }, promoCoins: { gte: fromPromo } },
    data: { coins: { decrement: amount }, promoCoins: { decrement: fromPromo }, totalSpent: { increment: amount } },
  });
  if (res.count === 0) throw err.insufficient(amount);
  const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { coins: true } });
  await tx.walletTransaction.create({
    data: { userId, currency: 'COIN', amount: -amount, balanceAfter: u.coins, type, refId, note: fromPromo ? `${note}${note ? ' ' : ''}promo:${fromPromo}` : note },
  });
  return { balance: u.coins as number | null, paid: amount - fromPromo };
}

export async function spendCoins(tx: Tx, userId: string, amount: number, type: string, refId?: string, note = '') {
  return (await spend(tx, userId, amount, type, refId, note)).balance;
}

/** Coin yazır. `promo: true` — pulsuz bonus coin (nağdlaşan almaz yaratmır). */
export async function creditCoins(tx: Tx, userId: string, amount: number, type: string, refId?: string, note = '', promo = false) {
  if (amount <= 0) return null;
  const u = await tx.user.update({
    where: { id: userId },
    data: { coins: { increment: amount }, ...(promo ? { promoCoins: { increment: amount } } : {}) },
    select: { coins: true },
  });
  await tx.walletTransaction.create({
    data: { userId, currency: 'COIN', amount, balanceAfter: u.coins, type, refId, note: promo ? `${note}${note ? ' ' : ''}promo` : note },
  });
  return u.coins;
}

export async function spendDiamonds(tx: Tx, userId: string, amount: number, type: string, refId?: string) {
  const res = await tx.user.updateMany({
    where: { id: userId, diamonds: { gte: amount } },
    data: { diamonds: { decrement: amount } },
  });
  if (res.count === 0) throw err.badRequest('INSUFFICIENT_DIAMONDS');
  const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { diamonds: true } });
  await tx.walletTransaction.create({
    data: { userId, currency: 'DIAMOND', amount: -amount, balanceAfter: u.diamonds, type, refId },
  });
}

/** Agentliyin son 30 gündəki hostlarının ümumi qazancı (Ləl) — səviyyəni təyin edir */
export async function agencyMonthly(tx: Tx, agencyId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 86400_000);
  const members = await tx.user.findMany({ where: { agencyId }, select: { id: true } });
  if (!members.length) return 0;
  const r = await tx.walletTransaction.aggregate({
    where: { userId: { in: members.map((m) => m.id) }, currency: 'DIAMOND', amount: { gt: 0 }, type: { in: EARN_TYPES }, createdAt: { gte: since } },
    _sum: { amount: true },
  });
  return r._sum.amount ?? 0;
}

export const EARN_TYPES = ['GIFT_RECEIVED', 'MESSAGE_EARNED', 'CALL_EARNED', 'SUBSCRIPTION_EARNED'];

/**
 * Ödənişli Nar xərcləndikdə: Simo 70%, qalan 30% host ilə agentlik arasında bölünür
 * (agentlik payı səviyyəyə görə 15–20%). Qəbul edən aktiv agentlikdə deyilsə — Ləl yazılmır.
 * Qaytarır: hosta yazılan Ləl.
 */
export async function rewardReceiver(tx: Tx, receiverId: string, paidCoins: number, type: string, refId?: string) {
  if (paidCoins <= 0) return 0;
  const r = await tx.user.findUnique({ where: { id: receiverId }, select: { agencyId: true } });
  if (!r?.agencyId) return 0;
  const agency = await tx.agency.findUnique({ where: { id: r.agencyId } });
  if (!agency || agency.status !== 'ACTIVE') return 0;
  const tier = agencyTier(await agencyMonthly(tx, agency.id));
  const ownerIsHost = agency.ownerId === receiverId;
  const split = splitEarnings(paidCoins, tier.share);
  // Agentlik sahibi özü host kimi qazanırsa — hər iki pay ona
  const hostAmount = ownerIsHost ? split.host + split.agency : split.host;
  if (hostAmount > 0) {
    const u = await tx.user.update({
      where: { id: receiverId },
      data: { diamonds: { increment: hostAmount }, totalEarned: { increment: hostAmount } },
      select: { diamonds: true },
    });
    await tx.walletTransaction.create({
      data: { userId: receiverId, currency: 'DIAMOND', amount: hostAmount, balanceAfter: u.diamonds, type, refId },
    });
  }
  await tx.agency.update({ where: { id: agency.id }, data: { totalDiamonds: { increment: hostAmount } } });
  if (!ownerIsHost && split.agency > 0) {
    const owner = await tx.user.update({ where: { id: agency.ownerId }, data: { diamonds: { increment: split.agency } }, select: { diamonds: true } });
    await tx.walletTransaction.create({
      data: { userId: agency.ownerId, currency: 'DIAMOND', amount: split.agency, balanceAfter: owner.diamonds, type: 'AGENCY_COMMISSION', refId: receiverId, note: `tier:${tier.tier}` },
    });
  }
  return hostAmount;
}
