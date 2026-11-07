/** Google Play Developer API — bir dəfəlik məhsul (coin paketi) yoxlaması */
import { GoogleAuth } from 'google-auth-library';
import { config } from '../../config.js';

let auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (!config.google.serviceAccountJson) throw new Error('GOOGLE_NOT_CONFIGURED');
  if (!auth) {
    auth = new GoogleAuth({
      credentials: JSON.parse(config.google.serviceAccountJson),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
  }
  return auth;
}

export interface GoogleProductPurchase {
  purchaseState: number; // 0 = alınıb, 1 = ləğv, 2 = gözləmədə
  consumptionState: number;
  orderId: string;
  obfuscatedExternalAccountId?: string;
  acknowledgementState: number;
  /** 0 = test (lisenziya testçisi), 1 = promo, 2 = mükafat; yoxdursa — real alış */
  purchaseType?: number;
}

export async function fetchGooglePurchase(productId: string, purchaseToken: string): Promise<GoogleProductPurchase> {
  const client = await getAuth().getClient();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(config.google.packageName)}` +
    `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await client.request<GoogleProductPurchase>({ url });
  return res.data;
}
