/**
 * Böyümə mexanikaları (docs/PRODUCT_PROPOSALS.md):
 *   1) Mövsümi kampaniyalar — admin Novruz / 8 Mart / 14 Fevral / Ramazan / Yeni il kampaniyasını planlaşdırır:
 *      banner, hədiyyə pəncərəsində xüsusi tab, kampaniya hədiyyələri üzrə reytinq (göndərənlər və hostlar),
 *      başlayanda aktiv istifadəçilərə bir dəfə push.
 *   2) "Host onlayn oldu" — host tətbiqə girəndə onu izləyənlərə push (Bigo/Chamet-in "followed host online" bildirişi).
 *      Spam olmasın: host başına 6 saatda bir, izləyici başına gündə ən çox 2, gecə (23:00–09:00 Bakı) göndərilmir,
 *      əvvəl həmin hosta pul xərcləmiş izləyicilər birinci.
 */
import { prisma } from '../db.js';
import { publicUserSelect, presentUser } from '../lib/present.js';
import { notify } from './notify.js';

const H = 3600_000;
/** Bakı vaxtı UTC+4 (yay vaxtı yoxdur) */
export const bakuHour = (now = new Date()) => (now.getUTCHours() + 4) % 24;
export const quietHours = (now = new Date()) => { const h = bakuHour(now); return h >= 23 || h < 9; };

export const HOST_ONLINE_COOLDOWN_H = 6;
export const HOST_ONLINE_PER_FOLLOWER_DAY = 2;
export const HOST_ONLINE_MAX_FOLLOWERS = 200;

/* ───────────────────────── Kampaniyalar ───────────────────────── */

type CampaignRow = Awaited<ReturnType<typeof prisma.campaign.findFirstOrThrow>>;

export function campaignStatus(c: Pick<CampaignRow, 'startsAt' | 'endsAt'>, now = new Date()): 'upcoming' | 'live' | 'ended' {
  if (now < c.startsAt) return 'upcoming';
  return now < c.endsAt ? 'live' : 'ended';
}

export function presentCampaign(c: CampaignRow, now = new Date()) {
  return {
    id: c.id, slug: c.slug,
    title: { az: c.titleAz, ru: c.titleRu, en: c.titleEn },
    subtitle: { az: c.subtitleAz, ru: c.subtitleRu, en: c.subtitleEn },
    prizes: { az: c.prizesAz, ru: c.prizesRu, en: c.prizesEn },
    emoji: c.emoji, color: c.color, color2: c.color2, imageUrl: c.imageUrl,
    giftIds: c.giftIds, startsAt: c.startsAt, endsAt: c.endsAt,
    status: campaignStatus(c, now),
  };
}

/** Tətbiqdə görünən kampaniyalar: gedən, 7 gün ərzində başlayacaq (anons) və son 3 gündə bitmiş (nəticələr) */
export async function visibleCampaigns(now = new Date()) {
  const rows = await prisma.campaign.findMany({
    where: { active: true, startsAt: { lte: new Date(now.getTime() + 7 * 24 * H) }, endsAt: { gte: new Date(now.getTime() - 3 * 24 * H) } },
    orderBy: { startsAt: 'asc' },
  });
  const rank = { live: 0, upcoming: 1, ended: 2 } as const;
  return rows.map((c) => presentCampaign(c, now)).sort((a, b) => rank[a.status] - rank[b.status]);
}

/** Kampaniya pəncərəsindəki uyğun hədiyyə əməliyyatları. Hədiyyə siyahısı boşdursa — bütün Nar hədiyyələri (Almaz hədiyyələri ayrı vahiddir) */
async function campaignGiftWhere(c: CampaignRow, now: Date) {
  const giftId = c.giftIds.length
    ? { in: c.giftIds }
    : { notIn: (await prisma.gift.findMany({ where: { currency: 'DIAMOND' }, select: { id: true } })).map((g) => g.id) };
  return { giftId, createdAt: { gte: c.startsAt, lt: now < c.endsAt ? now : c.endsAt } };
}

/** Kampaniya hədiyyələrinin dəyəri üzrə reytinq */
export async function campaignLeaderboard(c: CampaignRow, by: 'senders' | 'hosts', limit = 20, now = new Date()) {
  const where = await campaignGiftWhere(c, now);
  const field = by === 'senders' ? 'senderId' : 'receiverId';
  const grouped = await prisma.giftTransaction.groupBy({ by: [field], where, _sum: { coins: true }, orderBy: { _sum: { coins: 'desc' } }, take: limit + 30 });
  const ids = grouped.map((g) => (g as unknown as Record<string, string>)[field]);
  // Test hesabları, silinmiş və bloklanmış hesablar reytinqdə görünmür
  const users = await prisma.user.findMany({ where: { id: { in: ids }, deletedAt: null, banned: false, isTester: false }, select: { ...publicUserSelect, photos: true } });
  const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
  const rows: { rank: number; score: number; user: ReturnType<typeof presentUser> }[] = [];
  grouped.forEach((g, i) => {
    const u = byId.get(ids[i]);
    if (u && rows.length < limit) rows.push({ rank: rows.length + 1, score: g._sum.coins ?? 0, user: u });
  });
  return rows;
}

