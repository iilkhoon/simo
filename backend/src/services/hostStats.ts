/**
 * Host aktivliyi və qazanc statistikası: onlayn vaxt (dəqiqəlik sayğac), zəng dəqiqələri, qazanc bölgüsü.
 * Agentlik paneli, host hədəfləri və admin hesabatları bu funksiyalardan istifadə edir.
 */
import { prisma } from '../db.js';
import { HOST_TARGETS, todayKey } from '../economy.js';

const TICK_SEC = 60;

/** Hər dəqiqə: hazırda onlayn olan agentlik hostlarına +60 saniyə onlayn vaxt yazır (Bakı günü üzrə) */
export async function hostOnlineTick(day = todayKey()) {
  await prisma.$executeRaw`
    INSERT INTO "HostDailyStat" ("userId", "day", "onlineSec")
    SELECT "id", ${day}, ${TICK_SEC} FROM "User"
    WHERE "online" = true AND "agencyId" IS NOT NULL AND "hostStatus" = 'APPROVED' AND "banned" = false AND "deletedAt" IS NULL
    ON CONFLICT ("userId", "day") DO UPDATE SET "onlineSec" = "HostDailyStat"."onlineSec" + ${TICK_SEC}`;
}

export function startHostStats() {
  setInterval(() => void hostOnlineTick().catch((e) => console.error('host stats', e)), TICK_SEC * 1000).unref();
}

export type Period = 'today' | 'week' | 'month';

/** Dövrün başlanğıcı (Bakı vaxtı, UTC+4): bu gün 00:00, bu həftə bazar ertəsi, bu ay 1-i */
export function periodStart(period: Period, now = new Date()): Date {
  const baku = new Date(now.getTime() + 4 * 3600_000);
  let d = new Date(Date.UTC(baku.getUTCFullYear(), baku.getUTCMonth(), baku.getUTCDate()));
  if (period === 'week') d = new Date(d.getTime() - ((baku.getUTCDay() + 6) % 7) * 86400_000);
  if (period === 'month') d = new Date(Date.UTC(baku.getUTCFullYear(), baku.getUTCMonth(), 1));
  return new Date(d.getTime() - 4 * 3600_000);
}

/** Bakı gün açarları: [from, to] */
export function dayKeysBetween(from: Date, to = new Date()): string[] {
  const out: string[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += 86400_000) out.push(todayKey(new Date(t)));
  const last = todayKey(to);
  if (!out.includes(last)) out.push(last);
  return [...new Set(out)];
}

export interface HostPeriodStats {
  hostAmount: number;
  agencyAmount: number;
  paidCoins: number;
  bySource: Record<string, number>;
  onlineMin: number;
  callMin: number;
  calls: number;
  gifts: number;
}

const emptyStats = (): HostPeriodStats => ({ hostAmount: 0, agencyAmount: 0, paidCoins: 0, bySource: {}, onlineMin: 0, callMin: 0, calls: 0, gifts: 0 });

/** Bir neçə host üçün dövr statistikası (agentliyə görə filtr: yalnız bu agentlikdə qazanılanlar) */
export async function hostsStats(hostIds: string[], since: Date, agencyId?: string): Promise<Map<string, HostPeriodStats>> {
  const out = new Map<string, HostPeriodStats>(hostIds.map((id) => [id, emptyStats()]));
  if (!hostIds.length) return out;
  const days = dayKeysBetween(since);
  const [earn, online, calls] = await Promise.all([
    prisma.hostEarning.groupBy({
      by: ['hostId', 'source'],
      where: { hostId: { in: hostIds }, createdAt: { gte: since }, ...(agencyId ? { agencyId } : {}) },
      _sum: { hostAmount: true, agencyAmount: true, paidCoins: true },
      _count: { _all: true },
    }),
    prisma.hostDailyStat.groupBy({ by: ['userId'], where: { userId: { in: hostIds }, day: { in: days } }, _sum: { onlineSec: true } }),
    prisma.call.findMany({
      where: { calleeId: { in: hostIds }, startedAt: { gte: since }, status: { in: ['ENDED', 'ACTIVE'] } },
      select: { calleeId: true, startedAt: true, endedAt: true },
    }),
  ]);
  for (const e of earn) {
    const s = out.get(e.hostId)!;
    const h = e._sum.hostAmount ?? 0;
    s.hostAmount += h;
    s.agencyAmount += e._sum.agencyAmount ?? 0;
    s.paidCoins += e._sum.paidCoins ?? 0;
    s.bySource[e.source] = (s.bySource[e.source] ?? 0) + h;
    if (e.source === 'GIFT') s.gifts += e._count._all;
  }
  for (const o of online) out.get(o.userId)!.onlineMin = Math.floor((o._sum.onlineSec ?? 0) / 60);
  for (const c of calls) {
    const s = out.get(c.calleeId)!;
    s.calls += 1;
    if (c.startedAt) s.callMin += Math.max(0, Math.round(((c.endedAt ?? new Date()).getTime() - c.startedAt.getTime()) / 60_000));
  }
  return out;
}

/** Hostun bu günkü və bu həftəki hədəf irəliləyişi */
export async function hostTargets(userId: string) {
  const weekStart = periodStart('week');
  const days = dayKeysBetween(weekStart);
  const today = todayKey();
  const [online, calls] = await Promise.all([
    prisma.hostDailyStat.findMany({ where: { userId, day: { in: days } } }),
    prisma.call.findMany({ where: { calleeId: userId, startedAt: { gte: weekStart }, status: { in: ['ENDED', 'ACTIVE'] } }, select: { startedAt: true, endedAt: true } }),
  ]);
  const callMinByDay = new Map<string, number>();
  for (const c of calls) {
    if (!c.startedAt) continue;
    const k = todayKey(c.startedAt);
    callMinByDay.set(k, (callMinByDay.get(k) ?? 0) + Math.round(((c.endedAt ?? new Date()).getTime() - c.startedAt.getTime()) / 60_000));
  }
  const onlineByDay = new Map(online.map((o) => [o.day, Math.floor(o.onlineSec / 60)]));
  const week = days.map((d) => {
    const onlineMin = onlineByDay.get(d) ?? 0;
    const callMin = callMinByDay.get(d) ?? 0;
    return { day: d, onlineMin, callMin, done: onlineMin >= HOST_TARGETS.dailyOnlineMin && callMin >= HOST_TARGETS.dailyCallMin };
  });
  const t = week.find((w) => w.day === today) ?? { day: today, onlineMin: 0, callMin: 0, done: false };
  return {
    targets: HOST_TARGETS,
    today: { onlineMin: t.onlineMin, callMin: t.callMin, done: t.done },
    week,
    activeDays: week.filter((w) => w.done).length,
  };
}
