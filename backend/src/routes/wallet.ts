import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { ECONOMY, VIP_PLANS, activeVip, todayKey, vipRank, withdrawQepik } from '../economy.js';
import { creditCoins, spendCoins, spendDiamonds } from '../services/wallet.js';
import { presentMe } from './users.js';

export default async function walletRoutes(app: FastifyInstance) {
  app.get('/wallet/packages', async () => {
    const items = await prisma.coinPackage.findMany({ where: { active: true }, orderBy: { sort: 'asc' } });
    return { items, firstRechargeBonus: { rate: ECONOMY.firstRechargeBonusRate, max: ECONOMY.firstRechargeBonusMax } };
  });

  app.get('/wallet', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const [user, history, packages] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: me }, select: { coins: true, promoCoins: true, diamonds: true, firstRechargeDone: true, hostStatus: true } }),
      prisma.walletTransaction.findMany({ where: { userId: me }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.coinPackage.findMany({ where: { active: true }, orderBy: { sort: 'asc' } }),
    ]);
    return {
      ...user,
      history,
      packages,
      rates: {
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
    if (user.hostStatus !== 'APPROVED' && !user.agencyId) throw err.forbidden('HOST_REQUIRED');
    const pending = await prisma.withdrawal.count({ where: { userId: me, status: 'PENDING' } });
    if (pending > 0) throw err.badRequest('WITHDRAW_PENDING');
    const w = await prisma.$transaction(async (tx) => {
      const row = await tx.withdrawal.create({
        data: { userId: me, diamonds: b.diamonds, amountQepik: withdrawQepik(b.diamonds).net, method: b.method, account: b.account, note: `fee:${withdrawQepik(b.diamonds).fee}` },
      });
      await spendDiamonds(tx, me, b.diamonds, 'WITHDRAW', row.id);
      return row;
    });
    return { withdrawal: w };
  });

  app.get('/wallet/withdrawals', { preHandler: requireAuth }, async (req) => {
    const items = await prisma.withdrawal.findMany({ where: { userId: uid(req) }, orderBy: { createdAt: 'desc' }, take: 50 });
    return { items };
  });

  app.get('/vip/plans', async () => ({ plans: Object.values(VIP_PLANS) }));

  app.post('/vip/buy', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const b = z.object({ tier: z.enum(['SILVER', 'GOLD', 'DIAMOND']) }).parse(req.body);
    const plan = VIP_PLANS[b.tier];
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: me } });
      const current = activeVip(user);
      await spendCoins(tx, me, plan.priceCoins, 'VIP_PURCHASE', plan.tier);
      // Eyni səviyyə uzadılır; yüksəltmədə yeni müddət bu gündən başlayır
      const base = current && vipRank(current.tier) === vipRank(plan.tier) && user.vipUntil ? user.vipUntil : new Date();
      const tier = current && vipRank(current.tier) > vipRank(plan.tier) ? current.tier : plan.tier;
      await tx.user.update({ where: { id: me }, data: { vipTier: tier, vipUntil: new Date(base.getTime() + plan.days * 86400_000) } });
    });
    return presentMe(me);
  });

  /** Gündəlik giriş bonusu: 7 günlük dövr, bir gün buraxılsa sıfırlanır */
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