/** İstifadəçinin öz xalı (göndərdiyi + qəbul etdiyi) */
export async function campaignMyScore(c: CampaignRow, userId: string, now = new Date()) {
  const base = await campaignGiftWhere(c, now);
  const [sent, received] = await Promise.all([
    prisma.giftTransaction.aggregate({ where: { ...base, senderId: userId }, _sum: { coins: true } }),
    prisma.giftTransaction.aggregate({ where: { ...base, receiverId: userId }, _sum: { coins: true } }),
  ]);
  return { sent: sent._sum.coins ?? 0, received: received._sum.coins ?? 0 };
}

/** Başlamış, hələ anons olunmamış kampaniyalar üçün bir dəfəlik push (gecə gözləyir) */
export async function campaignTick(now = new Date(), maxUsers = 5000) {
  if (quietHours(now)) return 0;
  const due = await prisma.campaign.findMany({ where: { active: true, announce: true, announcedAt: null, startsAt: { lte: now }, endsAt: { gt: now } } });
  let sent = 0;
  for (const c of due) {
    // Əvvəl "iddia et" — iki server prosesi eyni kampaniyanı iki dəfə göndərməsin
    const claimed = await prisma.campaign.updateMany({ where: { id: c.id, announcedAt: null }, data: { announcedAt: now } });
    if (!claimed.count) continue;
    const users = await prisma.user.findMany({
      where: { onboarded: true, banned: false, deletedAt: null, lastSeenAt: { gte: new Date(now.getTime() - 14 * 24 * H) } },
      select: { id: true }, orderBy: { lastSeenAt: 'desc' }, take: maxUsers,
    });
    for (const u of users) {
      await notify(u.id, 'campaign', { data: { campaignId: c.id, emoji: c.emoji, titleAz: c.titleAz, titleRu: c.titleRu, titleEn: c.titleEn }, pushIfOnline: true }).catch(() => {});
      sent++;
    }
  }
  return sent;
}

