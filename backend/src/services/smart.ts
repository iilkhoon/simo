/**
 * Fərdi təkliflər və ağıllı bildirişlər.
 *
 * Təkliflər (zövq profilindəki xərcləmə davranışına görə, hər növdən eyni anda bir aktiv):
 *   FIRST_TOPUP  — heç alış etməyib, 1+ gündür buradadır: orta paketə +50% bonus (48 saat)
 *   LOW_BALANCE  — balans az, son 3 gündə yazışıb/zəng edib: sevdiyi ölçüdə paketə +20% (24 saat)
 *   COMEBACK     — əvvəl alırdı, 14+ gündür almır: +30% (72 saat)
 *   BIG_GIFTER   — çox hədiyyə göndərir: böyük paketə +15% (48 saat)
 *   VIP_TRIAL    — bəyənmə limitinə tez-tez çatır, VIP deyil: VIP-ə 30% endirim (48 saat)
 *   VIP_RENEW    — VIP 3 günə bitir: yeniləməyə 15% endirim
 * Bonus Nar promo hesabına yazılır (ödəniş zamanı avtomatik, bir dəfə).
 *
 * Ağıllı bildirişlər (gündə ən çox 2, 23:00–09:00 arası göndərilmir, istifadəçi "smart" bildirişi bağlaya bilər):
 *   profilə baxış xülasəsi · bəyənmə xülasəsi · təklif bitir · 2 gündür girməyənə ona uyğun yeni profil.
 */
import { prisma } from '../db.js';
import { activeVip } from '../economy.js';
import { getTaste } from './taste.js';
import { notify } from './notify.js';

const H = 3600_000;

export async function generateOffers(userId: string) {
  const [u, taste, active, pkgs] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { createdAt: true, coins: true, vipTier: true, vipUntil: true, firstRechargeDone: true, lastSeenAt: true } }),
    getTaste(userId),
    prisma.offer.findMany({ where: { userId, expiresAt: { gt: new Date() }, usedAt: null } }),
    prisma.coinPackage.findMany({ where: { active: true, currency: 'COIN' }, orderBy: { priceQepik: 'asc' } }),
  ]);
  if (!pkgs.length) return;
  const has = new Set(active.map((o) => o.kind));
  const recentAny = await prisma.offer.findMany({ where: { userId, createdAt: { gt: new Date(Date.now() - 7 * 24 * H) } }, select: { kind: true } });
  const recent = new Set(recentAny.map((o) => o.kind));
  const make = (kind: string, hours: number, data: { packageId?: string; bonusPct?: number; discountPct?: number }) => {
    if (has.has(kind) || recent.has(kind)) return null;
    return prisma.offer.create({ data: { userId, kind, packageId: data.packageId, bonusPct: data.bonusPct ?? 0, discountPct: data.discountPct ?? 0, expiresAt: new Date(Date.now() + hours * H) } });
  };
  // İstifadəçinin "rahat" ölçüsü — orta alışına ən yaxın paket
  const fit = taste.spend.avgPurchase
    ? pkgs.reduce((a, p) => (Math.abs(p.priceQepik - taste.spend.avgPurchase) < Math.abs(a.priceQepik - taste.spend.avgPurchase) ? p : a))
    : pkgs[Math.min(1, pkgs.length - 1)];
  const big = pkgs[Math.max(0, pkgs.length - 2)];
  const jobs: (Promise<unknown> | null)[] = [];
  const ageDays = (Date.now() - u.createdAt.getTime()) / (24 * H);
  if (!taste.spend.purchases && ageDays >= 1) jobs.push(make('FIRST_TOPUP', 48, { packageId: pkgs[Math.min(2, pkgs.length - 1)].id, bonusPct: 50 }));
  if (taste.spend.purchases && u.coins < 150 && taste.spend.messages30 + taste.spend.calls30 > 0) jobs.push(make('LOW_BALANCE', 24, { packageId: fit.id, bonusPct: 20 }));
  if (taste.spend.lastPurchaseAt && Date.now() - Date.parse(taste.spend.lastPurchaseAt) > 14 * 24 * H) jobs.push(make('COMEBACK', 72, { packageId: fit.id, bonusPct: 30 }));
  if (taste.spend.gifts30 > 3000) jobs.push(make('BIG_GIFTER', 48, { packageId: big.id, bonusPct: 15 }));
  const vip = activeVip(u);
  if (!vip && taste.spend.likeLimitHits7 >= 2) jobs.push(make('VIP_TRIAL', 48, { discountPct: 30 }));
  if (vip && u.vipUntil && u.vipUntil.getTime() - Date.now() < 3 * 24 * H) jobs.push(make('VIP_RENEW', 72, { discountPct: 15 }));
  await Promise.all(jobs.filter(Boolean));
}

export async function activeOffers(userId: string) {
  const rows = await prisma.offer.findMany({ where: { userId, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: 'asc' } });
  const pkgs = await prisma.coinPackage.findMany({ where: { id: { in: rows.map((r) => r.packageId).filter((x): x is string => !!x) } } });
  return rows.map((o) => {
    const p = pkgs.find((x) => x.id === o.packageId);
    return {
      id: o.id, kind: o.kind, bonusPct: o.bonusPct, discountPct: o.discountPct, expiresAt: o.expiresAt,
      package: p ? { id: p.id, coins: p.coins + p.bonusCoins, priceQepik: p.priceQepik, bonus: Math.floor(((p.coins + p.bonusCoins) * o.bonusPct) / 100) } : null,
    };
  });
}

