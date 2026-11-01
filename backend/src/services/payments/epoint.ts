/**
 * Epoint.az — Azərbaycan kart ödənişləri (AZN). Huawei AppGallery versiyası və veb yükləmə səhifəsi üçün.
 * İmza: base64(sha1(private_key + data + private_key)), data = base64(json).
 */
import crypto from 'node:crypto';
import { config } from '../../config.js';

export function epointSign(data: string): string {
  const k = config.epoint.privateKey;
  return crypto.createHash('sha1').update(k + data + k).digest('base64');
}

export function epointEncode(payload: Record<string, unknown>) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  return { data, signature: epointSign(data) };
}

export function epointVerify(data: string, signature: string): boolean {
  const expected = epointSign(data);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function epointDecode<T = Record<string, unknown>>(data: string): T {
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8')) as T;
}

export async function epointCreatePayment(opts: {
  orderId: string;
  amountAzn: number;
  description: string;
  language: string;
  successUrl: string;
  errorUrl: string;
}): Promise<string> {
  if (!config.epoint.publicKey || !config.epoint.privateKey) throw new Error('EPOINT_NOT_CONFIGURED');
  const { data, signature } = epointEncode({
    public_key: config.epoint.publicKey,
    amount: opts.amountAzn.toFixed(2),
    currency: 'AZN',
    language: ['az', 'ru', 'en'].includes(opts.language) ? opts.language : 'az',
    order_id: opts.orderId,
    description: opts.description,
    success_redirect_url: opts.successUrl,
    error_redirect_url: opts.errorUrl,
  });
  const res = await fetch(`${config.epoint.apiUrl}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data, signature }).toString(),
  });
  const body = (await res.json()) as { status: string; redirect_url?: string; message?: string };
  if (body.status !== 'success' || !body.redirect_url) throw new Error(`EPOINT_ERROR:${body.message ?? body.status}`);
  return body.redirect_url;
}
