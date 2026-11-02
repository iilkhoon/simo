import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { err } from './errors.js';

export interface AuthUser {
  id: string;
  role: 'USER' | 'ADMIN';
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function signAccess(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.accessTtlSec });
}

export function verifyAccess(token: string): AuthUser {
  const p = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
  if (!p.sub) throw err.unauthorized();
  return { id: String(p.sub), role: p.role === 'ADMIN' ? 'ADMIN' : 'USER' };
}

export async function issueTokens(user: AuthUser) {
  const refresh = crypto.randomBytes(48).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refresh),
      expiresAt: new Date(Date.now() + config.refreshTtlSec * 1000),
    },
  });
  return { accessToken: signAccess(user), refreshToken: refresh };
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) throw err.unauthorized();
  let u: AuthUser;
  try {
    u = verifyAccess(h.slice(7));
  } catch {
    throw err.unauthorized('TOKEN_EXPIRED');
  }
  const db = await prisma.user.findUnique({ where: { id: u.id }, select: { banned: true, deletedAt: true, role: true } });
  if (!db || db.deletedAt) throw err.unauthorized();
  if (db.banned) throw err.forbidden('BANNED');
  req.user = { id: u.id, role: db.role };
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireAuth(req, reply);
  if (req.user?.role !== 'ADMIN') throw err.forbidden();
}

export function uid(req: FastifyRequest): string {
  if (!req.user) throw err.unauthorized();
  return req.user.id;
}

/** Token varsa istifadəçi id-si, yoxdursa null (açıq endpoint-lər üçün) */
export function optionalUid(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try { return verifyAccess(h.slice(7)).id; } catch { return null; }
}
