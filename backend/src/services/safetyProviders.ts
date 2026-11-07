/**
 * Vizual moderasiya provayderləri (dəyişdirilə bilən).
 *
 *   MODERATION_PROVIDER=sightengine   SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET
 *   MODERATION_PROVIDER=rekognition   AWS_REKOGNITION_REGION (və ya AWS_REGION), AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *   MODERATION_PROVIDER=none          açar yoxdur — kadrlar yoxlanılmadan moderator növbəsinə düşür (seçmə ilə)
 *
 * MODERATION_PROVIDER verilməsə: açarlar hansı provayder üçün varsa o seçilir, heç biri yoxdursa "none".
 * Heç bir xarici SDK tələb olunmur (Sightengine — multipart, AWS — SigV4 imzası əl ilə).
 */
import crypto from 'node:crypto';
import type { FrameScores } from '../lib/moderation.js';

export interface ModerationResult {
  provider: string;
  /** null — provayder yoxdur (yoxlanılmayıb) */
  scores: FrameScores | null;
  raw?: unknown;
}

export interface ModerationProvider {
  name: string;
  /** Şəkli yoxlayır (JPEG). Şəbəkə xətasında istisna atır — çağıran tərəf "UNSCANNED" kimi saxlayır */
  moderate(image: Buffer): Promise<ModerationResult>;
}

const clamp = (n: unknown) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(1, v));
};

/* ───────── Sightengine (nudity-2.1) ───────── */

export function sightengineProvider(apiUser: string, apiSecret: string, models = 'nudity-2.1'): ModerationProvider {
  return {
    name: 'sightengine',
    async moderate(image) {
      const form = new FormData();
      form.append('media', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), 'frame.jpg');
      form.append('models', models);
      form.append('api_user', apiUser);
      form.append('api_secret', apiSecret);
      const res = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form, signal: AbortSignal.timeout(8000) });
      const data = (await res.json()) as Record<string, any>;
      if (!res.ok || data.status !== 'success') throw new Error(`sightengine: ${data?.error?.message ?? res.status}`);
      return { provider: 'sightengine', scores: sightengineScores(data), raw: { nudity: data.nudity, request: data.request?.id } };
    },
  };
}

/** Sightengine nudity-2.1 cavabını normallaşdırır */
export function sightengineScores(data: Record<string, any>): FrameScores {
  const n = (data.nudity ?? {}) as Record<string, number>;
  return {
    sexual: Math.max(clamp(n.sexual_activity), clamp(n.sexual_display), clamp(n.erotica)),
    suggestive: Math.max(clamp(n.very_suggestive), clamp(n.suggestive) * 0.8),
  };
}

/* ───────── AWS Rekognition (DetectModerationLabels) ───────── */

function hmac(key: Buffer | string, data: string) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

/** AWS Signature V4 — yalnız bir POST sorğusu üçün minimal imza */
export function signAws(opts: { region: string; service: string; host: string; target: string; body: string; accessKeyId: string; secretAccessKey: string; sessionToken?: string; now?: Date }) {
  const now = opts.now ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const payloadHash = crypto.createHash('sha256').update(opts.body).digest('hex');
  const headers: Record<string, string> = {
    'content-type': 'application/x-amz-json-1.1',
    host: opts.host,
    'x-amz-date': amzDate,
    'x-amz-target': opts.target,
    ...(opts.sessionToken ? { 'x-amz-security-token': opts.sessionToken } : {}),
  };
  const names = Object.keys(headers).sort();
  const canonical = ['POST', '/', '', ...names.map((h) => `${h}:${headers[h]}`), '', names.join(';'), payloadHash].join('\n');
  const scope = `${day}/${opts.region}/${opts.service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${opts.secretAccessKey}`, day), opts.region), opts.service), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(toSign).digest('hex');
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${opts.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`,
  };
}

export function rekognitionProvider(region: string, accessKeyId: string, secretAccessKey: string, sessionToken?: string): ModerationProvider {
  const host = `rekognition.${region}.amazonaws.com`;
  return {
    name: 'rekognition',
    async moderate(image) {
      const body = JSON.stringify({ Image: { Bytes: image.toString('base64') }, MinConfidence: 40 });
      const headers = signAws({ region, service: 'rekognition', host, target: 'RekognitionService.DetectModerationLabels', body, accessKeyId, secretAccessKey, sessionToken });
      const res = await fetch(`https://${host}/`, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) });
      const data = (await res.json()) as Record<string, any>;
      if (!res.ok) throw new Error(`rekognition: ${data?.message ?? data?.__type ?? res.status}`);
      return { provider: 'rekognition', scores: rekognitionScores(data), raw: { labels: data.ModerationLabels, version: data.ModerationModelVersion } };
    },
  };
}

const AWS_SEXUAL = /^(explicit|explicit nudity|explicit sexual activity|sex toys|exposed .*|graphic .*nudity|sexual activity|illustrated explicit nudity|adult toys|nudity)$/i;
const AWS_SUGGESTIVE = /(non-explicit|suggestive|swimwear|underwear|partially exposed|revealing|implied nudity|obstructed intimate parts|kissing on the lips)/i;

/** Rekognition etiketlərini (taksonomiya v6 və v7) normallaşdırır */
export function rekognitionScores(data: Record<string, any>): FrameScores {
  let sexual = 0;
  let suggestive = 0;
  for (const l of (data.ModerationLabels ?? []) as { Name?: string; ParentName?: string; Confidence?: number }[]) {
    const c = clamp((l.Confidence ?? 0) / 100);
    const name = l.Name ?? '';
    if (AWS_SUGGESTIVE.test(name)) suggestive = Math.max(suggestive, c);
    else if (AWS_SEXUAL.test(name) || AWS_SEXUAL.test(l.ParentName ?? '')) sexual = Math.max(sexual, c);
  }
  return { sexual, suggestive };
}

/* ───────── Açarsız rejim ───────── */

export const queueProvider: ModerationProvider = {
  name: 'none',
  async moderate() {
    return { provider: 'none', scores: null };
  },
};

/* ───────── Seçim ───────── */

let override: ModerationProvider | null = null;
let cached: ModerationProvider | null = null;

/** Testlər üçün: saxta provayder qoşmaq (null — env-ə qayıt) */
export function setModerationProvider(p: ModerationProvider | null) {
  override = p;
}

export function getModerationProvider(): ModerationProvider {
  if (override) return override;
  if (cached) return cached;
  const env = process.env;
  const want = (env.MODERATION_PROVIDER ?? '').toLowerCase();
  const se = env.SIGHTENGINE_API_USER && env.SIGHTENGINE_API_SECRET;
  const aws = env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && (env.AWS_REKOGNITION_REGION || env.AWS_REGION);
  if ((want === 'sightengine' || (!want && se)) && se) {
    cached = sightengineProvider(env.SIGHTENGINE_API_USER!, env.SIGHTENGINE_API_SECRET!, env.SIGHTENGINE_MODELS || 'nudity-2.1');
  } else if ((want === 'rekognition' || (!want && aws)) && aws) {
    cached = rekognitionProvider((env.AWS_REKOGNITION_REGION || env.AWS_REGION)!, env.AWS_ACCESS_KEY_ID!, env.AWS_SECRET_ACCESS_KEY!, env.AWS_SESSION_TOKEN || undefined);
  } else {
    if (want && want !== 'none') console.warn(`[safety] MODERATION_PROVIDER=${want} üçün açarlar yoxdur — "none" (insan baxışı növbəsi) rejimi`);
    cached = queueProvider;
  }
  return cached;
}
