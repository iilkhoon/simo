/**
 * Pul kisəsi — bütün balans dəyişiklikləri atomikdir və kitabda (ledger) qeyd olunur.
 *
 * Yarış (race) qorunması: balansı azaldan hər əməliyyat əvvəlcə istifadəçi sətrini
 * `SELECT … FOR UPDATE` ilə kilidləyir (eyni anda gələn iki sorğu növbəyə düzülür),
 * sonra şərti yeniləmə edir. Balans heç vaxt mənfi ola bilməz (DB-də CHECK constraint da var).
 */
import type { Tx } from '../db.js';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { ECONOMY, agencyTier, effectiveAgencyShare, splitEarnings } from '../economy.js';

interface LockedBalance { coins: number; promoCoins: number; diamonds: number; diamondsBought: number }

/** İstifadəçi sətrini tranzaksiyanın sonuna qədər kilidləyir və cari balansları qaytarır */
export async function lockUser(tx: Tx, userId: string): Promise<LockedBalance> {
  const rows = await tx.$queryRaw<LockedBalance[]>`SELECT "coins", "promoCoins", "diamonds", "diamondsBought" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  if (!rows.length) throw err.notFound('USER_NOT_FOUND');
  return rows[0];
}

/**
 * Coin xərcləyir. Promo (pulsuz) coinlər birinci xərclənir.
 * Qaytarır: yeni balans və ödənişli hissə (`paid`) — qəbul edənə almaz yalnız ödənişli hissədən yazılır.
 */
export async function spend(tx: Tx, userId: string, amount: number, type: string, refId?: string, note = '') {
  if (!Number.isInteger(amount) || amount < 0) throw err.badRequest('INVALID_AMOUNT');
  if (amount === 0) return { balance: null as number | null, paid: 0 };
  const before = await lockUser(tx, userId);
  if (before.coins < amount) throw err.insufficient(amount);
  // promoCoins heç vaxt coins-dən çox ola bilməz — köhnə uyğunsuz sətirlərdə də düzgün hesablansın
  const promoAvail = Math.max(0, Math.min(before.promoCoins, before.coins));
  const fromPromo = Math.min(promoAvail, amount);
  const promoAfter = Math.max(0, Math.min(before.promoCoins - fromPromo, before.coins - amount));
  const u = await tx.user.update({
    where: { id: userId },
    data: { coins: { decrement: amount }, promoCoins: promoAfter, totalSpent: { increment: amount } },
    select: { coins: true },
  });
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
  if (!Number.isInteger(amount) || amount <= 0) return null;
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

/** Almaz yazır (qazanc, qaytarma). Kitabda qeyd olunur. */
export async function creditDiamonds(tx: Tx, userId: string, amount: number, type: string, refId?: string, note = '', countEarned = false) {
  if (!Number.isInteger(amount) || amount <= 0) return null;
  const u = await tx.user.update({
    where: { id: userId },
    data: { diamonds: { increment: amount }, ...(countEarned ? { totalEarned: { increment: amount } } : {}) },
    select: { diamonds: true },
  });
  await tx.walletTransaction.create({ data: { userId, currency: 'DIAMOND', amount, balanceAfter: u.diamonds, type, refId, note } });
  return u.diamonds;
}

/**
 * Almaz xərcləyir. `earnedOnly` — yalnız qazanılmış Almaz (çıxarış): alınmış hissəyə toxunulmur.
 * Əks halda (hədiyyə, mübadilə) alınmış Almaz birinci xərclənir.
 */
export async function spendDiamonds(tx: Tx, userId: string, amount: number, type: string, refId?: string, earnedOnly = false) {
  if (!Number.isInteger(amount) || amount <= 0) throw err.badRequest('INVALID_AMOUNT');
  const before = await lockUser(tx, userId);
  const bought = Math.max(0, Math.min(before.diamondsBought, before.diamonds));
  if (before.diamonds < amount) throw err.badRequest('INSUFFICIENT_DIAMONDS');
  if (earnedOnly && before.diamonds - bought < amount) throw err.badRequest('INSUFFICIENT_DIAMONDS');
  const fromBought = earnedOnly ? 0 : Math.min(bought, amount);
  const boughtAfter = Math.max(0, Math.min(before.diamondsBought - fromBought, before.diamonds - amount));
  const u = await tx.user.update({
    where: { id: userId },
    data: { diamonds: { decrement: amount }, diamondsBought: boughtAfter },
    select: { diamonds: true },
  });
  await tx.walletTransaction.create({
    data: { userId, currency: 'DIAMOND', amount: -amount, balanceAfter: u.diamonds, type, refId, note: fromBought ? `bought:${fromBought}` : '' },
  });
  return { balance: u.diamonds, fromBought };
}

/**
 * Agentliyin son 30 gündə yaratdığı qazanc (host payı + komissiya, daxili vahid) — səviyyəni təyin edir.
 * Yalnız bu agentlikdə olarkən qazanılan hadisələr sayılır (host başqa agentlikdən gələndə köhnə qazancı sayılmır).
 */
export async function agencyMonthly(tx: Tx, agencyId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 86400_000);
  const r = await tx.hostEarning.aggregate({ where: { agencyId, createdAt: { gte: since } }, _sum: { hostAmount: true, agencyAmount: true } });
  return (r._sum.hostAmount ?? 0) + (r._sum.agencyAmount ?? 0);
}

/** Səviyyə hesabı hər qazanc hadisəsində bahalıdır — 5 dəqiqəlik keş */
const tierCache = new Map<string, { monthly: number; at: number }>();
const TIER_TTL = 5 * 60_000;
export async function agencyMonthlyCached(tx: Tx, agencyId: string): Promise<number> {
  const c = tierCache.get(agencyId);
  if (c && Date.now() - c.at < TIER_TTL) return c.monthly;
  const monthly = await agencyMonthly(tx, agencyId);
  tierCache.set(agencyId, { monthly, at: Date.now() });
  return monthly;
}
export function clearTierCache(agencyId?: string) {
  if (agencyId) tierCache.delete(agencyId);
  else tierCache.clear();
}

/** Agentliyin cari səviyyəsi və effektiv komissiyası */
export async function agencyTerms(tx: Tx, agency: { id: string; customShare: number | null }, cached = false) {
  const monthly = cached ? await agencyMonthlyCached(tx, agency.id) : await agencyMonthly(tx, agency.id);
  const tier = agencyTier(monthly);
  const share = effectiveAgencyShare(tier.share, agency.customShare);
  return { monthly, tier, share, hostShare: ECONOMY.hostShare, custom: agency.customShare != null };
}

export const EARN_TYPES = ['GIFT_RECEIVED', 'MESSAGE_EARNED', 'CALL_EARNED', 'SUBSCRIPTION_EARNED', 'SERVICE_EARNED'];

const SOURCE_BY_TYPE: Record<string, string> = {
  GIFT_RECEIVED: 'GIFT', MESSAGE_EARNED: 'MESSAGE', CALL_EARNED: 'CALL', SUBSCRIPTION_EARNED: 'SUBSCRIPTION', SERVICE_EARNED: 'SERVICE',
};

/**
 * Ödənişli Nar (və ya Almaz) xərcləndikdə: host sabit 15%, agentlik səviyyəyə görə 15–20% (Simo-nun payından),
 * qalan Simo-da. Qəbul edən aktiv agentlikdə deyilsə — Almaz yazılmır.
 * Hər hadisə HostEarning cədvəlində qeyd olunur (agentlik paneli, səviyyə, həftəlik hesabat).
 * Qaytarır: hosta yazılan Almaz (daxili vahidlə).
 */
export async function rewardReceiver(tx: Tx, receiverId: string, paidCoins: number, type: string, refId?: string) {
  if (!(paidCoins > 0)) return 0;
  const r = await tx.user.findUnique({ where: { id: receiverId }, select: { agencyId: true, banned: true, deletedAt: true } });
  if (!r?.agencyId || r.banned || r.deletedAt) return 0;
  const agency = await tx.agency.findUnique({ where: { id: r.agencyId }, select: { id: true, ownerId: true, status: true, customShare: true } });
  if (!agency || agency.status !== 'ACTIVE') return 0;
  const terms = await agencyTerms(tx, agency, true);
  const split = splitEarnings(paidCoins, terms.share);
  const ownerIsHost = agency.ownerId === receiverId;
  // Agentlik sahibi özü host kimi qazanırsa — hər iki pay ona
  const hostAmount = ownerIsHost ? split.host + split.agency : split.host;
  if (hostAmount <= 0 && split.agency <= 0) return 0;
  if (hostAmount > 0) await creditDiamonds(tx, receiverId, hostAmount, type, refId, '', true);
  if (!ownerIsHost && split.agency > 0) {
    await creditDiamonds(tx, agency.ownerId, split.agency, 'AGENCY_COMMISSION', refId, `host:${receiverId} tier:${terms.tier.tier}${terms.custom ? ' custom' : ''}`);
  }
  await tx.hostEarning.create({
    data: { hostId: receiverId, agencyId: agency.id, source: SOURCE_BY_TYPE[type] ?? type, paidCoins: Math.floor(paidCoins), hostAmount: split.host, agencyAmount: split.agency, refId },
  });
  await tx.agency.update({ where: { id: agency.id }, data: { totalDiamonds: { increment: split.host + split.agency } } });
  return hostAmount;
}

/** Son N gündə qazanılan (hələ çıxarıla bilməyən) Almaz — geri qaytarma/fırıldaq riskinə qarşı gözləmə */
export async function heldDiamonds(userId: string, tx: Tx = prisma): Promise<number> {
  const since = new Date(Date.now() - ECONOMY.withdrawHoldDays * 86400_000);
  const r = await tx.walletTransaction.aggregate({
    where: { userId, currency: 'DIAMOND', amount: { gt: 0 }, type: { in: [...EARN_TYPES, 'AGENCY_COMMISSION'] }, createdAt: { gte: since } },
    _sum: { amount: true },
  });
  return r._sum.amount ?? 0;
}
