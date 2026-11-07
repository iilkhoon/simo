import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import formbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import { ZodError } from 'zod';
import { config } from './config.js';
import { AppError } from './lib/errors.js';
import { LOG_REDACT_PATHS, redactUrl } from './lib/security.js';
import { captureError } from './lib/monitoring.js';
import { prisma } from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import discoveryRoutes from './routes/discovery.js';
import chatRoutes from './routes/chat.js';
import giftRoutes from './routes/gifts.js';
import callRoutes from './routes/calls.js';
import liveRoutes from './routes/live.js';
import videoRoutes from './routes/videos.js';
import walletRoutes from './routes/wallet.js';
import paymentRoutes from './routes/payments.js';
import agencyRoutes from './routes/agency.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/uploads.js';
import hostRoutes from './routes/host.js';
import socialRoutes from './routes/social.js';
import smartRoutes from './routes/smart.js';
import serviceRoutes from './routes/services.js';
import safetyRoutes from './routes/safety.js';

/** Server dayanır (SIGTERM): /ready 503 qaytarır ki, proksi yeni sorğu göndərməsin */
let shuttingDown = false;
export function markShuttingDown() {
  shuttingDown = true;
}

/** İstehsalda brauzer mənbələri: CORS_ORIGINS və ya WEB_URL (+ www.). Mobil tətbiq Origin göndərmir. */
function allowedOrigins(): Set<string> | null {
  if (!config.isProd && !config.corsOrigins.length) return null;
  const set = new Set(config.corsOrigins);
  try {
    const w = new URL(config.webUrl);
    set.add(w.origin);
    if (!w.hostname.startsWith('www.')) set.add(`${w.protocol}//www.${w.host}`);
  } catch { /* WEB_URL səhvdirsə yalnız CORS_ORIGINS */ }
  return set;
}

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      // Tokenlər, parollar, telefon nömrələri log-a düşmür
      redact: { paths: LOG_REDACT_PATHS, censor: '[REDACTED]' },
      serializers: {
        req: (req: { method: string; url: string; ip?: string; id?: string }) => ({ method: req.method, url: redactUrl(req.url), ip: req.ip, reqId: req.id }),
      },
    },
    bodyLimit: 2 * 1024 * 1024,
    trustProxy: config.trustProxy,
    // Sorğu ID: proksidən gələn X-Request-Id (etibarlı formatdadırsa) və ya yeni UUID — log-larda izləmək üçün
    genReqId: (req) => {
      const h = req.headers['x-request-id'];
      return typeof h === 'string' && /^[\w.-]{8,64}$/.test(h) ? h : crypto.randomUUID();
    },
  });
  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Request-Id', req.id);
  });

  const origins = allowedOrigins();
  await app.register(cors, {
    origin: origins ? (origin, cb) => cb(null, !origin || origins.has(origin)) : true,
    maxAge: 600,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  });
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' });
  await app.register(formbody);
  await app.register(multipart, { limits: { fileSize: 150 * 1024 * 1024, files: 1, fields: 10, fieldSize: 1024, parts: 12 } });
  fs.mkdirSync(config.uploadDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: path.resolve(config.uploadDir),
    prefix: '/files/',
    decorateReply: false,
    dotfiles: 'deny',
    index: false,
    list: false,
    setHeaders: (res) => {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'");
      res.header('Cache-Control', 'public, max-age=604800, immutable');
    },
  });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) return reply.code(error.status).send({ error: error.code, ...error.extra });
    if (error instanceof ZodError) return reply.code(400).send({ error: 'VALIDATION', issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    const e = error as { statusCode?: number; message?: string };
    if (e.statusCode === 429) return reply.code(429).send({ error: 'RATE_LIMIT' });
    if (e.statusCode && e.statusCode < 500) return reply.code(e.statusCode).send({ error: 'BAD_REQUEST', message: e.message });
    req.log.error({ err: error, url: redactUrl(req.url) }, 'Server xətası');
    captureError(error, { reqId: req.id, route: req.routeOptions?.url });
    return reply.code(500).send({ error: 'SERVER_ERROR', requestId: req.id });
  });

  /** Liveness: proses işləyir */
  app.get('/health', { config: { rateLimit: false } }, async () => ({ ok: true, name: 'simo-api', time: new Date() }));
  /** Readiness: baza əlçatandır və server dayanmır — yük balanslayıcı / deploy skripti üçün */
  app.get('/ready', { config: { rateLimit: false } }, async (_req, reply) => {
    if (shuttingDown) return reply.code(503).send({ ok: false, reason: 'SHUTTING_DOWN' });
    try {
      await Promise.race([prisma.$queryRaw`SELECT 1`, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
      return { ok: true };
    } catch {
      return reply.code(503).send({ ok: false, reason: 'DB_UNAVAILABLE' });
    }
  });

  for (const r of [authRoutes, userRoutes, discoveryRoutes, chatRoutes, giftRoutes, callRoutes, liveRoutes, videoRoutes, walletRoutes, paymentRoutes, agencyRoutes, adminRoutes, uploadRoutes, hostRoutes, socialRoutes, smartRoutes, serviceRoutes, safetyRoutes]) {
    await app.register(r);
  }
  return app;
}
