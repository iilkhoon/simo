/**
 * Simo kəşf alqoritmi.
 *
 * 1) Sərt filtrlər: cins üstünlüyü, yaş aralığı, blok, artıq bəyənilənlər, son 30 gündə keçilənlər.
 * 2) Hər namizədə xal verilir:
 *    məsafə (eksponensial azalma) · indi onlayn · son aktivlik · ortaq maraqlar · eyni məqsəd ·
 *    ortaq dil · yaş yaxınlığı · təsdiqlənmiş profil · cazibə səviyyəsi · "səni artıq bəyənib" (uyğunluq şansı) ·
 *    yeni istifadəçi (soyuq start) · VIP gücləndirmə · kiçik təsadüfilik (təzəlik üçün).
 * 3) Şəxsi alqoritm (taste.ts): istifadəçinin davranışından öyrənilmiş zövqə uyğunluq + kollektiv tövsiyə.
 * 4) Nəticə xala görə sıralanır.
 */
import { prisma } from '../db.js';
import { activeVip, ageFrom, levelFromXp } from '../economy.js';
import { distanceKm, presentUser, publicUserSelect } from '../lib/present.js';
import type { Prisma } from '../generated/prisma/client.js';
import { getTaste, tasteBoost, type Taste } from './taste.js';

export interface Viewer {
  id: string;
  gender: 'MALE' | 'FEMALE' | null;
  interestedIn: 'MALE' | 'FEMALE' | null;
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  lat: number | null;
  lng: number | null;
  interests: string[];
  languages: string[];
  lookingFor: string;
}

export async function loadViewer(userId: string): Promise<Viewer> {
  return prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, gender: true, interestedIn: true, ageMin: true, ageMax: true, maxDistanceKm: true,
      lat: true, lng: true, interests: true, languages: true, lookingFor: true,
    },
  });
}

async function excludedIds(viewerId: string, includePassed: boolean): Promise<string[]> {
  const since = new Date(Date.now() - 30 * 86400_000);
  const [swipes, blocks] = await Promise.all([
    prisma.swipe.findMany({
      where: {
        fromId: viewerId,
        ...(includePassed ? { OR: [{ action: { not: 'PASS' } }, { createdAt: { gte: since } }] } : { action: { not: 'PASS' } }),
      },
      select: { toId: true },
    }),
    prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);
  const ids = new Set<string>([viewerId]);
  swipes.forEach((s) => ids.add(s.toId));
  blocks.forEach((b) => ids.add(b.blockerId === viewerId ? b.blockedId : b.blockerId));
  return [...ids];
}

function birthRange(ageMin: number, ageMax: number) {
  const now = new Date();
  const latest = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());
  const earliest = new Date(now.getFullYear() - ageMax - 1, now.getMonth(), now.getDate() + 1);
  return { gte: earliest, lte: latest };
}

function baseWhere(v: Viewer, exclude: string[]): Prisma.UserWhereInput {
  return {
    id: { notIn: exclude },
    onboarded: true,
    banned: false,
    deletedAt: null,
    avatarUrl: { not: null },
    ...(v.interestedIn ? { gender: v.interestedIn } : {}),
    birthDate: birthRange(v.ageMin, v.ageMax),
  };
}

function seededJitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

type Candidate = Prisma.UserGetPayload<{ select: typeof publicUserSelect & { photos: true; createdAt: true } }>;

