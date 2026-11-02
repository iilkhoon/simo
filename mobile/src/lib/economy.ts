/** Backend `src/economy.ts` ilə eyni nisbətlər (göstərmək üçün; hesablamanı server edir) */
export const ECON = {
  diamondsPerCoin: 3,
  diamondsPerAzn: 200,
  minWithdrawDiamonds: 10000,
  withdrawFeeRate: 0.03,
  firstRechargeBonusRate: 1,
  firstRechargeBonusMax: 300,
};

/** Almazın nağd dəyəri (₼), xidmət haqqı çıxılmaqla */
export function diamondsToAzn(d: number, afterFee = true): number {
  const gross = Math.floor((d * 100) / ECON.diamondsPerAzn);
  const net = afterFee ? gross - Math.ceil(gross * ECON.withdrawFeeRate) : gross;
  return net / 100;
}

export const firstBonus = (coins: number) => Math.min(ECON.firstRechargeBonusMax, Math.floor(coins * ECON.firstRechargeBonusRate));
