import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

/**
 * Fayl yükləmə. İstehsalda UPLOAD_DIR-i S3/Cloudflare R2-yə montaj edin və ya CDN arxasında saxlayın.
 */
export default async function uploadRoutes(app: FastifyInstance) {
  fs.mkdirSync(config.uploadDir, { recursive: true });

  app.post('/uploads', { preHandler: requireAuth, config: { rateLimit: { max: 60, timeWindow: '10 minutes' } } }, async (req) => {
    const file = await req.file();
    if (!file) throw err.badRequest('FILE_REQUIRED');
    const ext = ALLOWED[file.mimetype];
    if (!ext) throw err.badRequest('FILE_TYPE');
    const isVideo = file.mimetype.startsWith('video/');
    const dir = path.join(config.uploadDir, isVideo ? 'videos' : 'images', new Date().toISOString().slice(0, 7));
    fs.mkdirSync(dir, { recursive: true });
    const name = `${uid(req).slice(-6)}_${crypto.randomBytes(10).toString('hex')}${ext}`;
    const target = path.join(dir, name);
    await pipeline(file.file, fs.createWriteStream(target));
    if (file.file.truncated) {
      fs.rmSync(target, { force: true });
      throw err.badRequest('FILE_TOO_LARGE');
    }
    if (!isVideo && fs.statSync(target).size > 15 * 1024 * 1024) {
      fs.rmSync(target, { force: true });
      throw err.badRequest('FILE_TOO_LARGE');
    }
    const rel = path.relative(config.uploadDir, target).split(path.sep).join('/');
    return { url: `${config.publicUrl}/files/${rel}`, type: isVideo ? 'video' : 'image' };
  });
}
