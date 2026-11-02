/**
 * Simo iqtisadiyyatı — bütün qiymətlər və nisbətlər bir yerdə. Ətraflı hesablama: /docs/ECONOMY.md
 *
 *  Simo Coin  — istifadəçinin pulla aldığı valyuta (mesaj, zəng, hədiyyə, VIP).
 *               1 coin ≈ 1.09–1.99 qəpik (paketdən asılı).
 *  Promo coin — bonuslardan gələn pulsuz coin (qeydiyyat, gündəlik bonus, dəvət, ilk yükləmə hədiyyəsi).
 *               Xərclənə bilər, amma qəbul edənə NAĞDLAŞAN ALMAZ VERMİR (fırıldağa qarşı) və həmişə birinci xərclənir.
 *  Simo Almaz — qəbul edənin qazandığı valyuta. 200 almaz = 1 ₼ (1 almaz = 0.5 qəpik).
 *
 *  Pul axını (1 ödənişli coin xərcləndikdə):
 *    host:      0.5 almaz = 0.25 qəpik
 *    agentlik:  hostun almazının 10%-i (platforma payından) = 0.025 qəpik
 *    platforma: qalan hissə — mağaza komissiyasından (15–30%) sonra belə ödənişin ~60–85%-i
 */
import type { VipTier } from './generated/prisma/client.js';

export const ECONOMY = {
  /** Qəbul edənin ödənişli coin dəyərindən aldığı pay (almaz şəklində) */
  hostShare: 0.5,
  /** Agentliyə platformanın payından ödənilən komissiya (hostun qazandığı almazın %-i) */
  defaultAgencyCommission: 0.1,
  /** Təsdiqlənmiş hosta (qıza) göndərilən hər mesajın qiyməti */
  messagePrice: 10,
  /** Yeni söhbətdə ilk mesaj pulsuzdur (buz qırıcı) */
  firstMessageFree: true,
  videoCallPrice: { min: 40, max: 400, default: 80 },
  voiceCallPrice: { min: 20, max: 200, default: 40 },
  /** Qeydiyyat bonusu (promo) */
  signupBonus: 30,
  /** 7 günlük giriş bonusu dövrü (promo) */
  checkinRewards: [3, 3, 5, 5, 8, 10, 20],
  /** İlk yükləmə hədiyyəsi: alınan coinlərin 100%-i qədər, ən çox 300 promo coin */
  firstRechargeBonusRate: 1,
  firstRechargeBonusMax: 300,
  /** Dəvət edən şəxs dəvət olunanın ilk alışından bu payı promo coin kimi alır (ən çox 200) */
  referralShare: 0.1,
  referralMax: 200,
  /** Almaz → coin mübadiləsi: 3 almaz = 1 coin (nağdlaşdırmadan bir az sərfəli deyil — pul platformada qalır) */
  diamondsPerCoin: 3,
  /** Nağdlaşdırma: 200 almaz = 1 ₼ → 1 almaz = 0.5 qəpik */
  diamondsPerAzn: 200,
  minWithdrawDiamonds: 10000,
  /** Çıxarış xidmət haqqı (bank/köçürmə xərcini örtür) */
  withdrawFeeRate: 0.03,
  freeDailyLikes: 50,
  freeDailySuperLikes: 1,
} as const;

/** Almazın nağd dəyəri (qəpik), çıxarış haqqı çıxılmaqla */
export function withdrawQepik(diamonds: number): { gross: number; fee: number; net: number } {
  const gross = Math.floor((diamonds * 100) / ECONOMY.diamondsPerAzn);
  const fee = Math.ceil(gross * ECONOMY.withdrawFeeRate);
  return { gross, fee, net: gross - fee };
}

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
