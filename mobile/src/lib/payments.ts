/**
 * Coin alışı:
 *  • iOS → Apple In-App Purchase (App Store qaydası 3.1.1: rəqəmsal valyuta yalnız IAP ilə)
 *  • Android/Google Play → Google Play Billing
 *  • Android/Huawei AppGallery → Epoint.az kart ödənişi (tətbiqdaxili brauzer)
 * Hər alış serverdə yoxlanılır və yalnız sonra coin yazılır.
 */
import * as WebBrowser from 'expo-web-browser';
import type * as IapTypes from 'expo-iap';
import { STORE } from '../config';
import { api, ApiError } from './api';
import i18n from '../i18n';
import type { CoinPackage } from './types';

type Iap = typeof IapTypes;
let iap: Iap | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  iap = require('expo-iap') as Iap;
} catch {
  iap = null;
}

let connected = false;
let pending: { resolve: (credited: number) => void; reject: (e: unknown) => void; productId: string } | null = null;
let subs: { remove: () => void }[] = [];

async function verify(p: IapTypes.Purchase): Promise<number> {
  const r =
    STORE === 'apple'
      ? await api<{ credited: number }>('/payments/apple/verify', { body: { transactionId: p.id, productId: p.productId } })
      : await api<{ credited: number }>('/payments/google/verify', { body: { purchaseToken: p.purchaseToken, productId: p.productId } });
  await iap?.finishTransaction({ purchase: p, isConsumable: true });
  return r.credited;
}

async function ensureConnection() {
  if (!iap) throw new ApiError('STORE_UNAVAILABLE', 0);
  if (connected) return;
  await iap.initConnection();
  connected = true;
  subs.push(
    iap.purchaseUpdatedListener(async (p) => {
      try {
        const credited = await verify(p);
        if (pending && pending.productId === p.productId) pending.resolve(credited);
      } catch (e) {
        pending?.reject(e);
      } finally {
        pending = null;
      }
    }),
    iap.purchaseErrorListener((e) => {
      pending?.reject(new ApiError(e.code === 'user-cancelled' ? 'CANCELLED' : 'PAYMENT_VERIFY_FAILED', 0));
      pending = null;
    }),
  );
  // Tamamlanmamış köhnə alışları bərpa et (məs. tətbiq ödəniş zamanı bağlanıbsa)
  try {
    const old = await iap.getAvailablePurchases();
    for (const p of old ?? []) await verify(p).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function closePayments() {
  subs.forEach((s) => s.remove());
  subs = [];
  if (connected) void iap?.endConnection();
  connected = false;
}

/** Mağaza qiymətlərini (yerli valyutada) gətirir; alınmasa serverdəki AZN qiyməti göstərilir */
export async function storePrices(pkgs: CoinPackage[]): Promise<Record<string, string>> {
  if (STORE === 'huawei' || !iap) return {};
  try {
    await ensureConnection();
    const ids = pkgs.map((p) => (STORE === 'apple' ? p.appleProductId : p.googleProductId));
    const products = await iap.fetchProducts({ skus: ids, type: 'in-app' });
    const out: Record<string, string> = {};
    for (const pr of (products ?? []) as IapTypes.Product[]) out[pr.id] = pr.displayPrice;
    return out;
  } catch {
    return {};
  }
}

export async function buyCoins(pkg: CoinPackage, userId: string): Promise<number> {
  if (STORE === 'huawei') return buyWithEpoint(pkg);
  await ensureConnection();
  const productId = STORE === 'apple' ? pkg.appleProductId : pkg.googleProductId;
  const appAccountToken = STORE === 'apple' ? (await api<{ token: string }>('/payments/account-token')).token : undefined;
  return new Promise<number>((resolve, reject) => {
    pending = { resolve, reject, productId };
    iap!
      .requestPurchase({
        type: 'in-app',
        request: {
          apple: { sku: productId, appAccountToken },
          google: { skus: [productId], obfuscatedAccountId: userId },
        },
      })
      .catch((e: unknown) => {
        pending = null;
        reject(e);
      });
  });
}

async function buyWithEpoint(pkg: CoinPackage): Promise<number> {
  const r = await api<{ paymentId: string; redirectUrl: string }>('/payments/epoint/checkout', {
    body: { packageId: pkg.id, language: i18n.language },
  });
  await WebBrowser.openAuthSessionAsync(r.redirectUrl, 'simo://payment-result');
  // Callback serverə bir neçə saniyə gecikə bilər — statusu yoxla
  for (let i = 0; i < 10; i++) {
    const s = await api<{ status: string; coins: number }>(`/payments/${r.paymentId}/status`);
    if (s.status === 'PAID') return s.coins;
    if (s.status === 'FAILED') throw new ApiError('PAYMENT_VERIFY_FAILED', 0);
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new ApiError('PAYMENT_PENDING', 0);
}
