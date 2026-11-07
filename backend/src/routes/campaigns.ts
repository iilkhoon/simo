import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { err } from '../lib/errors.js';
import { requireAdmin, requireAuth, uid } from '../lib/auth.js';
import { campaignLeaderboard, campaignMyScore, campaignTemplates, presentCampaign, visibleCampaigns } from '../services/growth.js';

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const text = (max: number) => z.string().trim().max(max);

const campaignBody = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
  titleAz: text(80).min(1), titleRu: text(80).min(1), titleEn: text(80).min(1),
  subtitleAz: text(200).default(''), subtitleRu: text(200).default(''), subtitleEn: text(200).default(''),
  prizesAz: text(1000).default(''), prizesRu: text(1000).default(''), prizesEn: text(1000).default(''),
  emoji: text(8).min(1).default('🎉'),
  color: hex.default('#FF3D7F'), color2: hex.default('#7B5CFF'),
  imageUrl: z.string().url().max(500).nullish(),
  giftIds: z.array(z.string().max(40)).max(30).default([]),
  startsAt: z.coerce.date(), endsAt: z.coerce.date(),
  active: z.boolean().default(true),
  announce: z.boolean().default(true),
});

async function assertGifts(ids: string[]) {
  if (!ids.length) return;
  const found = await prisma.gift.count({ where: { id: { in: ids }, active: true } });
  if (found !== new Set(ids).size) throw err.badRequest('UNKNOWN_GIFT');
}

export default async function campaignRoutes(app: FastifyInstance) {
  /** Tətbiqdə görünən kampaniyalar (banner, hədiyyə tabı) */
  app.get('/campaigns', { preHandler: requireAuth }, async () => ({ items: await visibleCampaigns() }));

  /** Kampaniya səhifəsi: məlumat, iki reytinq (səxavətlilər / hostlar) və mənim xalım */
  app.get('/campaigns/:id', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string().max(80) }).parse(req.params);
    const c = await prisma.campaign.findFirst({ where: { OR: [{ id }, { slug: id }], active: true } });
    if (!c) throw err.notFound('CAMPAIGN_NOT_FOUND');
    const [senders, hosts, me] = await Promise.all([campaignLeaderboard(c, 'senders'), campaignLeaderboard(c, 'hosts'), campaignMyScore(c, uid(req))]);
    return { campaign: presentCampaign(c), senders, hosts, me };
  });

  /* ───── Admin ───── */
  app.get('/admin/campaigns', { preHandler: requireAdmin }, async () => {
    const items = await prisma.campaign.findMany({ orderBy: { startsAt: 'desc' }, take: 100 });
    return { items: items.map((c) => ({ ...c, status: presentCampaign(c).status })) };
  });

  app.get('/admin/campaigns/templates', { preHandler: requireAdmin }, async () => ({ items: campaignTemplates() }));

  app.post('/admin/campaigns', { preHandler: requireAdmin }, async (req) => {
    const b = campaignBody.parse(req.body);
    if (b.endsAt <= b.startsAt) throw err.badRequest('BAD_DATES');
    await assertGifts(b.giftIds);
    if (await prisma.campaign.findUnique({ where: { slug: b.slug } })) throw err.badRequest('SLUG_TAKEN');
    const c = await prisma.campaign.create({ data: { ...b, imageUrl: b.imageUrl ?? null } });
    return { campaign: c };
  });

  app.patch('/admin/campaigns/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const cur = await prisma.campaign.findUnique({ where: { id } });
    if (!cur) throw err.notFound('CAMPAIGN_NOT_FOUND');
    const b = campaignBody.partial().parse(req.body);
    const startsAt = b.startsAt ?? cur.startsAt;
    const endsAt = b.endsAt ?? cur.endsAt;
    if (endsAt <= startsAt) throw err.badRequest('BAD_DATES');
    if (b.giftIds) await assertGifts(b.giftIds);
    if (b.slug && b.slug !== cur.slug && (await prisma.campaign.findUnique({ where: { slug: b.slug } }))) throw err.badRequest('SLUG_TAKEN');
    // Başlama vaxtı gələcəyə köçürülübsə — anons yenidən göndərilə bilər
    const reannounce = b.startsAt && b.startsAt > new Date() ? { announcedAt: null } : {};
    const c = await prisma.campaign.update({ where: { id }, data: { ...b, ...reannounce } });
    return { campaign: c };
  });

  /** Silmək əvəzinə söndürülür — reytinq tarixçəsi qalır */
  app.delete('/admin/campaigns/:id', { preHandler: requireAdmin }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const r = await prisma.campaign.updateMany({ where: { id }, data: { active: false } });
    if (!r.count) throw err.notFound('CAMPAIGN_NOT_FOUND');
    return { ok: true };
  });
}
