import fs from 'node:fs';
import path from 'node:path';
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
import campaignRoutes from './routes/campaigns.js';

export async function buildApp() {
  const app = Fastify({ logger: { level: config.isProd ? 'info' : 'warn' }, bodyLimit: 2 * 1024 * 1024, trustProxy: true });

  await app.register(cors, { origin: true });
  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } });
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' });
  await app.register(formbody);
  await app.register(multipart, { limits: { fileSize: 150 * 1024 * 1024, files: 1 } });
  fs.mkdirSync(config.uploadDir, { recursive: true });
  await app.register(fastifyStatic, { root: path.resolve(config.uploadDir), prefix: '/files/', decorateReply: false });

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof AppError) return reply.code(error.status).send({ error: error.code, ...error.extra });
    if (error instanceof ZodError) return reply.code(400).send({ error: 'VALIDATION', issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    const e = error as { statusCode?: number; message?: string };
    if (e.statusCode === 429) return reply.code(429).send({ error: 'RATE_LIMIT' });
    if (e.statusCode && e.statusCode < 500) return reply.code(e.statusCode).send({ error: 'BAD_REQUEST', message: e.message });
    app.log.error(error);
    return reply.code(500).send({ error: 'SERVER_ERROR' });
  });

  app.get('/health', async () => ({ ok: true, name: 'simo-api', time: new Date() }));

  for (const r of [authRoutes, userRoutes, discoveryRoutes, chatRoutes, giftRoutes, callRoutes, liveRoutes, videoRoutes, walletRoutes, paymentRoutes, agencyRoutes, adminRoutes, uploadRoutes, hostRoutes, socialRoutes, smartRoutes, serviceRoutes, safetyRoutes, campaignRoutes]) {
    await app.register(r);
  }
  return app;
}
