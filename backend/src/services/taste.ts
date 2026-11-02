/**
 * Şəxsi alqoritm — istifadəçinin davranışından "zövq profili" qurur.
 *
 * Siqnallar (son 60 gün, çəkilərlə):
 *   hədiyyə göndərmək 6 · zəng 5 · super bəyənmə 4 · mesaj yazmaq 3 · bəyənmə 2 · canlı yayına baxmaq 2 ·
 *   profilə baxmaq 1 (uzun baxış +1) · posta baxmaq 0.5 · keçmək −1.5
 * Hər siqnalın hədəfinin maraqları, yaşı, şəhəri, host olub-olmaması toplanır →
 *   maraq çəkiləri, yaş paylanması (orta ± sapma), şəhər üstünlüyü, host meyli.
 * Əlavə: aktiv saatlar, ən çox açılan ekranlar, xərcləmə davranışı (təkliflər üçün).
 * Kollektiv filtr: "sənin bəyəndiklərini bəyənənlər bunları da bəyənib".
 * Nəticə 30 dəqiqə keşlənir (UserTaste).
 */
import { prisma } from '../db.js';
import { ageFrom } from '../economy.js';

export interface Taste {
  interests: Record<string, number>; // normallaşdırılmış 0..1
  ageMean: number | null;
  ageStd: number;
  cities: Record<string, number>;
  hostAffinity: number; // 0..1 — hostlarla ünsiyyət payı
  screens: Record<string, number>; // ekran → baxış sayı
  hours: number[]; // 24 saatlıq aktivlik histoqramı (Bakı vaxtı)
  coLiked: Record<string, number>; // userId → kollektiv xal
  spend: { total30: number; gifts30: number; messages30: number; calls30: number; vip30: number; purchases: number; lastPurchaseAt: string | null; avgPurchase: number; balance: number; likeLimitHits7: number };
  signals: number;
}

const W = { GIFT: 6, CALL: 5, SUPERLIKE: 4, MESSAGE: 3, LIKE: 2, LIVE: 2, VISIT: 1, PASS: -1.5 } as const;
const TTL = 30 * 60_000;

export async function recordEvents(userId: string, events: { kind: string; targetId?: string | null; meta?: Record<string, unknown> }[]) {
  const rows = events.slice(0, 50).map((e) => ({ userId, kind: e.kind.slice(0, 40), targetId: e.targetId ?? null, meta: (e.meta ?? undefined) as object | undefined }));
  if (rows.length) await prisma.userEvent.createMany({ data: rows });
}

export async function getTaste(userId: string, force = false): Promise<Taste> {
  if (!force) {
    const c = await prisma.userTaste.findUnique({ where: { userId } });
    if (c && Date.now() - c.updatedAt.getTime() < TTL) return c.data as unknown as Taste;
  }
  const t = await computeTaste(userId);
  await prisma.userTaste.upsert({ where: { userId }, create: { userId, data: t as object }, update: { data: t as object } });
  return t;
}