/** Ödəniş təsdiqlənəndə: həmin paketə aid aktiv təklif varsa — bonus Nar (promo) və təklif istifadə olunmuş sayılır */
export async function offerBonusFor(userId: string, packageId: string, coins: number): Promise<{ id: string; bonus: number } | null> {
  const o = await prisma.offer.findFirst({ where: { userId, packageId, usedAt: null, expiresAt: { gt: new Date() }, bonusPct: { gt: 0 } }, orderBy: { bonusPct: 'desc' } });
  if (!o) return null;
  return { id: o.id, bonus: Math.floor((coins * o.bonusPct) / 100) };
}

/** VIP alışında aktiv endirim (faiz) */
export async function vipDiscount(userId: string): Promise<{ id: string; pct: number } | null> {
  const o = await prisma.offer.findFirst({ where: { userId, kind: { in: ['VIP_TRIAL', 'VIP_RENEW'] }, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { discountPct: 'desc' } });
  return o ? { id: o.id, pct: o.discountPct } : null;
}

function bakuHour() { return (new Date().getUTCHours() + 4) % 24; }
function dayKey() { return new Date(Date.now() + 4 * H).toISOString().slice(0, 10); }

async function canSmartPush(u: { id: string; smartPushDate: string | null; smartPushCount: number; notifPrefs: unknown }) {
  const prefs = (u.notifPrefs ?? {}) as Record<string, boolean>;
  if (prefs.smart === false) return false;
  const h = bakuHour();
  if (h >= 23 || h < 9) return false;
  return !(u.smartPushDate === dayKey() && u.smartPushCount >= 2);
}

async function markPushed(userId: string, prev: { smartPushDate: string | null; smartPushCount: number }) {
  const today = dayKey();
  await prisma.user.update({ where: { id: userId }, data: { smartPushDate: today, smartPushCount: prev.smartPushDate === today ? prev.smartPushCount + 1 : 1 } });
}

/** Hər 15 dəqiqədən bir: aktiv istifadəçilərə ağıllı bildirişlər və təkliflər */
export async function smartTick() {
  const since = new Date(Date.now() - 14 * 24 * H);
  const users = await prisma.user.findMany({
    where: { onboarded: true, banned: false, deletedAt: null, pushToken: { not: null }, online: false, lastSeenAt: { gte: since } },
    select: { id: true, lastSeenAt: true, smartPushDate: true, smartPushCount: true, notifPrefs: true, locale: true },
    take: 500,
    orderBy: { lastSeenAt: 'desc' },
  });
  for (const u of users) {
    try {
      await generateOffers(u.id);
      if (!(await canSmartPush(u))) continue;
      const lastSmart = await prisma.notification.findFirst({ where: { userId: u.id, type: { in: ['visit_digest', 'like_digest', 'offer', 'picks'] } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
      const from = new Date(Math.max(lastSmart?.createdAt.getTime() ?? 0, u.lastSeenAt.getTime()));
      // 1) Profilə baxış xülasəsi (1-dən çox adam baxıbsa)
      const visits = await prisma.visit.count({ where: { viewedId: u.id, createdAt: { gt: from } } });
      if (visits > 1) { await notify(u.id, 'visit_digest', { data: { n: visits }, pushIfOnline: true }); await markPushed(u.id, u); continue; }
      // 2) Bəyənmə xülasəsi
      const likes = await prisma.swipe.count({ where: { toId: u.id, action: { not: 'PASS' }, createdAt: { gt: from } } });
      if (likes > 1) { await notify(u.id, 'like_digest', { data: { n: likes }, pushIfOnline: true }); await markPushed(u.id, u); continue; }
      // 3) Təklif bitmək üzrədir (6 saatdan az)
      const offer = await prisma.offer.findFirst({ where: { userId: u.id, usedAt: null, expiresAt: { gt: new Date(), lt: new Date(Date.now() + 6 * H) } } });
      if (offer && !(await prisma.notification.findFirst({ where: { userId: u.id, type: 'offer', createdAt: { gt: offer.createdAt } } }))) {
        await notify(u.id, 'offer', { data: { offerId: offer.id, kind: offer.kind, bonusPct: offer.bonusPct, discountPct: offer.discountPct }, pushIfOnline: true });
        await markPushed(u.id, u); continue;
      }
      // 4) 2+ gündür girməyib — ona uyğun yeni profillər
      if (Date.now() - u.lastSeenAt.getTime() > 48 * H && from.getTime() === u.lastSeenAt.getTime()) {
        const fresh = await prisma.user.count({ where: { onboarded: true, createdAt: { gt: u.lastSeenAt }, id: { not: u.id } } });
        if (fresh > 0) { await notify(u.id, 'picks', { data: { n: Math.min(99, fresh) }, pushIfOnline: true }); await markPushed(u.id, u); }
      }
    } catch { /* bir istifadəçinin xətası digərlərini dayandırmır */ }
  }
}
