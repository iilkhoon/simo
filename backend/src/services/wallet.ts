/**
 * Pul kisəsi — bütün balans dəyişiklikləri atomikdir və kitabda (ledger) qeyd olunur.
 * Balans heç vaxt mənfi ola bilməz: azaltma "coins >= amount" şərti ilə yerinə yetirilir.
 */
import type { Tx } from '../db.js';
import { err } from '../lib/errors.js';
import { ECONOMY, hostDiamonds } from '../economy.js';

export async function spendCoins(tx: Tx, userId: string, amount: number, type: string, refId?: string, note = '') {
  if (amount <= 0) return null;
  const res = await tx.user.updateMany({
    where: { id: userId, coins: { gte: amount } },
    data: { coins: { decrement: amount }, totalSpent: { increment: amount } },
  });
  if (res.count === 0) throw err.insufficient(amount);
  const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { coins: true } });
  await tx.walletTransaction.create({
    data: { userId, currency: 'COIN', amount: -amount, balanceAfter: u.coins, type, refId, note },
  });
  return u.coins;
}

export async function creditCoins(tx: Tx, userId: string, amount: number, type: string, refId?: string, note = '') {
  if (amount <= 0) return null;
  const u = await tx.user.update({ where: { id: userId }, data: { coins: { increment: amount } }, select: { coins: true } });
  await tx.walletTransaction.create({
    data: { userId, currency: 'COIN', amount, balanceAfter: u.coins, type, refId, note },
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

/**
 * Coin xərcləndikdə qəbul edənə almaz yazılır. Əgər qəbul edən agentliyə üzvdürsə,
 * agentlik sahibi platformanın payından komissiya alır.
 */
export async function rewardReceiver(tx: Tx, receiverId: string, coinsSpent: number, type: string, refId?: string) {
  const diamonds = hostDiamonds(coinsSpent);
  if (diamonds <= 0) return 0;
  const u = await tx.user.update({
    where: { id: receiverId },
    data: { diamonds: { increment: diamonds }, totalEarned: { increment: diamonds } },
    select: { diamonds: true, agencyId: true },
  });
  await tx.walletTransaction.create({
    data: { userId: receiverId, currency: 'DIAMOND', amount: diamonds, balanceAfter: u.diamonds, type, refId },
  });
  if (u.agencyId) {
    const agency = await tx.agency.findUnique({ where: { id: u.agencyId } });
    if (agency && agency.status === 'ACTIVE' && agency.ownerId !== receiverId) {
      const commission = Math.floor(diamonds * (agency.commissionRate || ECONOMY.defaultAgencyCommission));
      await tx.agency.update({ where: { id: agency.id }, data: { totalDiamonds: { increment: diamonds } } });
      if (commission > 0) {
        const owner = await tx.user.update({
          where: { id: agency.ownerId },
          data: { diamonds: { increment: commission } },
          select: { diamonds: true },
        });
        await tx.walletTransaction.create({
          data: {
            userId: agency.ownerId, currency: 'DIAMOND', amount: commission, balanceAfter: owner.diamonds,
            type: 'AGENCY_COMMISSION', refId: receiverId,
          },
        });
      }
    }
  }
  return diamonds;
}
