/**
 * Təhlükəsizlik köməkçiləri: log-larda PII maskalanması, media link yoxlaması, şəxsi fayllar üçün imzalı linklər,
 * fayl tipinin məzmuna görə (magic bytes) təyini, təhlükəsiz yol birləşdirmə.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { config } from '../config.js';

/* ───────── PII maskalanması ───────── */

/** +994501234567 → +99450*****67 (log-larda tam nömrə saxlanmır) */
export function maskPhone(s: string): string {
  return s.replace(/\+?\d[\d\s\-()]{7,}\d/g, (m) => {
    const d = m.replace(/\D/g, '');
    return `${m.startsWith('+') ? '+' : ''}${d.slice(0, 5)}${'*'.repeat(Math.max(0, d.length - 7))}${d.slice(-2)}`;
  });
}

/** URL-dəki həssas query parametrləri (token, code, signature) maskalanır */
export function redactUrl(url: string): string {
  return maskPhone(url.replace(/([?&](?:token|access_token|refreshToken|code|sig|signature|purchaseToken)=)[^&]*/gi, '$1[REDACTED]'));
}

/** pino redaction yolları — başlıqlar və gövdədəki sirlər heç vaxt log-a düşmür */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'headers.authorization',
  '*.password', '*.passwordHash', '*.refreshToken', '*.accessToken', '*.token', '*.code', '*.codeHash',
  '*.phone', '*.purchaseToken', '*.signature', '*.privateKey',
];

/* ───────── Media linkləri ───────── */

function allowedMediaHost(u: URL): boolean {
  const own = (() => { try { return new URL(config.publicUrl).host; } catch { return ''; } })();
  return u.host === own || config.mediaHosts.includes(u.host);
}

/**
 * İstifadəçinin göndərdiyi media linki: yalnız http(s) (javascript:/data: admin panelində XSS-ə səbəb ola bilər),
 * ən çox 600 simvol. İstehsalda (staging istisna) yalnız öz serverimiz və MEDIA_HOSTS-dakı CDN-lər.
 */
export function isAcceptableMediaUrl(raw: string, strict = config.isProd && !config.staging): boolean {
  if (raw.length > 600) return false;
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  if (u.username || u.password) return false;
  if (strict && !allowedMediaHost(u)) return false;
  return true;
}

export const mediaUrl = () => z.string().max(600).refine((s) => isAcceptableMediaUrl(s), { message: 'MEDIA_URL_NOT_ALLOWED' });

/* ───────── Şəxsi fayllar (KYC) ───────── */

export const PRIVATE_PREFIX = '/private/';

function privateSig(rel: string, exp: number): string {
  return crypto.createHmac('sha256', config.jwtSecret).update(`private:${rel}:${exp}`).digest('base64url');
}

/** Şəxsi faylın daimi (imzasız) ünvanı — bazada saxlanılır, birbaşa açılmır */
export function privateUrl(rel: string): string {
  return `${config.publicUrl}${PRIVATE_PREFIX}${rel}`;
}

/** Bazadakı şəxsi fayl ünvanından nisbi yol (bizim deyilsə null) */
export function privateRel(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = `${config.publicUrl}${PRIVATE_PREFIX}`;
  if (!url.startsWith(prefix)) return null;
  const rel = url.slice(prefix.length).split('?')[0];
  return safeResolve(config.privateUploadDir, rel) ? rel : null;
}

/** Admin panelinə: şəxsi fayl üçün müvəqqəti imzalı link (standart 15 dəqiqə). Şəxsi deyilsə — olduğu kimi */
export function signPrivateUrl(url: string | null | undefined, ttlSec = 900): string | null {
  if (!url) return url ?? null;
  const rel = privateRel(url);
  if (!rel) return url;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  return `${privateUrl(rel)}?exp=${exp}&sig=${privateSig(rel, exp)}`;
}

export function verifyPrivateSig(rel: string, exp: number, sig: string): boolean {
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const a = Buffer.from(privateSig(rel, exp));
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ───────── Fayl sistemi ───────── */

/** base + rel birləşməsi; base-dən kənara çıxırsa (../, mütləq yol, NUL) null */
export function safeResolve(base: string, rel: string): string | null {
  if (!rel || rel.includes('\0') || path.isAbsolute(rel)) return null;
  const root = path.resolve(base);
  const abs = path.resolve(root, rel);
  return abs.startsWith(root + path.sep) ? abs : null;
}

/** Faylın əsl tipi (ilk baytlara görə). Müştərinin bildirdiyi Content-Type-a etibar edilmir */
export function sniffMime(head: Buffer): string | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (head.length >= 12 && head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (head.length >= 12 && head.toString('ascii', 4, 8) === 'ftyp') {
    const brand = head.toString('ascii', 8, 12);
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
    if (brand === 'qt  ') return 'video/quicktime';
    return 'video/mp4';
  }
  return null;
}
