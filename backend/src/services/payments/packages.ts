import type { Tx } from '../../db.js';
import { prisma } from '../../db.js';
import { ECONOMY } from '../../economy.js';
import { creditCoins } from '../wallet.js';
import { offerBonusFor } from '../smart.js';
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
    const pkg = await tx.coinPackage.findUnique({ where: { id: p.packageId } });
    if (pkg?.currency === 'DIAMOND') {
      // Almaz paketi: alınmış Almaz yalnız Almaz hədiyyələrinə xərclənir, nağdlaşmır (diamondsBought)
      const d = await tx.user.update({ where: { id: p.userId }, data: { diamonds: { increment: p.coins }, diamondsBought: { increment: p.coins } }, select: { diamonds: true } });
      await tx.walletTransaction.create({ data: { userId: p.userId, currency: 'DIAMOND', amount: p.coins, balanceAfter: d.diamonds, type: 'PURCHASE', refId: p.id, note: `${p.provider}:${p.packageId}` } });
      return { payment: p, credited: 0, diamonds: p.coins, balance: null, already: false };
    }
    let balance = await creditCoins(tx, p.userId, p.coins, 'PURCHASE', p.id, `${p.provider}:${p.packageId}`);
    let bonus = 0;
    // Fərdi təklif (alqoritmin verdiyi bonus) — promo Nar
    const offer = await offerBonusFor(p.userId, p.packageId, p.coins);
    if (offer && offer.bonus > 0) {
      const used = await tx.offer.updateMany({ where: { id: offer.id, usedAt: null }, data: { usedAt: new Date() } });
      if (used.count) { balance = (await creditCoins(tx, p.userId, offer.bonus, 'OFFER_BONUS', offer.id, '', true)) ?? balance; bonus += offer.bonus; }
    }
    if (!user.firstRechargeDone) {
      // İlk yükləmə hədiyyəsi — promo coin (məhdud), nağdlaşan almaz yaratmır
      const first = Math.min(ECONOMY.firstRechargeBonusMax, Math.floor(p.coins * ECONOMY.firstRechargeBonusRate));
      bonus += first;
      await tx.user.update({ where: { id: p.userId }, data: { firstRechargeDone: true } });
      balance = (await creditCoins(tx, p.userId, first, 'FIRST_RECHARGE_BONUS', p.id, '', true)) ?? balance;
    }
    // Dəvət edən: dəvət olunanın HƏR alışından 5% promo Nar (hər alışda ən çox 500)
    if (user.referredById) {
      const ref = Math.min(ECONOMY.referralMax, Math.floor(p.coins * ECONOMY.referralShare));
      await creditCoins(tx, user.referredById, ref, 'REFERRAL', p.userId, '', true);
    }
    return { payment: p, credited: p.coins + bonus, balance, already: false };
  });
  if (!result.already) {
    if ('diamonds' in result && result.diamonds) {
      emitToUser(result.payment.userId, 'wallet:update', { diamondsCredited: result.diamonds });
    } else {
      emitToUser(result.payment.userId, 'wallet:update', { coins: result.balance, credited: result.credited });
      void notify(result.payment.userId, 'gift', { store: false, body: `+${result.credited} Nar` }).catch(() => {});
    }
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
