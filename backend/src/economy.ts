/**
 * Simo iqtisadiyyatı — bütün qiymətlər və nisbətlər bir yerdə. Ətraflı: /docs/ECONOMY.md
 *
 *  Nar   — istifadəçinin pulla aldığı valyuta (mesaj, zəng, hədiyyə, VIP, abunə). Nominal: 1 Nar = 1 qəpik
 *          (satış qiyməti paketdən asılı 1.09–1.99 qəpik).
 *  Promo Nar — bonuslardan gələn pulsuz Nar: birinci xərclənir, qəbul edənə Ləl YARATMIR.
 *  Ləl   — host və agentliyin qazancı. 1 Ləl = 1 qəpik (100 Ləl = 1 ₼).
 *
 *  Ödənişli 1 Nar xərcləndikdə (nominal dəyər):
 *    host       15% (sabit — agentlik böyüdükcə hostun payı AZALMIR)
 *    agentlik   15–20% (səviyyəyə görə; admin fərdi faiz təyin edə bilər) — Simo-nun payından, hostun üstünə
 *    Simo       qalan 65–70%
 *  Qazanmaq üçün host AKTİV agentliyin üzvü olmalıdır; agentliksiz qəbul edəndə 100% Simo-da qalır.
 *  Ətraflı: /docs/AGENCY_PROGRAM.md
 */
import type { VipTier, NobleTier } from './generated/prisma/client.js';

export const ECONOMY = {
  /** Qəbul edənlərin (host + agentlik) baza payı — Bürünc səviyyədə host 15% + agentlik 15% */
  receiversShare: 0.3,
  /** Hostun sabit payı (ödənişli Nar-ın nominal dəyərindən) */
  hostShare: 0.15,
  /** Agentlik komissiyasının yuxarı həddi (admin fərdi faizi bu həddi keçə bilməz) */
  maxAgencyShare: 0.3,
  /** Agentlikdən könüllü çıxdıqdan sonra başqa agentliyə qoşulmaq üçün gözləmə (gün) */
  agencyCooldownDays: 7,
  /** Zəng: bağlantı kəsilibsə neçə saniyədən sonra zəng avtomatik bitir */
  callDisconnectGraceSec: 45,
  /** Mesaj qiyməti: standart və host səviyyəsinə görə hədlər (Nar) */
  msgPrice: { min: 10, default: 30 },
  msgPriceMaxByLevel: [[0, 40], [5, 60], [10, 100], [20, 200]] as [number, number][],
  /** Gündə yeni söhbətlərdə neçə ilk mesaj ("salam") pulsuzdur */
  freeHellosPerDay: 3,
  videoCallPrice: { min: 40, max: 400, default: 80 },
  voiceCallPrice: { min: 20, max: 200, default: 40 },
  signupBonus: 30,
  checkinRewards: [3, 3, 5, 5, 8, 10, 20],
  firstRechargeBonusRate: 1,
  firstRechargeBonusMax: 300,
  /** Dəvət edən: dəvət olunanın HƏR alışından 5% promo Nar */
  referralShare: 0.05,
  referralMax: 500,
  /**
   * Almaz — qazanc və premium valyuta. 1 Almaz = 0.10 ₼ = 10 Nar dəyərində (Nar-dan 10 dəfə bahalı).
   * Daxildə balans qəpik dəyəri ilə saxlanır (dəqiqlik itməsin): 10 vahid = 1 Almaz. Ekranda vahid/10 göstərilir.
   * Almaz → Nar mübadiləsi: 1 Almaz = 10 Nar (pul tətbiqdə qalır və yenidən 70/30 bölünür)
   */
  almazUnit: 10,
  diamondsPerCoin: 1,
  diamondsPerAzn: 100,
  minWithdrawDiamonds: 5000,
  withdrawFeeRate: 0.03,
  /** Yeni qazanc 7 gün "gözləmədə" qalır (fırıldaq / geri qaytarma riski) */
  withdrawHoldDays: 7,
  /** Həftədə bir çıxarış */
  withdrawPerWeek: 1,
  freeDailyLikes: 10,
  freeDailySuperLikes: 1,
  superLikePrice: 100,
  /** "Kimi göstərək" filtri: həftədə pulsuz dəyişiklik sayı, sonra VIP və ya Nar */
  freeFilterChangesPerWeek: 2,
  filterChangePrice: 50,
  /** Private content: aylıq abunə qiyməti (Nar) */
  privatePrice: { min: 500, max: 10000, minLevel: 3 },
  /** Video / post */
  maxVideoSec: 90,
  storyHours: 24,
  /** Host olub agentliyə müraciət etmək üçün şərtlər */
  hostRequirements: { accountAgeDays: 3, chatPartners: 10, photos: 3 },
  /** PK döyüşü */
  pkDurationSec: 300,
  pkWinnerBonusPromo: 100,
} as const;

