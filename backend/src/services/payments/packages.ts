import type { Tx } from '../../db.js';
import { prisma } from '../../db.js';
import { ECONOMY } from '../../economy.js';
import { creditCoins } from '../wallet.js';
import { notify } from '../notify.js';
import { emitToUser } from '../../realtime/hub.js';
import type { PaymentProvider } from '../../generated/prisma/client.js';

/**
 * Ödənişi idempotent şəkildə tamamlayır: eyni xarici ID ilə ikinci dəfə coin yazılmır.
 * İlk yükləmədə coin ×2, dəvət edənə bonus.
 */
export async function fulfillPayment(paymentId: string, raw?: unknown) {
  const result = await prisma.$transaction(async (tx: Tx) => {
    const updated = await tx.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: { status: 'PAID', paidAt: new Date(), ...(raw ? { raw: raw as object } : {}) },
    });
    const p = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (updated.count === 0) return { payment: p, credited: 0, already: true };
    const user = await tx.user.findUniqueOrThrow({
      where: { id: p.userId },
      select: { firstRechargeDone: true, referredById: true },
    });
    let coins = p.coins;
    if (!user.firstRechargeDone) {
      coins = p.coins * ECONOMY.firstRechargeMultiplier;
      await tx.user.update({ where: { id: p.userId }, data: { firstRechargeDone: true } });
      if (user.referredById) {
        await creditCoins(tx, user.referredById, Math.floor(p.coins * ECONOMY.referralShare), 'REFERRAL', p.userId);
      }
    }
    const balance = await creditCoins(tx, p.userId, coins, 'PURCHASE', p.id, `${p.provider}:${p.packageId}`);
    return { payment: p, credited: coins, balance, already: false };
  });
  if (!result.already) {
    emitToUser(result.payment.userId, 'wallet:update', { coins: result.balance, credited: result.credited });
    void notify(result.payment.userId, 'gift', { store: false, body: `+${result.credited} Simo Coin` }).catch(() => {});
  }
  return result;
}

export async function createPending(
  userId: string,
  provider: PaymentProvider,
  packageId: string,
  externalId: string | null,
  source = 'app',
) {
  const pkg = await prisma.coinPackage.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.active) throw new Error('PACKAGE_NOT_FOUND');
  if (externalId) {
    const existing = await prisma.payment.findUnique({ where: { provider_externalId: { provider, externalId } } });
    if (existing) return existing;
  }
  return prisma.payment.create({
    data: {
      userId, provider, packageId, externalId, source,
      amountQepik: pkg.priceQepik,
      coins: pkg.coins + pkg.bonusCoins,
    },
  });
}
