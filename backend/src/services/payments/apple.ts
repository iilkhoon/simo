/**
 * App Store Server API ilə tranzaksiya yoxlaması.
 * Tranzaksiya birbaşa Apple serverindən (TLS üzərindən) alınır, buna görə JWS payload etibarlıdır.
 */
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

function appleJwt(): string {
  return jwt.sign({ bid: config.apple.bundleId }, config.apple.privateKey, {
    algorithm: 'ES256',
    issuer: config.apple.issuerId,
    audience: 'appstoreconnect-v1',
    expiresIn: '10m',
    keyid: config.apple.keyId,
    header: { alg: 'ES256', kid: config.apple.keyId, typ: 'JWT' },
  });
}

export interface AppleTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  appAccountToken?: string;
  revocationDate?: number;
  environment: string;
}

function decodeJws<T>(jws: string): T {
  const part = jws.split('.')[1];
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
}

export async function fetchAppleTransaction(transactionId: string): Promise<AppleTransaction> {
  if (!config.apple.privateKey) throw new Error('APPLE_NOT_CONFIGURED');
  const token = appleJwt();
  const hosts = ['https://api.storekit.itunes.apple.com', 'https://api.storekit-sandbox.itunes.apple.com'];
  for (const host of hosts) {
    const res = await fetch(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`APPLE_${res.status}`);
    const body = (await res.json()) as { signedTransactionInfo: string };
    const tx = decodeJws<AppleTransaction>(body.signedTransactionInfo);
    if (tx.bundleId !== config.apple.bundleId) throw new Error('APPLE_BUNDLE_MISMATCH');
    return tx;
  }
  throw new Error('APPLE_TX_NOT_FOUND');
}

/** iOS-da appAccountToken UUID olmalıdır — istifadəçi ID-dən deterministik UUID */
export function appAccountTokenFor(userId: string): string {
  const h = crypto.createHash('sha256').update(`simo:${userId}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
