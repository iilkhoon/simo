import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { err } from '../lib/errors.js';
import { optionalUid, requireAuth, uid } from '../lib/auth.js';
import { privateUrl, safeResolve, sniffMime, verifyPrivateSig } from '../lib/security.js';
import { prisma } from '../db.js';

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Şəkil yenidən kodlanır: EXIF (GPS koordinatları, cihaz modeli) silinir, oriyentasiya tətbiq olunur,
 * ölçü ən çox 2560px. HEIC → JPEG. Şəkil kimi açıla bilməyən fayl rədd edilir (polyglot / zərərli fayllar).
 */
async function reencodeImage(src: string, mime: string): Promise<{ file: string; ext: string }> {
  const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  const out = src.replace(/\.[a-z0-9]+$/i, '') + '_c' + ext;
  try {
    let img = sharp(src, { limitInputPixels: 80_000_000, failOn: 'error' }).rotate()
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true });
    img = ext === '.png' ? img.png({ compressionLevel: 8 }) : ext === '.webp' ? img.webp({ quality: 86 }) : img.jpeg({ quality: 86, mozjpeg: true });
    await img.toFile(out);
  } catch {
    fs.rmSync(out, { force: true });
    throw err.badRequest('BAD_IMAGE');
  } finally {
    fs.rmSync(src, { force: true });
  }
  return { file: out, ext };
}

/**
 * Fayl yükləmə. İstehsalda UPLOAD_DIR-i CDN arxasında saxlayın.
 *  ?purpose=kyc — şəxsiyyət sənədi / selfi: ŞƏXSİ qovluğa yazılır, /files/ altında açılmır,
 *  yalnız sahibinə və adminə imzalı link ilə (bax GET /private/*).
 */
export default async function uploadRoutes(app: FastifyInstance) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  fs.mkdirSync(config.privateUploadDir, { recursive: true, mode: 0o700 });

  app.post('/uploads', { preHandler: requireAuth, config: { rateLimit: { max: 60, timeWindow: '10 minutes' } } }, async (req) => {
    const me = uid(req);
    const { purpose } = z.object({ purpose: z.enum(['media', 'kyc']).default('media') }).parse(req.query ?? {});
    const file = await req.file();
    if (!file) throw err.badRequest('FILE_REQUIRED');
    if (!ALLOWED[file.mimetype]) throw err.badRequest('FILE_TYPE');
    const isPrivate = purpose === 'kyc';
    const month = new Date().toISOString().slice(0, 7);
    // Şəxsi fayllar: kyc/<userId>/... — sahiblik yolun özündən yoxlanır
    const dir = isPrivate
      ? path.join(config.privateUploadDir, 'kyc', me)
      : path.join(config.uploadDir, file.mimetype.startsWith('video/') ? 'videos' : 'images', month);
    fs.mkdirSync(dir, { recursive: true, ...(isPrivate ? { mode: 0o700 } : {}) });
    const base = `${me.slice(-6)}_${crypto.randomBytes(12).toString('hex')}`;
    let target = path.join(dir, `${base}.upload`);
    await pipeline(file.file, fs.createWriteStream(target, isPrivate ? { mode: 0o600 } : undefined));
    if (file.file.truncated) {
      fs.rmSync(target, { force: true });
      throw err.badRequest('FILE_TOO_LARGE');
    }
    // Əsl tip məzmuna görə (müştərinin Content-Type-ı saxtalaşdırıla bilər)
    const head = Buffer.alloc(16);
    const fd = fs.openSync(target, 'r');
    fs.readSync(fd, head, 0, 16, 0);
    fs.closeSync(fd);
    const real = sniffMime(head);
    if (!real || !ALLOWED[real]) {
      fs.rmSync(target, { force: true });
      throw err.badRequest('FILE_TYPE');
    }
    const isVideo = real.startsWith('video/');
    if (isPrivate && isVideo) {
      fs.rmSync(target, { force: true });
      throw err.badRequest('FILE_TYPE');
    }
    if (!isVideo) {
      if (fs.statSync(target).size > MAX_IMAGE_BYTES) {
        fs.rmSync(target, { force: true });
        throw err.badRequest('FILE_TOO_LARGE');
      }
      target = (await reencodeImage(target, real)).file;
      if (isPrivate) fs.chmodSync(target, 0o600);
    } else {
      // Video: məzmun yoxlanılıb; metadata (məkan) təmizlənməsi üçün ffmpeg lazımdır — docs/PRODUCTION.md
      const final = path.join(dir, `${base}${ALLOWED[real]}`);
      fs.renameSync(target, final);
      target = final;
    }
    const root = isPrivate ? config.privateUploadDir : config.uploadDir;
    const rel = path.relative(root, target).split(path.sep).join('/');
    return { url: isPrivate ? privateUrl(rel) : `${config.publicUrl}/files/${rel}`, type: isVideo ? 'video' : 'image', private: isPrivate };
  });

  /**
   * Şəxsi fayl: ya admin üçün imzalı link (?exp&sig — admin panelindəki <img> üçün),
   * ya da Authorization başlığı ilə faylın sahibi / admin.
   */
  app.get('/private/*', { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } }, async (req, reply) => {
    const rel = (req.params as { '*': string })['*'];
    const abs = safeResolve(config.privateUploadDir, rel);
    if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw err.notFound();
    const q = z.object({ exp: z.coerce.number().optional(), sig: z.string().max(100).optional() }).parse(req.query);
    let ok = q.exp != null && !!q.sig && verifyPrivateSig(rel, q.exp, q.sig);
    if (!ok) {
      const me = optionalUid(req);
      if (me) {
        const owner = rel.split('/')[1];
        if (owner === me) ok = true;
        else {
          const u = await prisma.user.findUnique({ where: { id: me }, select: { role: true, banned: true } });
          ok = u?.role === 'ADMIN' && !u.banned;
        }
      }
    }
    if (!ok) throw err.notFound();
    const type = abs.endsWith('.png') ? 'image/png' : abs.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return reply
      .header('Cache-Control', 'private, no-store')
      .header('X-Robots-Tag', 'noindex')
      .header('Content-Security-Policy', "default-src 'none'")
      .type(type)
      .send(fs.createReadStream(abs));
  });
}