async function computeTaste(userId: string): Promise<Taste> {
  const since = new Date(Date.now() - 60 * 86400_000);
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const [swipes, visits, msgConvs, gifts, calls, events, wallet, me] = await Promise.all([
    prisma.swipe.findMany({ where: { fromId: userId, createdAt: { gte: since } }, select: { toId: true, action: true } }),
    prisma.visit.findMany({ where: { viewerId: userId, createdAt: { gte: since } }, select: { viewedId: true } }),
    prisma.message.groupBy({ by: ['conversationId'], where: { senderId: userId, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.giftTransaction.groupBy({ by: ['receiverId'], where: { senderId: userId, createdAt: { gte: since } }, _sum: { coins: true } }),
    prisma.call.findMany({ where: { callerId: userId, createdAt: { gte: since }, startedAt: { not: null } }, select: { calleeId: true, billedMinutes: true } }),
    prisma.userEvent.findMany({ where: { userId, createdAt: { gte: since } }, select: { kind: true, targetId: true, meta: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 3000 }),
    prisma.walletTransaction.findMany({ where: { userId, currency: 'COIN', createdAt: { gte: since30 } }, select: { amount: true, type: true, createdAt: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { coins: true } }),
  ]);

  const weight = new Map<string, number>();
  const add = (id: string | null | undefined, w: number) => { if (id && id !== userId) weight.set(id, (weight.get(id) ?? 0) + w); };
  swipes.forEach((s) => add(s.toId, s.action === 'SUPERLIKE' ? W.SUPERLIKE : s.action === 'LIKE' ? W.LIKE : W.PASS));
  visits.forEach((v) => add(v.viewedId, W.VISIT));
  if (msgConvs.length) {
    const convs = await prisma.conversation.findMany({ where: { id: { in: msgConvs.map((m) => m.conversationId) } }, select: { id: true, userAId: true, userBId: true } });
    const cnt = new Map(msgConvs.map((m) => [m.conversationId, m._count._all]));
    convs.forEach((c) => add(c.userAId === userId ? c.userBId : c.userAId, W.MESSAGE * Math.min(3, 1 + Math.log2(cnt.get(c.id) ?? 1))));
  }
  gifts.forEach((g) => add(g.receiverId, W.GIFT * Math.min(3, 1 + Math.log10(1 + (g._sum.coins ?? 0) / 100))));
  calls.forEach((c) => add(c.calleeId, W.CALL * Math.min(3, 1 + c.billedMinutes / 10)));
  const screens: Record<string, number> = {};
  const hours = Array<number>(24).fill(0);
  let likeLimitHits7 = 0;
  for (const e of events) {
    hours[(e.createdAt.getUTCHours() + 4) % 24] += 1;
    if (e.kind === 'screen') { const n = String((e.meta as { name?: string } | null)?.name ?? ''); if (n) screens[n] = (screens[n] ?? 0) + 1; }
    else if (e.kind === 'profile_view') add(e.targetId, W.VISIT + (((e.meta as { ms?: number } | null)?.ms ?? 0) > 8000 ? 1 : 0));
    else if (e.kind === 'live_watch') add(e.targetId, W.LIVE);
    else if (e.kind === 'post_view') add(e.targetId, 0.5);
    else if (e.kind === 'like_limit' && Date.now() - e.createdAt.getTime() < 7 * 86400_000) likeLimitHits7 += 1;
  }

  const ids = [...weight.keys()].slice(0, 600);
  const targets = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, interests: true, birthDate: true, city: true, hostStatus: true } }) : [];
  const interests: Record<string, number> = {};
  const cities: Record<string, number> = {};
  let ageSum = 0, ageW = 0, age2 = 0, hostW = 0, totW = 0;
  for (const u of targets) {
    const w = weight.get(u.id) ?? 0;
    u.interests.forEach((i) => { interests[i] = (interests[i] ?? 0) + w; });
    if (w <= 0) continue;
    if (u.city) cities[u.city] = (cities[u.city] ?? 0) + w;
    const a = ageFrom(u.birthDate);
    if (a) { ageSum += a * w; age2 += a * a * w; ageW += w; }
    if (u.hostStatus === 'APPROVED') hostW += w;
    totW += w;
  }
  const maxI = Math.max(1, ...Object.values(interests).map((v) => Math.abs(v)));
  Object.keys(interests).forEach((k) => { interests[k] = Math.round((interests[k] / maxI) * 100) / 100; });
  const maxC = Math.max(1, ...Object.values(cities));
  Object.keys(cities).forEach((k) => { cities[k] = Math.round((cities[k] / maxC) * 100) / 100; });
  const ageMean = ageW ? ageSum / ageW : null;
  const ageStd = ageW && ageMean ? Math.max(2.5, Math.sqrt(Math.max(0, age2 / ageW - ageMean * ageMean))) : 6;

  // Kollektiv filtr: bəyəndiklərimi bəyənən başqa istifadəçilərin bəyəndikləri
  const liked = swipes.filter((s) => s.action !== 'PASS').map((s) => s.toId).slice(0, 100);
  const coLiked: Record<string, number> = {};
  if (liked.length) {
    const peers = await prisma.swipe.findMany({ where: { toId: { in: liked }, action: { not: 'PASS' }, fromId: { not: userId } }, select: { fromId: true }, take: 400 });
    const peerIds = [...new Set(peers.map((p) => p.fromId))].slice(0, 150);
    if (peerIds.length) {
      const theirs = await prisma.swipe.groupBy({ by: ['toId'], where: { fromId: { in: peerIds }, action: { not: 'PASS' }, toId: { notIn: [...liked, userId] } }, _count: { _all: true }, orderBy: { _count: { toId: 'desc' } }, take: 200 });
      theirs.forEach((r) => { coLiked[r.toId] = r._count._all; });
    }
  }

  const sum = (types: string[]) => wallet.filter((w) => w.amount < 0 && types.some((t) => w.type.startsWith(t))).reduce((a, w) => a - w.amount, 0);
  const purchases = await prisma.payment.findMany({ where: { userId, status: 'PAID' }, select: { amountQepik: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 20 });
  return {
    interests, ageMean, ageStd, cities,
    hostAffinity: totW ? Math.round((hostW / totW) * 100) / 100 : 0,
    screens, hours, coLiked,
    spend: {
      total30: sum(['']), gifts30: sum(['GIFT']), messages30: sum(['MESSAGE']), calls30: sum(['CALL']), vip30: sum(['VIP', 'NOBLE']),
      purchases: purchases.length, lastPurchaseAt: purchases[0]?.createdAt.toISOString() ?? null,
      avgPurchase: purchases.length ? Math.round(purchases.reduce((a, p) => a + p.amountQepik, 0) / purchases.length) : 0,
      balance: me.coins, likeLimitHits7,
    },
    signals: weight.size,
  };
}

/** Namizədə şəxsi xal (scoreCandidate-ə əlavə olunur). Siqnal azdırsa təsiri də azdır (soyuq start). */
export function tasteBoost(t: Taste, c: { id: string; interests: string[]; birthDate: Date | null; city: string; hostStatus: string }): number {
  const conf = Math.min(1, t.signals / 15);
  let s = 0;
  if (c.interests.length) {
    const m = c.interests.reduce((a, i) => a + (t.interests[i] ?? 0), 0) / Math.sqrt(c.interests.length);
    s += Math.max(-10, Math.min(28, m * 14));
  }
  const age = ageFrom(c.birthDate);
  if (age && t.ageMean) s += 12 * Math.exp(-((age - t.ageMean) ** 2) / (2 * t.ageStd ** 2));
  if (c.city && t.cities[c.city]) s += 6 * t.cities[c.city];
  if (c.hostStatus === 'APPROVED') s += 10 * (t.hostAffinity - 0.3);
  const co = t.coLiked[c.id] ?? 0;
  s += Math.min(18, co * 4);
  return s * (0.35 + 0.65 * conf);
}