/** Agentlik səviyyələri: son 30 gündə hostların ümumi qazancına (Ləl) görə; agentlik payı artır */
export const AGENCY_TIERS = [
  { tier: 1, name: 'Bürünc', minMonthly: 0, share: 0.15 },
  { tier: 2, name: 'Gümüş', minMonthly: 100_000, share: 0.16 },
  { tier: 3, name: 'Qızıl', minMonthly: 500_000, share: 0.17 },
  { tier: 4, name: 'Platin', minMonthly: 2_000_000, share: 0.18 },
  { tier: 5, name: 'Brilyant', minMonthly: 10_000_000, share: 0.2 },
] as const;

export function agencyTier(monthlyDiamonds: number) {
  let t: (typeof AGENCY_TIERS)[number] = AGENCY_TIERS[0];
  for (const x of AGENCY_TIERS) if (monthlyDiamonds >= x.minMonthly) t = x;
  return t;
}

/** Agentliyin effektiv komissiyası: admin fərdi faizi (varsa) və ya səviyyə payı */
export function effectiveAgencyShare(tierShare: number, customShare: number | null | undefined): number {
  if (customShare == null || !Number.isFinite(customShare)) return tierShare;
  return Math.min(ECONOMY.maxAgencyShare, Math.max(0, customShare));
}

/**
 * Ödənişli Nar → host və agentlik payı (daxili Almaz vahidi = qəpik).
 * Yuvarlaqlaşdırma həmişə aşağı (floor) — qəpik qalığı platformada qalır, heç vaxt artıq ödənmir.
 */
export function splitEarnings(paidCoins: number, agencyShare: number) {
  const paid = Math.max(0, Math.floor(paidCoins));
  const host = Math.floor(paid * ECONOMY.hostShare);
  const agency = Math.floor(paid * Math.min(ECONOMY.maxAgencyShare, Math.max(0, agencyShare)));
  return { host, agency, platform: paid - host - agency };
}

/** Host hədəfləri (gündəlik): onlayn dəqiqə və zəng dəqiqəsi; həftədə neçə "aktiv gün" */
export const HOST_TARGETS = { dailyOnlineMin: 120, dailyCallMin: 30, weeklyActiveDays: 5 } as const;

/** Host səviyyəsi (cazibə): son 30 günün qazancına görə — hədəf və status üçün */
export const HOST_LEVELS = [
  { level: 1, name: 'Yeni', minMonthly: 0 },
  { level: 2, name: 'Aktiv', minMonthly: 5_000 },
  { level: 3, name: 'Ulduz', minMonthly: 30_000 },
  { level: 4, name: 'Super', minMonthly: 100_000 },
  { level: 5, name: 'Top', minMonthly: 300_000 },
] as const;

export function hostLevel(monthly: number) {
  let l: (typeof HOST_LEVELS)[number] = HOST_LEVELS[0];
  for (const x of HOST_LEVELS) if (monthly >= x.minMonthly) l = x;
  const next = HOST_LEVELS.find((x) => x.minMonthly > monthly) ?? null;
  return { ...l, next };
}

export function maxMsgPriceForLevel(level: number): number {
  let m = ECONOMY.msgPriceMaxByLevel[0][1];
  for (const [lv, max] of ECONOMY.msgPriceMaxByLevel) if (level >= lv) m = max;
  return m;
}

/** Almazın nağd dəyəri (qəpik), çıxarış haqqı çıxılmaqla */
export function withdrawQepik(diamonds: number): { gross: number; fee: number; net: number } {
  const gross = Math.floor((diamonds * 100) / ECONOMY.diamondsPerAzn);
  const fee = Math.ceil(gross * ECONOMY.withdrawFeeRate);
  return { gross, fee, net: gross - fee };
}

/** Zadəganlıq — aylıq status (100% Simo gəliri) */
export const NOBLE_PLANS: Record<Exclude<NobleTier, 'NONE'>, { tier: Exclude<NobleTier, 'NONE'>; priceCoins: number; days: number; perks: string[] }> = {
  BEY: { tier: 'BEY', priceCoins: 2000, days: 30, perks: ['frame', 'badge', 'entry'] },
  XAN: { tier: 'XAN', priceCoins: 8000, days: 30, perks: ['frame', 'badge', 'entry', 'bubble', 'mount', 'gifts'] },
  SAH: { tier: 'SAH', priceCoins: 30000, days: 30, perks: ['frame', 'badge', 'entry', 'bubble', 'mount', 'gifts', 'top', 'antikick'] },
};

export function activeNoble(u: { nobleTier: NobleTier; nobleUntil: Date | null }) {
  if (u.nobleTier === 'NONE' || !u.nobleUntil || u.nobleUntil.getTime() < Date.now()) return null;
  return NOBLE_PLANS[u.nobleTier];
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

export function todayKey(d = new Date()): string {
  // Bakı vaxtı (UTC+4)
  const baku = new Date(d.getTime() + 4 * 3600_000);
  return baku.toISOString().slice(0, 10);
}

/** Həftə açarı (Bakı vaxtı, bazar ertəsindən başlayır) */
export function weekKey(d = new Date()): string {
  const baku = new Date(d.getTime() + 4 * 3600_000);
  const day = (baku.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(baku.getUTCFullYear(), baku.getUTCMonth(), baku.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export function ageFrom(birth: Date | null | undefined): number | null {
  if (!birth) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
