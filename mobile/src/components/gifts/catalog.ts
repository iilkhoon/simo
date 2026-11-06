/**
 * Hədiyyə effektləri kataloqu — hər hədiyyə öz animasiyasını, müddətini və təqdimat səviyyəsini elan edir.
 *
 * Səviyyələr (TikTok / Bigo üslubu):
 *  SMALL  → soldakı kombo-banner + banner yanında kiçik, ekranı bağlamayan öz effekti
 *  BIG    → banner + mərkəzdə orta ölçülü animasiya (~3 san)
 *  LUXURY → banner + bütün ekranı tutan animasiya (4–6 san) və yuxarıda göndərən lövhəsi
 *
 * Qiymət/ad/səviyyə serverdən gəlir (backend/prisma/seed.ts); burada yalnız vizual davranış var.
 * Naməlum hədiyyə id-si gələrsə səviyyəyə uyğun ümumi effekt oynanır.
 */
import type { Gift } from '../../lib/types';

export type FxKind =
  // kiçik (banner yanında)
  | 'petals' | 'heartPop' | 'steam' | 'kissFly' | 'seedBurst' | 'sugarHop' | 'chocoZigzag' | 'miniSpark'
  // orta (mərkəz)
  | 'butaSpin' | 'teddyDrop' | 'bouquetBloom' | 'tarMusic' | 'perfumeMist' | 'champagnePop' | 'ringReveal' | 'fireworksShow' | 'crystalHeart' | 'bigPop'
  // tam ekran
  | 'crownDescend' | 'caspianSunset' | 'towerRise' | 'flameTowers' | 'carDrive' | 'rocketLaunch' | 'yachtSail' | 'palaceRise' | 'planetOrbit'
  | 'diamondRing' | 'carpetFly' | 'jetFly' | 'luxPop';

export type Tier = Gift['tier'];

export interface GiftFx {
  fx: FxKind;
  /** Animasiyanın müddəti (ms) */
  ms: number;
  /** Əsas rəng — banner işığı, parıltılar */
  accent: string;
  /** Effekt variantı (eyni animasiyanın rəng/üslub dəyişikliyi) */
  variant?: 'gold' | 'blue' | 'pink';
}

export const GIFT_FX: Record<string, GiftFx> = {
  rose: { fx: 'petals', ms: 2200, accent: '#FF4D7A' },
  heart: { fx: 'heartPop', ms: 2000, accent: '#FF3D7F' },
  tea: { fx: 'steam', ms: 2200, accent: '#FFB347' },
  kiss: { fx: 'kissFly', ms: 2200, accent: '#FF3D7F' },
  pomegranate: { fx: 'seedBurst', ms: 2000, accent: '#F2344F' },
  shekerbura: { fx: 'sugarHop', ms: 2000, accent: '#FFC966' },
  chocolate: { fx: 'chocoZigzag', ms: 2200, accent: '#FF6A95' },

  buta: { fx: 'butaSpin', ms: 3200, accent: '#FF5A6E' },
  teddy: { fx: 'teddyDrop', ms: 3400, accent: '#FFB37A' },
  bouquet: { fx: 'bouquetBloom', ms: 3400, accent: '#FF6A95' },
  tar: { fx: 'tarMusic', ms: 3600, accent: '#FFB347' },
  perfume: { fx: 'perfumeMist', ms: 3400, accent: '#FF6FB0' },
  champagne: { fx: 'champagnePop', ms: 3400, accent: '#FFD54A' },
  ring: { fx: 'ringReveal', ms: 3600, accent: '#FFD54A' },
  fireworks: { fx: 'fireworksShow', ms: 3800, accent: '#C4B5FD' },
  diamond_heart: { fx: 'crystalHeart', ms: 3400, accent: '#4FA8FF' },

  crown: { fx: 'crownDescend', ms: 4800, accent: '#FFD54A', variant: 'gold' },
  caspian: { fx: 'caspianSunset', ms: 5400, accent: '#FF8A4C' },
  maiden_tower: { fx: 'towerRise', ms: 5200, accent: '#FFB25A' },
  flame_towers: { fx: 'flameTowers', ms: 5400, accent: '#FF8A3D' },
  sports_car: { fx: 'carDrive', ms: 4600, accent: '#FF4D4D' },
  rocket: { fx: 'rocketLaunch', ms: 4600, accent: '#7DB4FF' },
  yacht: { fx: 'yachtSail', ms: 5600, accent: '#5EC3FF' },
  palace: { fx: 'palaceRise', ms: 5600, accent: '#FFC24A' },
  love_planet: { fx: 'planetOrbit', ms: 5600, accent: '#FF5FA2' },

  diamond_ring: { fx: 'diamondRing', ms: 4800, accent: '#4FA8FF' },
  silk_carpet: { fx: 'carpetFly', ms: 5200, accent: '#E2364B' },
  diamond_crown: { fx: 'crownDescend', ms: 5000, accent: '#4FA8FF', variant: 'blue' },
  private_jet: { fx: 'jetFly', ms: 5000, accent: '#7DB4FF' },
};

const FALLBACK: Record<Tier, GiftFx> = {
  SMALL: { fx: 'miniSpark', ms: 1800, accent: '#FFD54A' },
  BIG: { fx: 'bigPop', ms: 3000, accent: '#FFD54A' },
  LUXURY: { fx: 'luxPop', ms: 4600, accent: '#FFD54A' },
};

export function fxFor(gift: { id: string; tier: Tier }): GiftFx {
  return GIFT_FX[gift.id] ?? FALLBACK[gift.tier] ?? FALLBACK.SMALL;
}

/** Banner üçün rəng sxemi (səviyyəyə görə) */
export const BANNER_COLORS: Record<Tier, [string, string]> = {
  SMALL: ['rgba(24,18,34,0.82)', 'rgba(24,18,34,0.25)'],
  BIG: ['rgba(214,31,69,0.92)', 'rgba(255,122,61,0.35)'],
  LUXURY: ['rgba(180,110,10,0.95)', 'rgba(242,52,79,0.45)'],
};