export function scoreCandidate(v: Viewer, c: Candidate, likedMe: boolean, seed: string, taste?: Taste): number {
  let s = taste ? tasteBoost(taste, c) : 0;
  if (v.lat != null && v.lng != null && c.lat != null && c.lng != null) {
    const d = distanceKm(v.lat, v.lng, c.lat, c.lng);
    s += 30 * Math.exp(-d / 25);
    if (d > v.maxDistanceKm) s -= 15;
  }
  if (c.online) s += 25;
  const hoursAgo = (Date.now() - c.lastSeenAt.getTime()) / 3600_000;
  s += 15 * Math.exp(-hoursAgo / 24);

  const shared = c.interests.filter((i) => v.interests.includes(i)).length;
  s += Math.min(30, shared * 6);
  if (c.lookingFor === v.lookingFor) s += 8;
  if (c.languages.some((l) => v.languages.includes(l))) s += 4;

  const age = ageFrom(c.birthDate) ?? 25;
  s -= 0.5 * Math.abs(age - (v.ageMin + v.ageMax) / 2);

  if (c.verified || c.kycStatus === 'APPROVED') s += 8;
  if (c.presence === 'BUSY' || c.presence === 'AWAY') s -= 10;
  if (c.hostStatus === 'APPROVED') s += 6;
  s += Math.min(10, levelFromXp(c.totalEarned));
  if (likedMe) s += 20;
  if (Date.now() - c.createdAt.getTime() < 72 * 3600_000) s += 12;
  if (c.photos.length >= 3) s += 4;

  const vip = activeVip(c);
  if (vip) s *= vip.discoveryBoost;
  s += seededJitter(seed + c.id) * 8;
  return s;
}

export async function discoverFeed(viewerId: string, limit = 20, cursorSeed = '') {
  const v = await loadViewer(viewerId);
  const exclude = await excludedIds(viewerId, true);
  const pool = await prisma.user.findMany({
    where: baseWhere(v, exclude),
    select: { ...publicUserSelect, photos: true, createdAt: true },
    orderBy: { lastSeenAt: 'desc' },
    take: 400,
  });
  const likedMeRows = await prisma.swipe.findMany({
    where: { toId: viewerId, action: { in: ['LIKE', 'SUPERLIKE'] }, fromId: { in: pool.map((p) => p.id) } },
    select: { fromId: true },
  });
  const likedMe = new Set(likedMeRows.map((r) => r.fromId));
  const seed = viewerId + cursorSeed + new Date().toISOString().slice(0, 13);
  const taste = await getTaste(viewerId).catch(() => undefined);
  return pool
    .map((c) => ({ c, score: scoreCandidate(v, c, likedMe.has(c.id), seed, taste) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ c }) => presentUser(c, v));
}

/** "Günün 10 seçimi" — gündə bir dəfə hesablanır (gün açarı ilə sabit təsadüfilik) */
export async function dailyPicks(viewerId: string) {
  const v = await loadViewer(viewerId);
  const blocks = await excludedIds(viewerId, false);
  const pool = await prisma.user.findMany({
    where: { ...baseWhere(v, blocks), photos: { some: {} } },
    select: { ...publicUserSelect, photos: true, createdAt: true },
    orderBy: [{ verified: 'desc' }, { lastSeenAt: 'desc' }],
    take: 200,
  });
  const day = new Date().toISOString().slice(0, 10);
  const taste = await getTaste(viewerId).catch(() => undefined);
  return pool
    .map((c) => ({ c, score: scoreCandidate(v, c, false, viewerId + day, taste) + (c.verified ? 10 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ c }) => presentUser(c, v));
}

/** Yaxınlıqdakılar — sərhəd qutusu ilə sürətli sorğu, sonra dəqiq məsafəyə görə sıralama */
export async function nearby(viewerId: string, radiusKm = 50, onlyOnline = false) {
  const v = await loadViewer(viewerId);
  if (v.lat == null || v.lng == null) return [];
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ex = new Set([viewerId, ...blocks.map((b) => (b.blockerId === viewerId ? b.blockedId : b.blockerId))]);
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((v.lat * Math.PI) / 180));
  const rows = await prisma.user.findMany({
    where: {
      id: { notIn: [...ex] },
      onboarded: true, banned: false, deletedAt: null,
      lat: { gte: v.lat - dLat, lte: v.lat + dLat },
      lng: { gte: v.lng - dLng, lte: v.lng + dLng },
      ...(v.interestedIn ? { gender: v.interestedIn } : {}),
      ...(onlyOnline ? { online: true } : {}),
      locationAt: { gte: new Date(Date.now() - 14 * 86400_000) },
    },
    select: { ...publicUserSelect, photos: true },
    take: 300,
  });
  return rows
    // Gizli rejimdə olan VIP-lər yaxınlıqda görünmür
    .filter((u) => !(u.incognito && activeVip(u)?.incognito))
    .map((u) => presentUser(u, v))
    .filter((u) => u.distanceKm != null && u.distanceKm <= radiusKm)
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
}
