import type { Tx } from '../../db.js';
import { prisma } from '../../db.js';
import { ECONOMY } from '../../economy.js';
import { creditCoins } from '../wallet.js';
import { notify } from '../notify.js';
import { emitToUser } from '../../realtime/hub.js';
import type { PaymentProvider } from '../../generated/prisma/client.js';

/**
 * Ödənişi idempotent şəkildə tamamlayır: eyni xarici ID ilə ikinci dəfə coin yazılmır.
 * İlk yükləmədə promo hədiyyə (≤300 coin), dəvət edənə promo bonus.
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
    let balance = await creditCoins(tx, p.userId, p.coins, 'PURCHASE', p.id, `${p.provider}:${p.packageId}`);
    let bonus = 0;
    if (!user.firstRechargeDone) {
      // İlk yükləmə hədiyyəsi — promo coin (məhdud), nağdlaşan almaz yaratmır
      bonus = Math.min(ECONOMY.firstRechargeBonusMax, Math.floor(p.coins * ECONOMY.firstRechargeBonusRate));
      await tx.user.update({ where: { id: p.userId }, data: { firstRechargeDone: true } });
      balance = (await creditCoins(tx, p.userId, bonus, 'FIRST_RECHARGE_BONUS', p.id, '', true)) ?? balance;
    }
    // Dəvət edən: dəvət olunanın HƏR alışından 5% promo Nar (hər alışda ən çox 500)
    if (user.referredById) {
      const ref = Math.min(ECONOMY.referralMax, Math.floor(p.coins * ECONOMY.referralShare));
      await creditCoins(tx, user.referredById, ref, 'REFERRAL', p.userId, '', true);
    }
    return { payment: p, credited: p.coins + bonus, balance, already: false };
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
