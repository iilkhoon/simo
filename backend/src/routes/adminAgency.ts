/**
 * Admin: pul çıxarışları (təsdiq / ödənildi / rədd + səbəb, Almaz qaytarılır), agentliklərin təsdiqi,
 * fərdi komissiya, hostların hesabatı, həftəlik agentlik hesabatı (bağlama) və CSV ixracı.
 * adminRoutes daxilində qeydiyyatdan keçir — requireAdmin hook-u bu marşrutlara da tətbiq olunur.
 */
import { z } from 'zod';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { uid } from '../lib/auth.js';
import { ECONOMY, weekKey } from '../economy.js';
import { agencyTerms, clearTierCache, creditDiamonds } from '../services/wallet.js';
import { hostsStats, periodStart } from '../services/hostStats.js';
import { notify } from '../services/notify.js';
import { emitToUser } from '../realtime/hub.js';

/** CSV hüceyrəsi: vergül, dırnaq, sətir sonu qorunur; Excel formula inyeksiyasına qarşı (=,+,-,@) */
export function csvCell(v: unknown): string {
  let s = v == null ? '' : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (rows: unknown[][]) => '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';

function sendCsv(reply: FastifyReply, name: string, rows: unknown[][]) {
  return reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${name}"`)
    .send(toCsv(rows));
}

/** Həftə açarı (bazar ertəsi, Bakı) → [başlanğıc, son) */
export function weekRange(week: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw err.badRequest('INVALID_WEEK');
  const from = new Date(`${week}T00:00:00+04:00`);
  if (Number.isNaN(from.getTime()) || weekKey(from) !== week) throw err.badRequest('INVALID_WEEK');
  return { from, to: new Date(from.getTime() + 7 * 86400_000) };
}

const azn = (units: number) => (units / 100).toFixed(2);

/** Həftə üzrə agentlik cəmləri (HostEarning-dən) */
async function weekTotals(week: string) {
  const { from, to } = weekRange(week);
  const rows = await prisma.hostEarning.groupBy({
    by: ['agencyId'],
    where: { createdAt: { gte: from, lt: to } },
    _sum: { paidCoins: true, hostAmount: true, agencyAmount: true },
  });
  const hosts = await prisma.hostEarning.groupBy({ by: ['agencyId', 'hostId'], where: { createdAt: { gte: from, lt: to } } });
  const hostCount = new Map<string, number>();
  for (const h of hosts) hostCount.set(h.agencyId, (hostCount.get(h.agencyId) ?? 0) + 1);
  const agencies = await prisma.agency.findMany({ where: { id: { in: rows.map((r) => r.agencyId) } }, include: { owner: { select: { shortId: true, name: true, phone: true } } } });
  const closed = await prisma.agencySettlement.findMany({ where: { week } });
  const closedBy = new Map(closed.map((c) => [c.agencyId, c]));
  const byId = new Map(agencies.map((a) => [a.id, a]));
  return rows
    .map((r) => ({
      agencyId: r.agencyId,
      agency: byId.get(r.agencyId) ? { name: byId.get(r.agencyId)!.name, code: byId.get(r.agencyId)!.code, owner: byId.get(r.agencyId)!.owner } : null,
      paidCoins: r._sum.paidCoins ?? 0,
      hostAmount: r._sum.hostAmount ?? 0,
      agencyAmount: r._sum.agencyAmount ?? 0,
      hosts: hostCount.get(r.agencyId) ?? 0,
      settlement: closedBy.get(r.agencyId) ?? null,
    }))
    .sort((a, b) => b.paidCoins - a.paidCoins);
}

export function registerAgencyAdmin(app: FastifyInstance) {
  /* ───────── Pul çıxarışları ───────── */
  app.get('/admin/withdrawals', async (req) => {
    const q = z.object({ status: z.enum(['OPEN', 'PENDING', 'APPROVED', 'PAID', 'REJECTED', 'ALL']).default('OPEN') }).parse(req.query);
    const where = q.status === 'ALL' ? {} : q.status === 'OPEN' ? { status: { in: ['PENDING', 'APPROVED'] as ('PENDING' | 'APPROVED')[] } } : { status: q.status };
    const items = await prisma.withdrawal.findMany({
      where,
      include: { user: { select: { id: true, shortId: true, name: true, phone: true, avatarUrl: true, kycStatus: true, agency: { select: { name: true, code: true } } } } },
      orderBy: { createdAt: q.status === 'OPEN' ? 'asc' : 'desc' },
      take: 300,
    });
    return { items };
  });

  /**
   * Status keçidləri: PENDING → APPROVED → PAID; PENDING/APPROVED → REJECTED (səbəb məcburi, Almaz qaytarılır).
   * Şərti yeniləmə: iki admin eyni anda rədd etsə belə Almaz bir dəfə qaytarılır.
   */
  app.post('/admin/withdrawals/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({
      status: z.enum(['APPROVED', 'PAID', 'REJECTED']),
      reason: z.string().trim().max(300).optional(),
      note: z.string().trim().max(300).optional(),
    }).parse(req.body);
    const reason = (b.reason ?? b.note ?? '').trim();
    if (b.status === 'REJECTED' && reason.length < 3) throw err.badRequest('REASON_REQUIRED');
    const from = b.status === 'APPROVED' ? ['PENDING'] : ['PENDING', 'APPROVED'];
    const w = await prisma.$transaction(async (tx) => {
      const cur = await tx.withdrawal.findUnique({ where: { id } });
      if (!cur) throw err.notFound();
      const upd = await tx.withdrawal.updateMany({
        where: { id, status: { in: from as ('PENDING' | 'APPROVED')[] } },
        data: { status: b.status, processedAt: new Date(), ...(b.status === 'REJECTED' ? { rejectReason: reason } : {}), ...(reason && b.status !== 'REJECTED' ? { note: `${cur.note} | ${reason}`.slice(0, 500) } : {}) },
      });
      if (upd.count === 0) throw err.badRequest('WITHDRAW_PROCESSED');
      // Almazlar geri qaytarılır (qazanılmış kimi — yenidən çıxarıla bilər; gözləmə müddətinə düşmür)
      if (b.status === 'REJECTED') await creditDiamonds(tx, cur.userId, cur.diamonds, 'WITHDRAW_REFUND', cur.id, reason.slice(0, 200));
      return tx.withdrawal.findUniqueOrThrow({ where: { id } });
    });
    emitToUser(w.userId, 'withdrawal:status', { id: w.id, status: w.status, reason: w.rejectReason });
    void notify(w.userId, 'withdrawal', { body: b.status === 'REJECTED' ? reason : `${(w.amountQepik / 100).toFixed(2)} ₼`, data: { withdrawalId: w.id, status: w.status } }).catch(() => {});
    return { ok: true, withdrawal: w };
  });

  app.get('/admin/withdrawals.csv', async (req, reply) => {
    const q = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), status: z.enum(['PENDING', 'APPROVED', 'PAID', 'REJECTED']).optional() }).parse(req.query);
    const items = await prisma.withdrawal.findMany({
      where: { ...(q.status ? { status: q.status } : {}), createdAt: { gte: q.from ?? new Date(Date.now() - 31 * 86400_000), ...(q.to ? { lt: q.to } : {}) } },
      include: { user: { select: { shortId: true, name: true, phone: true, agency: { select: { name: true, code: true } } } } },
      orderBy: { createdAt: 'asc' },
      take: 10_000,
    });
    return sendCsv(reply, `withdrawals_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['id', 'created_at', 'processed_at', 'status', 'user_id', 'name', 'phone', 'agency', 'almaz', 'gross_azn', 'fee_azn', 'net_azn', 'method', 'account', 'reject_reason'],
      ...items.map((w) => [w.id, w.createdAt, w.processedAt, w.status, w.user.shortId, w.user.name, w.user.phone, w.user.agency ? `${w.user.agency.name} (${w.user.agency.code})` : '', w.diamonds / ECONOMY.almazUnit, azn(w.amountQepik + w.feeQepik), azn(w.feeQepik), azn(w.amountQepik), w.method, w.account, w.rejectReason]),
    ]);
  });

  /* ───────── Agentliklər ───────── */
  app.get('/admin/agencies', async () => {
    const list = await prisma.agency.findMany({ include: { owner: { select: { shortId: true, name: true, kycStatus: true } }, _count: { select: { members: true } } }, orderBy: { createdAt: 'desc' } });
    const weekStart = periodStart('week');
    const week = await prisma.hostEarning.groupBy({ by: ['agencyId'], where: { createdAt: { gte: weekStart } }, _sum: { hostAmount: true, agencyAmount: true, paidCoins: true } });
    const wk = new Map(week.map((w) => [w.agencyId, w._sum]));
    const items = await Promise.all(list.map(async (a) => {
      const t = await agencyTerms(prisma, a, true);
      const w = wk.get(a.id);
      return {
        ...a, monthlyDiamonds: t.monthly, tier: t.tier.tier, tierName: t.tier.name, tierShare: t.tier.share, share: t.share, custom: t.custom,
        week: { paidCoins: w?.paidCoins ?? 0, hostAmount: w?.hostAmount ?? 0, agencyAmount: w?.agencyAmount ?? 0 },
      };
    }));
    return { items, hostShare: ECONOMY.hostShare, maxAgencyShare: ECONOMY.maxAgencyShare };
  });

  /** Status (təsdiq / dayandırma + səbəb) və fərdi komissiya (0..30%, null — avtomatik səviyyə) */
  app.post('/admin/agencies/:id', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const b = z.object({
      status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
      rejectReason: z.string().max(300).optional(),
      customShare: z.number().min(0).max(ECONOMY.maxAgencyShare).nullable().optional(),
    }).parse(req.body);
    const before = await prisma.agency.findUnique({ where: { id }, include: { owner: { select: { kycStatus: true, agencyId: true } } } });
    if (!before) throw err.notFound('AGENCY_NOT_FOUND');
    if (b.status === 'ACTIVE' && before.owner.kycStatus !== 'APPROVED') throw err.badRequest('OWNER_KYC_REQUIRED');
    if (b.status === 'ACTIVE' && before.owner.agencyId && before.owner.agencyId !== id) throw err.badRequest('OWNER_IN_OTHER_AGENCY');
    const a = await prisma.agency.update({
      where: { id },
      data: {
        ...(b.status ? { status: b.status, reviewedAt: new Date() } : {}),
        ...(b.rejectReason !== undefined ? { rejectReason: b.rejectReason } : b.status === 'ACTIVE' ? { rejectReason: '' } : {}),
        ...(b.customShare !== undefined ? { customShare: b.customShare } : {}),
      },
    });
    clearTierCache(a.id);
    if (b.status === 'ACTIVE') {
      // Agentlik sahibi də qazanc əldə edə bilsin deyə agentliyin üzvü və host olur
      await prisma.user.update({ where: { id: a.ownerId }, data: { agencyId: a.id, agencyJoinedAt: before.status === 'ACTIVE' ? undefined : new Date(), hostStatus: 'APPROVED' } });
    }
    if (b.status) {
      emitToUser(a.ownerId, 'agency:status', { status: a.status, reason: a.rejectReason });
      void notify(a.ownerId, 'agency_update', { body: a.rejectReason || undefined, data: { event: `AGENCY_${a.status}`, agencyId: a.id } }).catch(() => {});
    }
    return { ok: true, agency: a };
  });

  /** Agentliyin hostları: dövr üzrə qazanc, komissiya, onlayn və zəng dəqiqələri */
  app.get('/admin/agencies/:id/hosts', async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const q = z.object({ period: z.enum(['today', 'week', 'month']).default('week') }).parse(req.query);
    const members = await prisma.user.findMany({ where: { agencyId: id }, select: { id: true, shortId: true, name: true, avatarUrl: true, online: true, lastSeenAt: true, agencyJoinedAt: true, kycStatus: true } });
    const stats = await hostsStats(members.map((m) => m.id), periodStart(q.period), id);
    return { items: members.map((m) => ({ ...m, ...stats.get(m.id)! })).sort((a, b) => b.hostAmount - a.hostAmount) };
  });

  /* ───────── Həftəlik agentlik hesabatı ───────── */
  app.get('/admin/settlements', async (req) => {
    const q = z.object({ week: z.string().optional() }).parse(req.query);
    const week = q.week ?? weekKey(new Date(Date.now() - 7 * 86400_000));
    return { week, currentWeek: weekKey(), items: await weekTotals(week) };
  });

  /** Həftəni bağlamaq: cəmlər qeyd olunur (təkrar bağlama olmur). Ödəniş sahibin çıxarışı ilə edilir. */
  app.post('/admin/settlements/close', async (req) => {
    const b = z.object({ agencyId: z.string(), week: z.string(), note: z.string().max(300).default('') }).parse(req.body);
    const { to } = weekRange(b.week);
    if (to.getTime() > Date.now()) throw err.badRequest('WEEK_NOT_FINISHED');
    const t = (await weekTotals(b.week)).find((x) => x.agencyId === b.agencyId);
    if (!t) throw err.notFound('NOTHING_TO_SETTLE');
    if (t.settlement) throw err.badRequest('ALREADY_SETTLED');
    try {
      const s = await prisma.agencySettlement.create({
        data: { agencyId: b.agencyId, week: b.week, paidCoins: t.paidCoins, hostAmount: t.hostAmount, agencyAmount: t.agencyAmount, hosts: t.hosts, note: b.note, closedById: uid(req) },
      });
      return { ok: true, settlement: s };
    } catch {
      throw err.badRequest('ALREADY_SETTLED');
    }
  });

  app.get('/admin/settlements.csv', async (req, reply) => {
    const q = z.object({ week: z.string() }).parse(req.query);
    const items = await weekTotals(q.week);
    return sendCsv(reply, `agency_week_${q.week}.csv`, [
      ['week', 'agency', 'code', 'owner_id', 'owner_name', 'owner_phone', 'hosts', 'paid_nar', 'host_almaz', 'host_azn', 'agency_almaz', 'agency_azn', 'settled_at'],
      ...items.map((r) => [q.week, r.agency?.name, r.agency?.code, r.agency?.owner.shortId, r.agency?.owner.name, r.agency?.owner.phone, r.hosts, r.paidCoins, r.hostAmount / ECONOMY.almazUnit, azn(r.hostAmount), r.agencyAmount / ECONOMY.almazUnit, azn(r.agencyAmount), r.settlement?.createdAt]),
    ]);
  });

  /** Bir agentliyin həftəlik host hesabatı (CSV) */
  app.get('/admin/agencies/:id/report.csv', async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const q = z.object({ week: z.string() }).parse(req.query);
    const { from, to } = weekRange(q.week);
    const rows = await prisma.hostEarning.groupBy({ by: ['hostId', 'source'], where: { agencyId: id, createdAt: { gte: from, lt: to } }, _sum: { paidCoins: true, hostAmount: true, agencyAmount: true } });
    const users = await prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.hostId))] } }, select: { id: true, shortId: true, name: true } });
    const u = new Map(users.map((x) => [x.id, x]));
    return sendCsv(reply, `agency_${id}_${q.week}.csv`, [
      ['week', 'host_id', 'host_name', 'source', 'paid_nar', 'host_almaz', 'agency_almaz'],
      ...rows.map((r) => [q.week, u.get(r.hostId)?.shortId, u.get(r.hostId)?.name, r.source, r._sum.paidCoins ?? 0, (r._sum.hostAmount ?? 0) / ECONOMY.almazUnit, (r._sum.agencyAmount ?? 0) / ECONOMY.almazUnit]),
    ]);
  });
}
