/**
 * Test hesabları (TEST_PHONES): limitsiz Nar və Almaz.
 * Nar promo kimi yazılır — xərclənəndə qəbul edənə nağdlaşan Almaz yaratmır.
 * Almaz "alınmış" kimi yazılır — nağdlaşmır.
 */
import { prisma } from '../db.js';
import { config } from '../config.js';
import { creditCoins } from './wallet.js';

export const TESTER_COINS = 1_000_000;
const TESTER_DIAMONDS = 1_000_000;

export function isTestPhone(phone?: string | null) {
  return !!phone && !!config.testOtpCode && config.testPhones.includes(phone);
}

/** Balansı yenidən doldurur (girişdə, /me və /wallet sorğusunda) */
export async function refillTester(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isTester: true, coins: true, diamonds: true } });
  if (!u?.isTester) return;
  await prisma.$transaction(async (tx) => {
    if (u.coins < TESTER_COINS / 2) await creditCoins(tx, userId, TESTER_COINS - u.coins, 'TEST_REFILL', undefined, '', true);
    if (u.diamonds < TESTER_DIAMONDS / 2) {
      const add = TESTER_DIAMONDS - u.diamonds;
      const d = await tx.user.update({ where: { id: userId }, data: { diamonds: { increment: add }, diamondsBought: { increment: add } }, select: { diamonds: true } });
      await tx.walletTransaction.create({ data: { userId, currency: 'DIAMOND', amount: add, balanceAfter: d.diamonds, type: 'TEST_REFILL' } });
    }
  });
}