/** Admin üçün hazır şablonlar (Azərbaycan təqvimi). Tarix — növbəti baş verən gün */
export function campaignTemplates(now = new Date()) {
  const y = now.getUTCFullYear();
  // Bakı gecə yarısı = 20:00 UTC əvvəlki gün
  const at = (yy: number, m: number, d: number, days: number) => {
    const s = new Date(Date.UTC(yy, m - 1, d) - 4 * H);
    return { startsAt: s, endsAt: new Date(s.getTime() + days * 24 * H) };
  };
  const next = (m: number, d: number, days: number, lead = 0) => {
    let w = at(y, m, d - lead, days + lead);
    if (w.endsAt < now) w = at(y + 1, m, d - lead, days + lead);
    return w;
  };
  // Ramazan bayramı (Eid al-Fitr) — Hicri təqvim: ildən-ilə dəyişir, admin dəqiqləşdirməlidir
  const EID: Record<number, [number, number]> = { 2026: [3, 20], 2027: [3, 10], 2028: [2, 27], 2029: [2, 15], 2030: [2, 5] };
  const eidYear = [y, y + 1].find((yy) => EID[yy] && at(yy, ...EID[yy], 3).endsAt > now) ?? y + 1;
  const [em, ed] = EID[eidYear] ?? [3, 10];
  return [
    { slug: `valentine-${next(2, 14, 1, 3).startsAt.getUTCFullYear()}`, emoji: '💘', color: '#FF3D7F', color2: '#B5179E', giftIds: ['rose', 'heart', 'kiss', 'bouquet', 'ring', 'love_planet'], ...next(2, 14, 1, 3),
      titleAz: 'Sevgililər həftəsi', titleRu: 'Неделя влюблённых', titleEn: "Valentine's week",
      subtitleAz: 'Romantik hədiyyələr göndər — ən çox sevgi yayan zirvəyə çıxır', subtitleRu: 'Дари романтичные подарки — самые щедрые наверху', subtitleEn: 'Send romantic gifts — the most loving climb to the top' },
    { slug: `women-day-${next(3, 8, 1, 2).startsAt.getUTCFullYear()}`, emoji: '🌷', color: '#FF7AA8', color2: '#FFB020', giftIds: ['rose', 'bouquet', 'perfume', 'chocolate', 'crown'], ...next(3, 8, 1, 2),
      titleAz: '8 Mart — Qadınlar günü', titleRu: '8 Марта', titleEn: "Women's Day",
      subtitleAz: 'Gül və ətir hədiyyələri ilə təbrik et', subtitleRu: 'Поздравь цветами и духами', subtitleEn: 'Celebrate with flowers and perfume' },
    { slug: `novruz-${next(3, 20, 5, 7).startsAt.getUTCFullYear()}`, emoji: '🔥', color: '#34A853', color2: '#FFB020', giftIds: ['shekerbura', 'pomegranate', 'tea', 'buta', 'tar', 'fireworks', 'maiden_tower'], ...next(3, 20, 5, 7),
      titleAz: 'Novruz bayramı', titleRu: 'Новруз байрамы', titleEn: 'Novruz holiday',
      subtitleAz: 'Çərşənbələr boyunca milli hədiyyələr — tonqal kimi alovlan', subtitleRu: 'Национальные подарки все Чершенбе', subtitleEn: 'National gifts through every Charshanba' },
    { slug: `ramazan-${eidYear}`, emoji: '🌙', color: '#2F7BFF', color2: '#7B5CFF', giftIds: ['tea', 'pomegranate', 'shekerbura', 'bouquet', 'caspian'], ...at(eidYear, em, ed, 3),
      titleAz: 'Ramazan bayramı', titleRu: 'Рамазан байрамы', titleEn: 'Eid al-Fitr',
      subtitleAz: 'Bayram təbrikləri — tarixi admin dəqiqləşdirsin', subtitleRu: 'Праздничные поздравления', subtitleEn: 'Holiday greetings' },
    { slug: `new-year-${next(12, 31, 3, 6).startsAt.getUTCFullYear() + 1}`, emoji: '🎆', color: '#7B5CFF', color2: '#FF3D7F', giftIds: ['fireworks', 'champagne', 'crown', 'rocket', 'yacht'], ...next(12, 31, 3, 6),
      titleAz: 'Yeni il marafonu', titleRu: 'Новогодний марафон', titleEn: 'New Year marathon',
      subtitleAz: 'Atəşfəşanlıq və şampan — ilin ən səxavətlisi kimdir?', subtitleRu: 'Фейерверки и шампанское — кто самый щедрый?', subtitleEn: 'Fireworks and champagne — who is the most generous?' },
  ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/* ───────────────────────── Host onlayn oldu ───────────────────────── */

/**
 * Host tətbiqə qoşulanda (ilk soket) çağırılır. Göndərilən izləyici sayını qaytarır.
 * Şərtlər: təsdiqlənmiş host, gizli rejimdə / "məşğul" / "uzaqda" deyil, son göndərişdən 6 saat keçib, gecə deyil.
 */
export async function hostCameOnline(hostId: string, now = new Date()): Promise<number> {
  if (quietHours(now)) return 0;
  const host = await prisma.user.findUnique({ where: { id: hostId }, select: { id: true, name: true, hostStatus: true, incognito: true, presence: true, banned: true, deletedAt: true, isTester: true } });
  if (!host || host.hostStatus !== 'APPROVED' || host.incognito || host.banned || host.deletedAt || host.isTester) return 0;
  if (host.presence === 'BUSY' || host.presence === 'AWAY') return 0;
  // Tezlik limiti: atomik "iddia" (eyni anda iki cihazdan qoşulma ikiqat göndərməsin)
  const cutoff = new Date(now.getTime() - HOST_ONLINE_COOLDOWN_H * H);
  const upd = await prisma.hostOnlineAlert.updateMany({ where: { hostId, sentAt: { lt: cutoff } }, data: { sentAt: now, reached: 0 } });
  if (!upd.count) {
    try { await prisma.hostOnlineAlert.create({ data: { hostId, sentAt: now } }); } catch { return 0; }
  }
  const follows = await prisma.follow.findMany({ where: { followingId: hostId }, select: { followerId: true }, take: 2000 });
  if (!follows.length) return 0;
  const ids = follows.map((f) => f.followerId);
  const [blocks, payers, recent] = await Promise.all([
    prisma.block.findMany({ where: { OR: [{ blockerId: hostId, blockedId: { in: ids } }, { blockedId: hostId, blockerId: { in: ids } }] }, select: { blockerId: true, blockedId: true } }),
    prisma.giftTransaction.groupBy({ by: ['senderId'], where: { receiverId: hostId, senderId: { in: ids }, createdAt: { gte: new Date(now.getTime() - 60 * 24 * H) } }, _sum: { coins: true } }),
    prisma.notification.groupBy({ by: ['userId'], where: { userId: { in: ids }, type: 'host_online', createdAt: { gte: new Date(now.getTime() - 24 * H) } }, _count: { _all: true } }),
  ]);
  const blocked = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));
  const spent = new Map(payers.map((p) => [p.senderId, p._sum.coins ?? 0]));
  const capped = new Set(recent.filter((r) => r._count._all >= HOST_ONLINE_PER_FOLLOWER_DAY).map((r) => r.userId));
  const users = await prisma.user.findMany({
    where: { id: { in: ids.filter((i) => !blocked.has(i) && !capped.has(i)) }, banned: false, deletedAt: null, online: false, pushToken: { not: null } },
    select: { id: true },
  });
  const targets = users.map((u) => u.id).sort((a, b) => (spent.get(b) ?? 0) - (spent.get(a) ?? 0)).slice(0, HOST_ONLINE_MAX_FOLLOWERS);
  for (const t of targets) {
    await notify(t, 'host_online', { actorId: hostId, data: { userId: hostId, name: host.name } }).catch(() => {});
  }
  await prisma.hostOnlineAlert.update({ where: { hostId }, data: { reached: targets.length } }).catch(() => {});
  return targets.length;
}
