/**
 * İstəyə bağlı xəta monitorinqi (Sentry). Paket MƏCBURİ deyil:
 *   SENTRY_DSN təyin olunub VƏ `npm i @sentry/node` quraşdırılıbsa — xətalar Sentry-yə gedir;
 *   əks halda yalnız strukturlaşdırılmış log (journalctl).
 */
import { config } from '../config.js';
import { maskPhone } from './security.js';

type SentryLike = {
  init: (o: Record<string, unknown>) => void;
  captureException: (e: unknown, ctx?: Record<string, unknown>) => void;
  flush?: (ms: number) => Promise<boolean>;
};

let sentry: SentryLike | null = null;

export async function initMonitoring(log: { info: (m: string) => void; warn: (m: string) => void }) {
  if (!config.sentryDsn) return;
  try {
    const modName = '@sentry/node';
    const mod = (await import(/* @vite-ignore */ modName)) as SentryLike;
    mod.init({
      dsn: config.sentryDsn,
      environment: config.staging ? 'staging' : config.isProd ? 'production' : 'development',
      tracesSampleRate: 0,
      sendDefaultPii: false,
      // Telefon nömrələri və tokenlər Sentry-yə getmir
      beforeSend(event: { request?: { headers?: Record<string, string>; data?: unknown }; message?: string }) {
        if (event.request) {
          delete event.request.data;
          if (event.request.headers) delete event.request.headers.authorization;
        }
        if (event.message) event.message = maskPhone(event.message);
        return event;
      },
    });
    sentry = mod;
    log.info('Sentry aktivdir');
  } catch {
    log.warn('SENTRY_DSN təyin olunub, amma @sentry/node quraşdırılmayıb — yalnız log');
  }
}

export function captureError(e: unknown, ctx?: Record<string, unknown>) {
  try { sentry?.captureException(e, ctx ? { extra: ctx } : undefined); } catch { /* monitorinq xətası tətbiqi dayandırmır */ }
}

export async function flushMonitoring() {
  try { await sentry?.flush?.(2000); } catch { /* ignore */ }
}
