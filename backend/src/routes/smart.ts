import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { requireAuth, uid } from '../lib/auth.js';
import { recordEvents, getTaste } from '../services/taste.js';
import { activeOffers, generateOffers } from '../services/smart.js';

export default async function smartRoutes(app: FastifyInstance) {
  /** Tətbiq davranış hadisələrini toplu göndərir: ekran, profil/post baxışı (müddətlə), canlı yayın, axtarış, limit */
  app.post('/events', { preHandler: requireAuth, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req) => {
    const b = z.object({
      events: z.array(z.object({
        kind: z.enum(['screen', 'profile_view', 'post_view', 'live_watch', 'search', 'hashtag', 'like_limit', 'offer_view', 'paywall_view']),
        targetId: z.string().max(64).nullish(),
        meta: z.record(z.string(), z.union([z.string().max(80), z.number(), z.boolean()])).optional(),
      })).max(50),
    }).parse(req.body);
    await recordEvents(uid(req), b.events);
    return { ok: true };
  });

  /** Fərdi təkliflər (yoxdursa — indi yaradılır) */
  app.get('/me/offers', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    await generateOffers(me).catch(() => {});
    return { items: await activeOffers(me) };
  });

  /** "Səni necə tanıyırıq" — şəffaflıq: alqoritmin öyrəndiyi əsas maraqlar */
  app.get('/me/taste', { preHandler: requireAuth }, async (req) => {
    const t = await getTaste(uid(req), true);
    const top = Object.entries(t.interests).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
    return { interests: top, ageMean: t.ageMean ? Math.round(t.ageMean) : null, signals: t.signals };
  });
}
