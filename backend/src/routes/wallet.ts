import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { ECONOMY, NOBLE_PLANS, VIP_PLANS, activeNoble, activeVip, todayKey, vipRank, withdrawQepik } from '../economy.js';
import { EARN_TYPES, creditCoins, spendCoins, spendDiamonds } from '../services/wallet.js';
import { presentMe } from './users.js';
import { vipDiscount } from '../services/smart.js';
import { optionalUid } from '../lib/auth.js';

/** Son N gündə qazanılan (hələ çıxarıla bilməyən) Ləl */
export async function heldDiamonds(userId: string): Promise<number> {
  const since = new Date(Date.now() - ECONOMY.withdrawHoldDays * 86400_000);
  const r = await prisma.walletTransaction.aggregate({ where: { userId, currency: 'DIAMOND', amount: { gt: 0 }, type: { in: [...EARN_TYPES, 'AGENCY_COMMISSION'] }, createdAt: { gte: since } }, _sum: { amount: true } });
  return r._sum.amount ?? 0;
}

export default async function walletRoutes(app: FastifyInstance) {
  app.get('/wallet/packages', async () => {
    const items = await prisma.coinPackage.findMany({ where: { active: true }, orderBy: { sort: 'asc' } });
    return { items, firstRechargeBonus: { rate: ECONOMY.firstRechargeBonusRate, max: ECONOMY.firstRechargeBonusMax } };
  });

  app.get('/wallet', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const [user, history, packages] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: me }, select: { coins: true, promoCoins: true, diamonds: true, diamondsBought: true, firstRechargeDone: true, hostStatus: true } }),
      prisma.walletTransaction.findMany({ where: { userId: me }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.coinPackage.findMany({ where: { active: true }, orderBy: { sort: 'asc' } }),
    ]);
    const held = await heldDiamonds(me);
    return {
      ...user,
      history,
      packages: packages.filter((p) => p.currency === 'COIN'),
      almazPackages: packages.filter((p) => p.currency === 'DIAMOND'),
      held,
      /** Nağdlaşa bilən Almaz (daxili vahid): qazanılmış − gözləmədə */
      withdrawable: Math.max(0, user.diamonds - user.diamondsBought - held),
      rates: {
        almazUnit: ECONOMY.almazUnit,
        diamondsPerCoin: ECONOMY.diamondsPerCoin,
        diamondsPerAzn: ECONOMY.diamondsPerAzn,
        qepikPerDiamond: 100 / ECONOMY.diamondsPerAzn,
        minWithdrawDiamonds: ECONOMY.minWithdrawDiamonds,
        withdrawFeeRate: ECONOMY.withdrawFeeRate,
        firstRechargeBonus: { rate: ECONOMY.firstRechargeBonusRate, max: ECONOMY.firstRechargeBonusMax },
      },
    };
  });

  app.post('/wallet/exchange', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ diamonds: z.number().int().min(ECONOMY.diamondsPerCoin) }).parse(req.body);
    const diamonds = b.diamonds - (b.diamonds % ECONOMY.diamondsPerCoin);
    const coins = diamonds / ECONOMY.diamondsPerCoin;
    await prisma.$transaction(async (tx) => {
      await spendDiamonds(tx, me, diamonds, 'EXCHANGE');
      await creditCoins(tx, me, coins, 'EXCHANGE');
    });
    return presentMe(me);
  });

  app.post('/wallet/withdraw', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z
      .object({
        diamonds: z.number().int().min(ECONOMY.minWithdrawDiamonds),
        method: z.enum(['CARD', 'M10', 'EMANAT', 'AGENCY']),
        account: z.string().trim().min(4).max(64),
      })
      .parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me } });
    const ownsAgency = await prisma.agency.count({ where: { ownerId: me, status: 'ACTIVE' } });
    if (user.hostStatus !== 'APPROVED' && !user.agencyId && !ownsAgency) throw err.forbidden('HOST_REQUIRED');
    if (user.kycStatus !== 'APPROVED') throw err.forbidden('KYC_REQUIRED');
    const pending = await prisma.withdrawal.count({ where: { userId: me, status: 'PENDING' } });
    if (pending > 0) throw err.badRequest('WITHDRAW_PENDING');
    // Həftədə bir çıxarış
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const recent = await prisma.withdrawal.count({ where: { userId: me, createdAt: { gte: weekAgo }, status: { not: 'REJECTED' } } });
    if (recent >= ECONOMY.withdrawPerWeek) throw err.badRequest('WITHDRAW_WEEKLY_LIMIT');
    // Son 7 günün qazancı gözləmədədir
    const held = await heldDiamonds(me);
    // Nağdlaşan: qazanılmış Almaz (alınmış Almaz çıxmır) − son 7 günün gözləmədəki qazancı
    const earned = Math.max(0, user.diamonds - user.diamondsBought);
    if (b.diamonds > Math.max(0, earned - held)) throw err.badRequest('WITHDRAW_HELD', { available: Math.max(0, earned - held), held });
    const w = await prisma.$transaction(async (tx) => {
      const row = await tx.withdrawal.create({
        data: { userId: me, diamonds: b.diamonds, amountQepik: withdrawQepik(b.diamonds).net, method: b.method, account: b.account, note: `fee:${withdrawQepik(b.diamonds).fee}` },
      });
      await spendDiamonds(tx, me, b.diamonds, 'WITHDRAW', row.id, true);
      return row;
    });
    return { withdrawal: w };
  });

  app.get('/wallet/withdrawals', { preHandler: requireAuth }, async (req) => {
    const items = await prisma.withdrawal.findMany({ where: { userId: uid(req) }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { items };
  });

  app.get('/vip/plans', async (req) => {
    // Daxil olmuş istifadəçiyə fərdi endirim də göstərilir
    let pct = 0;
    const who = optionalUid(req);
    if (who) pct = (await vipDiscount(who))?.pct ?? 0;
    return { plans: Object.values(VIP_PLANS).map((p) => ({ ...p, discountPct: pct, finalPrice: pct ? Math.round(p.priceCoins * (1 - pct / 100)) : p.priceCoins })) };
  });

  app.post('/vip/buy', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ tier: z.enum(['SILVER', 'GOLD', 'DIAMOND']) }).parse(req.body);
    const plan = VIP_PLANS[b.tier];
    // Fərdi endirim (alqoritmin təklifi): VIP_TRIAL / VIP_RENEW
    const disc = await vipDiscount(me);
    const price = disc ? Math.round(plan.priceCoins * (1 - disc.pct / 100)) : plan.priceCoins;
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: me } });
      const current = activeVip(user);
      await spendCoins(tx, me, price, 'VIP_PURCHASE', plan.tier, disc ? `offer:${disc.pct}%` : '');
      if (disc) await tx.offer.update({ where: { id: disc.id }, data: { usedAt: new Date() } });
      // Eyni səviyyə uzadılır; yüksəltmədə yeni müddət bu gündən başlayır
      const base = current && vipRank(current.tier) === vipRank(plan.tier) && user.vipUntil ? user.vipUntil : new Date();
      const tier = current && vipRank(current.tier) > vipRank(plan.tier) ? current.tier : plan.tier;
      await tx.user.update({ where: { id: me }, data: { vipTier: tier, vipUntil: new Date(base.getTime() + plan.days * 86400_000) } });
    });
    return presentMe(me);
  });

  /** Gündəlik giriş bonusu: 7 günlük dövr, bir gün buraxılsa sıfırlanır */
  app.get('/noble/plans', async () => ({ plans: Object.values(NOBLE_PLANS) }));

  /** Zadəganlıq statusu: Bəy / Xan / Şah — aylıq (eyni rütbə uzadılır, yüksəyə keçid dərhal) */
  app.post('/noble/buy', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ tier: z.enum(['BEY', 'XAN', 'SAH']) }).parse(req.body);
    const plan = NOBLE_PLANS[b.tier];
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUniqueOrThrow({ where: { id: me } });
      const cur = activeNoble(u);
      const order = ['NONE', 'BEY', 'XAN', 'SAH'];
      if (cur && order.indexOf(cur.tier) > order.indexOf(b.tier)) throw err.badRequest('LOWER_TIER');
      await spendCoins(tx, me, plan.priceCoins, 'NOBLE_PURCHASE', plan.tier);
      const base = cur && cur.tier === b.tier && u.nobleUntil ? u.nobleUntil.getTime() : Date.now();
      await tx.user.update({ where: { id: me }, data: { nobleTier: b.tier, nobleUntil: new Date(base + plan.days * 86400_000) } });
    });
    return presentMe(me);
  });

  app.post('/rewards/checkin', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const reward = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUniqueOrThrow({ where: { id: me } });
      const today = todayKey();
      if (u.lastCheckinAt && todayKey(u.lastCheckinAt) === today) throw err.badRequest('ALREADY_CHECKED_IN');
      const yesterday = todayKey(new Date(Date.now() - 86400_000));
      const streak = u.lastCheckinAt && todayKey(u.lastCheckinAt) === yesterday ? u.checkinStreak + 1 : 1;
      const amount = ECONOMY.checkinRewards[(streak - 1) % ECONOMY.checkinRewards.length];
      const res = await tx.user.updateMany({
        where: { id: me, lastCheckinAt: u.lastCheckinAt },
        data: { checkinStreak: streak, lastCheckinAt: new Date() },
      });
      if (res.count === 0) throw err.badRequest('ALREADY_CHECKED_IN');
      await creditCoins(tx, me, amount, 'CHECKIN', String(streak), '', true);
      return { amount, streak };
    });
    return { ...reward, me: await presentMe(me) };
  });
}
