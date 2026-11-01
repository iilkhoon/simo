/**
 * Simo iqtisadiyyatı — bütün qiymətlər və nisbətlər bir yerdə.
 *
 *  Simo Coin  — istifadəçinin pulla aldığı valyuta (mesaj, zəng, hədiyyə, VIP).
 *  Simo Almaz — qəbul edənin qazandığı valyuta (nağd pula çevrilir və ya coinə dəyişilir).
 *
 *  1 coin ≈ 0.02 ₼ (paketdən asılı), 100 almaz = 1 ₼ nağdlaşdırma.
 */
import type { VipTier } from './generated/prisma/client.js';

export const ECONOMY = {
  /** Qəbul edənin coin dəyərindən aldığı pay (almaz şəklində) */
  hostShare: 0.6,
  /** Agentliyə platformanın payından ödənilən komissiya (hostun qazandığı almazın %-i) */
  defaultAgencyCommission: 0.1,
  /** Təsdiqlənmiş hosta (qıza) göndərilən hər mesajın qiyməti */
  messagePrice: 10,
  /** Yeni söhbətdə ilk mesaj pulsuzdur (buz qırıcı) */
  firstMessageFree: true,
  videoCallPrice: { min: 30, max: 300, default: 60 },
  voiceCallPrice: { min: 15, max: 150, default: 30 },
  /** Qeydiyyat bonusu */
  signupBonus: 50,
  /** 7 günlük giriş bonusu dövrü */
  checkinRewards: [5, 5, 10, 10, 15, 20, 50],
  /** İlk yükləmədə coin ×2 */
  firstRechargeMultiplier: 2,
  /** Dəvət edən şəxs, dəvət olunanın ilk alışından bu payı alır */
  referralShare: 0.1,
  /** Almaz → coin mübadiləsi: 2 almaz = 1 coin */
  diamondsPerCoin: 2,
  /** Nağdlaşdırma: 100 almaz = 1 ₼ (100 qəpik) → 1 almaz = 1 qəpik */
  qepikPerDiamond: 1,
  minWithdrawDiamonds: 5000,
  freeDailyLikes: 50,
  freeDailySuperLikes: 1,
} as const;

export interface VipPlan {
  tier: Exclude<VipTier, 'NONE'>;
  priceCoins: number;
  days: number;
  freeMessagesPerDay: number;
  callDiscount: number;
  superLikesPerDay: number;
  seeLikes: boolean;
  seeVisitors: boolean;
  incognito: boolean;
  discoveryBoost: number;
  entryEffect: boolean;
}

export const VIP_PLANS: Record<Exclude<VipTier, 'NONE'>, VipPlan> = {
  SILVER: {
    tier: 'SILVER', priceCoins: 500, days: 30, freeMessagesPerDay: 10, callDiscount: 0.05,
    superLikesPerDay: 3, seeLikes: false, seeVisitors: true, incognito: false, discoveryBoost: 1.1, entryEffect: false,
  },
  GOLD: {
    tier: 'GOLD', priceCoins: 1200, days: 30, freeMessagesPerDay: 30, callDiscount: 0.1,
    superLikesPerDay: 5, seeLikes: true, seeVisitors: true, incognito: true, discoveryBoost: 1.25, entryEffect: false,
  },
  DIAMOND: {
    tier: 'DIAMOND', priceCoins: 3000, days: 30, freeMessagesPerDay: 100, callDiscount: 0.2,
    superLikesPerDay: 10, seeLikes: true, seeVisitors: true, incognito: true, discoveryBoost: 1.5, entryEffect: true,
  },
};

const VIP_ORDER: VipTier[] = ['NONE', 'SILVER', 'GOLD', 'DIAMOND'];

export function activeVip(user: { vipTier: VipTier; vipUntil: Date | null }): VipPlan | null {
  if (user.vipTier === 'NONE' || !user.vipUntil || user.vipUntil.getTime() < Date.now()) return null;
  return VIP_PLANS[user.vipTier];
}

export function vipRank(tier: VipTier): number {
  return VIP_ORDER.indexOf(tier);
}

/** Səviyyə: XP-dən 0..99 arası (sərvət = xərclənən coin, cazibə = qazanılan almaz) */
export function levelFromXp(xp: number): number {
  return Math.min(99, Math.floor(Math.sqrt(Math.max(0, xp) / 50)));
}

export function xpForLevel(level: number): number {
  return level * level * 50;
}

export function hostDiamonds(coins: number): number {
  return Math.floor(coins * ECONOMY.hostShare);
}

export function todayKey(d = new Date()): string {
  // Bakı vaxtı (UTC+4)
  const baku = new Date(d.getTime() + 4 * 3600_000);
  return baku.toISOString().slice(0, 10);
}

export function ageFrom(birth: Date | null | undefined): number | null {
  if (!birth) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
