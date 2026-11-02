/** Backend `src/economy.ts` ilə eyni nisbətlər (göstərmək üçün; hesablamanı server edir) */
export const ECON = {
  /** Ləl → Nar mübadiləsi 1:1 */
  diamondsPerCoin: 1,
  /** 100 Ləl = 1 ₼ */
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

/** Ləlin nağd dəyəri (₼), xidmət haqqı çıxılmaqla */
export function diamondsToAzn(d: number, afterFee = true): number {
  const gross = Math.floor((d * 100) / ECON.diamondsPerAzn);
  const net = afterFee ? gross - Math.ceil(gross * ECON.withdrawFeeRate) : gross;
  return net / 100;
}

export const firstBonus = (coins: number) => Math.min(ECON.firstRechargeBonusMax, Math.floor(coins * ECON.firstRechargeBonusRate));
