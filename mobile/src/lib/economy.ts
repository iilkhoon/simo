/** Backend `src/economy.ts` ilə eyni nisbətlər (göstərmək üçün; hesablamanı server edir) */
export const ECON = {
  /** Almaz: 1 Almaz = 0.10 ₼ = 10 Nar. Server balansı daxili vahidlə verir: 10 vahid = 1 Almaz */
  almazUnit: 10,
  diamondsPerCoin: 1,
  /** 100 vahid (10 Almaz) = 1 ₼ */
  diamondsPerAzn: 100,
  minWithdrawDiamonds: 5000,
  withdrawFeeRate: 0.03,
  withdrawHoldDays: 7,
  firstRechargeBonusRate: 1,
  firstRechargeBonusMax: 300,
  /** Simo 70%, host + agentlik 30% */
  receiversShare: 0.3,
  superLikePrice: 100,
  filterChangePrice: 50,
  freeHellosPerDay: 3,
  privatePrice: { min: 500, max: 10000, minLevel: 3 },
  msgPrice: { min: 10, default: 30 },
  maxVideoSec: 90,
};

/** Daxili vahid → Almaz (ekranda göstərmək üçün): 125 → "12.5", 5000 → "500" */
export function fmtAlmaz(units: number): string {
  const a = units / ECON.almazUnit;
  if (a >= 100_000) return a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : `${Math.round(a / 1000)}K`;
  return a.toLocaleString('en-US', { maximumFractionDigits: 1 });
}
/** İstifadəçinin yazdığı Almaz → daxili vahid */
export const almazToUnits = (almaz: number) => Math.round(almaz * ECON.almazUnit);

/** Almazın nağd dəyəri (₼, daxili vahiddən), xidmət haqqı çıxılmaqla */
export function diamondsToAzn(d: number, afterFee = true): number {
  const gross = Math.floor((d * 100) / ECON.diamondsPerAzn);
  const net = afterFee ? gross - Math.ceil(gross * ECON.withdrawFeeRate) : gross;
  return net / 100;
}

export const firstBonus = (coins: number) => Math.min(ECON.firstRechargeBonusMax, Math.floor(coins * ECON.firstRechargeBonusRate));
