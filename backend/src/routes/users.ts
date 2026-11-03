import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { refillTester } from '../services/tester.js';
import { Prisma } from '../generated/prisma/client.js';
import { err } from '../lib/errors.js';
import { requireAuth, uid } from '../lib/auth.js';
import { presentUser, publicUserSelect } from '../lib/present.js';
import { ECONOMY, activeNoble, activeVip, ageFrom, levelFromXp, todayKey, weekKey, xpForLevel } from '../economy.js';
import { creditCoins, spendCoins } from '../services/wallet.js';
import { notify } from '../services/notify.js';

export const INTERESTS = [
  'music', 'travel', 'cooking', 'sport', 'fitness', 'movies', 'books', 'art', 'dance', 'gaming',
  'fashion', 'photo', 'nature', 'cars', 'tech', 'coffee', 'tea', 'pets', 'football', 'mugham',
  'business', 'yoga', 'sea', 'mountains', 'karaoke', 'shopping', 'anime', 'poetry',
];

export async function presentMe(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { photos: true, agency: { select: { id: true, name: true, code: true } }, ownedAgency: { select: { id: true, name: true, code: true, status: true } } },
  });
  const vip = activeVip(u);
  const wl = levelFromXp(u.totalSpent);
  const cl = levelFromXp(u.totalEarned);
  const today = todayKey();
  const freeUsed = u.freeMsgDate === today ? u.freeMsgUsed : 0;
  const likesUsed = u.dailyLikesDate === today ? u.dailyLikesUsed : 0;
  return {
    ...presentUser(u),
    phone: u.phone,
    email: u.email,
    birthDate: u.birthDate,
    interestedIn: u.interestedIn,
    ageMin: u.ageMin,
    ageMax: u.ageMax,
    maxDistanceKm: u.maxDistanceKm,
    onboarded: u.onboarded,
    role: u.role,
    hostStatus: u.hostStatus,
    coins: u.coins,
    diamonds: u.diamonds,
    vipUntil: vip ? u.vipUntil : null,
    vip,
    incognito: u.incognito,
    locale: u.locale,
    diamondsBought: u.diamondsBought,
    notifPrefs: u.notifPrefs,
    presenceSetting: u.presence,
    callHoursSetting: u.callHours,
    acceptVideoSetting: u.acceptVideo,
    acceptVoiceSetting: u.acceptVoice,
    firstRechargeDone: u.firstRechargeDone,
    referralCode: u.referralCode,
    agency: u.agency,
    ownedAgency: u.ownedAgency,
    wealth: { level: wl, xp: u.totalSpent, next: xpForLevel(wl + 1) },
    charm: { level: cl, xp: u.totalEarned, next: xpForLevel(cl + 1) },
    freeMessagesLeft: vip ? Math.max(0, vip.freeMessagesPerDay - freeUsed) : 0,
    likesLeft: vip ? null : Math.max(0, ECONOMY.freeDailyLikes - likesUsed),
    superLikesLeft: Math.max(0, (vip ? vip.superLikesPerDay : ECONOMY.freeDailySuperLikes) - (u.dailySuperDate === today ? u.dailySuperUsed : 0)),
    hellosLeft: Math.max(0, ECONOMY.freeHellosPerDay - (u.helloDate === today ? u.helloUsed : 0)),
    filterChangesLeft: vip ? null : Math.max(0, ECONOMY.freeFilterChangesPerWeek - (u.filterWeek === weekKey() ? u.filterUsed : 0)),
    promoCoins: u.promoCoins,
    isTester: u.isTester,
    kycStatus: u.kycStatus,
    noble: activeNoble(u),
    nobleUntil: activeNoble(u) ? u.nobleUntil : null,
    msgPrice: u.msgPrice,
    freeChat: u.freeChat,
    privatePrice: u.privatePrice,
    checkin: {
      streak: u.checkinStreak,
      doneToday: u.lastCheckinAt ? todayKey(u.lastCheckinAt) === today : false,
      rewards: ECONOMY.checkinRewards,
    },
  };
}

/** Onboarding-in opsional cavabları (hamısı istəyə görə) — profildə göstərilir və alqoritmə gedir */
export const extraSchema = z.object({
  heightCm: z.number().int().min(130).max(230).optional(),
  education: z.enum(['SCHOOL', 'COLLEGE', 'BACHELOR', 'MASTER', 'PHD']).optional(),
  job: z.string().trim().max(40).optional(),
  smoking: z.enum(['NO', 'SOMETIMES', 'YES']).optional(),
  drinking: z.enum(['NO', 'SOMETIMES', 'YES']).optional(),
  kids: z.enum(['NONE', 'HAVE', 'WANT', 'NOT_WANT']).optional(),
  personality: z.enum(['INTROVERT', 'AMBIVERT', 'EXTROVERT']).optional(),
  comm: z.array(z.enum(['TEXT', 'VOICE', 'VIDEO', 'LIVE'])).max(4).optional(),
  activeTimes: z.array(z.enum(['MORNING', 'DAY', 'EVENING', 'NIGHT'])).max(4).optional(),
  dateIdeas: z.array(z.string().max(20)).max(6).optional(),
  music: z.array(z.string().max(20)).max(6).optional(),
  wantsToEarn: z.boolean().optional(),
}).strict();

const notifPrefsSchema = z.object({
  messages: z.boolean().optional(), calls: z.boolean().optional(), likes: z.boolean().optional(), follows: z.boolean().optional(),
  visits: z.boolean().optional(), subscriptions: z.boolean().optional(), lives: z.boolean().optional(), offers: z.boolean().optional(),
  smart: z.boolean().optional(),
}).strict();

const callHoursSchema = z.object({ from: z.string().regex(/^\d{2}:\d{2}$/), to: z.string().regex(/^\d{2}:\d{2}$/), days: z.array(z.number().int().min(1).max(7)).max(7).optional() });

const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(30),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.coerce.date(),
  interestedIn: z.enum(['MALE', 'FEMALE']).nullable().optional(),
  lookingFor: z.enum(['RELATIONSHIP', 'FRIENDSHIP', 'CHAT', 'MARRIAGE']).default('RELATIONSHIP'),
  interests: z.array(z.string()).max(10).default([]),
  languages: z.array(z.enum(['az', 'ru', 'en', 'tr'])).default(['az']),
  city: z.string().max(40).default(''),
  bio: z.string().max(300).default(''),
  avatarUrl: z.string().url(),
  photos: z.array(z.string().url()).max(6).default([]),
  ageMin: z.number().int().min(18).max(80).optional(),
  ageMax: z.number().int().min(18).max(99).optional(),
  extra: extraSchema.default({}),
  notifPrefs: notifPrefsSchema.optional(),
});

const patchSchema = onboardingSchema
  .omit({ gender: true, birthDate: true, avatarUrl: true, photos: true, extra: true, notifPrefs: true })
  .partial()
  .extend({
    avatarUrl: z.string().url().optional(),
    ageMin: z.number().int().min(18).max(80).optional(),
    ageMax: z.number().int().min(18).max(99).optional(),
    maxDistanceKm: z.number().int().min(1).max(5000).optional(),
    incognito: z.boolean().optional(),
    locale: z.enum(['az', 'ru', 'en']).optional(),
    extra: extraSchema.partial().optional(),
    acceptVideo: z.boolean().optional(),
    acceptVoice: z.boolean().optional(),
    callHours: callHoursSchema.nullable().optional(),
    presence: z.enum(['AUTO', 'ACTIVE', 'BUSY', 'AWAY']).optional(),
    notifPrefs: notifPrefsSchema.optional(),
  });

export default async function userRoutes(app: FastifyInstance) {
  app.get('/meta/interests', async () => ({ interests: INTERESTS }));

  app.get('/me', { preHandler: requireAuth }, async (req) => {
    await refillTester(uid(req));
    return presentMe(uid(req));
  });

  app.put('/me/onboarding', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    const b = onboardingSchema.parse(req.body);
    const age = ageFrom(b.birthDate) ?? 0;
    if (age < 18) throw err.badRequest('UNDERAGE');
    if (age > 100) throw err.badRequest('INVALID_BIRTHDATE');
    const before = await prisma.user.findUniqueOrThrow({ where: { id }, select: { onboarded: true } });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: b.name, gender: b.gender, birthDate: b.birthDate,
          interestedIn: b.interestedIn === undefined ? (b.gender === 'MALE' ? 'FEMALE' : 'MALE') : b.interestedIn,
          lookingFor: b.lookingFor, interests: b.interests.filter((i) => INTERESTS.includes(i)),
          languages: b.languages, city: b.city, bio: b.bio, avatarUrl: b.avatarUrl, onboarded: true,
          ageMin: b.ageMin ?? (b.gender === 'MALE' ? 18 : Math.max(18, age - 3)),
          ageMax: b.ageMax ?? (b.gender === 'MALE' ? Math.max(30, age + 5) : Math.min(99, age + 12)),
          profileExtra: b.extra as object,
          ...(b.notifPrefs ? { notifPrefs: b.notifPrefs as object } : {}),
        },
      });
      if (b.photos.length) {
        await tx.photo.deleteMany({ where: { userId: id } });
        await tx.photo.createMany({ data: b.photos.map((url, order) => ({ userId: id, url, order })) });
      }
      if (!before.onboarded) await creditCoins(tx, id, ECONOMY.signupBonus, 'SIGNUP_BONUS', undefined, '', true);
    });
    return presentMe(id);
  });

  app.patch('/me', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    const b = patchSchema.parse(req.body);
    if (b.ageMin && b.ageMax && b.ageMin > b.ageMax) throw err.badRequest('INVALID_AGE_RANGE');
    if (b.interests) b.interests = b.interests.filter((i) => INTERESTS.includes(i));
    // "Kimi göstərək" filtri: həftədə 2 pulsuz dəyişiklik, sonra VIP və ya Nar
    const cur = await prisma.user.findUniqueOrThrow({ where: { id } });
    const filterChanged = (['interestedIn', 'ageMin', 'ageMax', 'maxDistanceKm'] as const).some((k) => k in b && b[k] !== undefined && b[k] !== cur[k]);
    if (filterChanged && !activeVip(cur)) {
      const wk = weekKey();
      const used = cur.filterWeek === wk ? cur.filterUsed : 0;
      if (used >= ECONOMY.freeFilterChangesPerWeek) {
        await prisma.$transaction((tx) => spendCoins(tx, id, ECONOMY.filterChangePrice, 'FILTER_CHANGE'));
      } else {
        await prisma.user.update({ where: { id }, data: { filterWeek: wk, filterUsed: used + 1 } });
      }
    }
    const { extra, callHours, notifPrefs, ...rest } = b;
    await prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(extra ? { profileExtra: { ...((cur.profileExtra ?? {}) as object), ...extra } } : {}),
        ...(callHours !== undefined ? { callHours: callHours === null ? Prisma.DbNull : (callHours as object) } : {}),
        ...(notifPrefs ? { notifPrefs: { ...((cur.notifPrefs ?? {}) as object), ...notifPrefs } } : {}),
      },
    });
    return presentMe(id);
  });

  app.put('/me/photos', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    const b = z.object({ photos: z.array(z.string().url()).max(6) }).parse(req.body);
    await prisma.$transaction([
      prisma.photo.deleteMany({ where: { userId: id } }),
      prisma.photo.createMany({ data: b.photos.map((url, order) => ({ userId: id, url, order })) }),
    ]);
    return presentMe(id);
  });

  app.put('/me/location', { preHandler: requireAuth }, async (req) => {
    const b = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), city: z.string().max(40).optional() }).parse(req.body);
    await prisma.user.update({
      where: { id: uid(req) },
      data: { lat: b.lat, lng: b.lng, locationAt: new Date(), ...(b.city ? { city: b.city } : {}) },
    });
    return { ok: true };
  });

  app.put('/me/push-token', { preHandler: requireAuth }, async (req) => {
    const b = z.object({ token: z.string().max(300), platform: z.enum(['ios', 'android']).optional() }).parse(req.body);
    await prisma.user.update({ where: { id: uid(req) }, data: { pushToken: b.token, ...(b.platform ? { pushPlatform: b.platform } : {}) } });
    return { ok: true };
  });

  /** iOS PushKit VoIP tokeni — gələn zəng tətbiq bağlı olanda da CallKit ekranında */
  app.put('/me/voip-token', { preHandler: requireAuth }, async (req) => {
    const b = z.object({ token: z.string().max(300) }).parse(req.body);
    await prisma.user.update({ where: { id: uid(req) }, data: { voipToken: b.token } });
    return { ok: true };
  });

  app.patch('/me/call-prices', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    const b = z.object({ videoCallPrice: z.number().int(), voiceCallPrice: z.number().int() }).parse(req.body);
    const me = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (me.hostStatus !== 'APPROVED') throw err.forbidden('NOT_HOST');
    // Yüksək qiymət yalnız yüksək cazibə səviyyəsində açılır
    const lvl = levelFromXp(me.totalEarned);
    const cap = (base: { min: number; max: number }) => Math.min(base.max, base.min * (2 + Math.floor(lvl / 5)));
    const v = ECONOMY.videoCallPrice;
    const a = ECONOMY.voiceCallPrice;
    if (b.videoCallPrice < v.min || b.videoCallPrice > cap(v)) throw err.badRequest('PRICE_OUT_OF_RANGE', { max: cap(v) });
    if (b.voiceCallPrice < a.min || b.voiceCallPrice > cap(a)) throw err.badRequest('PRICE_OUT_OF_RANGE', { max: cap(a) });
    await prisma.user.update({ where: { id }, data: b });
    return presentMe(id);
  });

  app.post('/me/host/apply', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    const b = z.object({ verificationUrl: z.string().url() }).parse(req.body);
    const me = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (!me.onboarded) throw err.badRequest('ONBOARDING_REQUIRED');
    if (me.hostStatus === 'APPROVED') return presentMe(id);
    await prisma.user.update({ where: { id }, data: { hostStatus: 'PENDING', verificationUrl: b.verificationUrl } });
    return presentMe(id);
  });

  /** Hesabın silinməsi (App Store və Play Store tələbi) — şəxsi məlumatlar anonimləşdirilir */
  app.delete('/me', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    await prisma.$transaction([
      prisma.photo.deleteMany({ where: { userId: id } }),
      prisma.refreshToken.deleteMany({ where: { userId: id } }),
      prisma.video.updateMany({ where: { userId: id }, data: { status: 'REMOVED' } }),
      prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(), phone: null, email: null, passwordHash: null, name: 'Deleted', bio: '',
          avatarUrl: null, lat: null, lng: null, pushToken: null, onboarded: false, online: false,
        },
      }),
    ]);
    return { ok: true };
  });

  app.get('/users/:id', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const [u, viewer] = await Promise.all([
      prisma.user.findFirst({ where: { id, deletedAt: null, banned: false }, select: { ...publicUserSelect, photos: true } }),
      prisma.user.findUniqueOrThrow({ where: { id: me }, select: { lat: true, lng: true, vipTier: true, vipUntil: true, incognito: true } }),
    ]);
    if (!u) throw err.notFound('USER_NOT_FOUND');
    const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: me, blockedId: id }, { blockerId: id, blockedId: me }] } });
    if (blocked && blocked.blockerId === id) throw err.notFound('USER_NOT_FOUND');
    const [a, b] = [me, id].sort();
    const [isFollowing, followers, following, match, myswipe, gifts, videos, live] = await Promise.all([
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: me, followingId: id } } }),
      prisma.follow.count({ where: { followingId: id } }),
      prisma.follow.count({ where: { followerId: id } }),
      prisma.match.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } }),
      prisma.swipe.findUnique({ where: { fromId_toId: { fromId: me, toId: id } } }),
      prisma.giftTransaction.groupBy({ by: ['giftId'], where: { receiverId: id }, _sum: { count: true }, orderBy: { _sum: { count: 'desc' } }, take: 12 }),
      prisma.video.findMany({ where: { userId: id, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, thumbnailUrl: true, url: true, views: true } }),
      prisma.liveRoom.findFirst({ where: { hostId: id, status: 'LIVE' }, select: { id: true, type: true, title: true } }),
    ]);
    if (me !== id) {
      const hidden = viewer.incognito && activeVip(viewer)?.incognito;
      if (!hidden) {
        const prev = await prisma.visit.findUnique({ where: { viewerId_viewedId: { viewerId: me, viewedId: id } } });
        await prisma.visit.upsert({
          where: { viewerId_viewedId: { viewerId: me, viewedId: id } },
          create: { viewerId: me, viewedId: id },
          update: { createdAt: new Date() },
        });
        if (!prev || Date.now() - prev.createdAt.getTime() > 6 * 3600_000) {
          // Push göndərilmir — ağıllı xülasə ("5 nəfər profilinə baxdı") gedir
          void notify(id, 'visit', { actorId: me, push: false }).catch(() => {});
        }
      }
    }
    return {
      user: presentUser(u, viewer),
      isFollowing: !!isFollowing,
      followers,
      following,
      matched: !!match,
      liked: myswipe ? myswipe.action !== 'PASS' : false,
      blocked: !!blocked,
      giftWall: gifts.map((g) => ({ giftId: g.giftId, count: g._sum.count ?? 0 })),
      videos,
      live,
    };
  });

  app.post('/users/:id/follow', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    if (id === me) throw err.badRequest();
    const created = await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: me, followingId: id } },
      create: { followerId: me, followingId: id },
      update: {},
    });
    if (Date.now() - created.createdAt.getTime() < 5000) void notify(id, 'follow', { actorId: me }).catch(() => {});
    return { ok: true };
  });

  app.delete('/users/:id/follow', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.follow.deleteMany({ where: { followerId: uid(req), followingId: id } });
    return { ok: true };
  });

  app.post('/users/:id/block', { preHandler: requireAuth }, async (req) => {
    const me = uid(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    if (id === me) throw err.badRequest();
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: me, blockedId: id } },
      create: { blockerId: me, blockedId: id },
      update: {},
    });
    await prisma.follow.deleteMany({ where: { OR: [{ followerId: me, followingId: id }, { followerId: id, followingId: me }] } });
    return { ok: true };
  });

  app.delete('/users/:id/block', { preHandler: requireAuth }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.block.deleteMany({ where: { blockerId: uid(req), blockedId: id } });
    return { ok: true };
  });

  app.get('/me/blocks', { preHandler: requireAuth }, async (req) => {
    const rows = await prisma.block.findMany({ where: { blockerId: uid(req) } });
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.blockedId) } }, select: { ...publicUserSelect, photos: true } });
    return { users: users.map((u) => presentUser(u)) };
  });

  app.post('/reports', { preHandler: requireAuth }, async (req) => {
    const b = z
      .object({
        targetUserId: z.string(),
        targetType: z.enum(['USER', 'MESSAGE', 'VIDEO', 'LIVE', 'COMMENT']).default('USER'),
        targetId: z.string().optional(),
        reason: z.enum(['SPAM', 'FAKE', 'NUDITY', 'HARASSMENT', 'UNDERAGE', 'SCAM', 'VIOLENCE', 'OTHER']),
        details: z.string().max(500).default(''),
      })
      .parse(req.body);
    await prisma.report.create({ data: { ...b, reporterId: uid(req) } });
    return { ok: true };
  });

  /** Profilimə baxanlar — tam siyahı VIP üçün, digərlərinə bulanıq önizləmə */
  app.get('/me/visitors', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    const me = await prisma.user.findUniqueOrThrow({ where: { id } });
    const vip = activeVip(me);
    const rows = await prisma.visit.findMany({ where: { viewedId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.viewerId) }, deletedAt: null }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, u]));
    const list = rows.flatMap((r) => {
      const u = byId.get(r.viewerId);
      return u ? [{ at: r.createdAt, user: presentUser(u, me) }] : [];
    });
    return { locked: !vip?.seeVisitors, total: list.length, items: vip?.seeVisitors ? list : list.slice(0, 20).map((v) => ({ at: v.at, user: { id: '', avatarUrl: v.user.avatarUrl, age: v.user.age } })) };
  });

  /** Məni bəyənənlər — GOLD+ üçün açıq */
  app.get('/me/likes', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    const me = await prisma.user.findUniqueOrThrow({ where: { id } });
    const vip = activeVip(me);
    const myswipes = await prisma.swipe.findMany({ where: { fromId: id }, select: { toId: true } });
    const done = new Set(myswipes.map((s) => s.toId));
    const rows = await prisma.swipe.findMany({ where: { toId: id, action: { in: ['LIKE', 'SUPERLIKE'] } }, orderBy: { createdAt: 'desc' }, take: 200 });
    const pending = rows.filter((r) => !done.has(r.fromId));
    const users = await prisma.user.findMany({ where: { id: { in: pending.map((r) => r.fromId) }, deletedAt: null }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, u]));
    const list = pending.flatMap((r) => {
      const u = byId.get(r.fromId);
      return u ? [{ at: r.createdAt, super: r.action === 'SUPERLIKE', user: presentUser(u, me) }] : [];
    });
    return { locked: !vip?.seeLikes, total: list.length, items: vip?.seeLikes ? list : list.slice(0, 20).map((l) => ({ at: l.at, super: l.super, user: { id: '', avatarUrl: l.user.avatarUrl, age: l.user.age } })) };
  });

  app.get('/notifications', { preHandler: requireAuth }, async (req) => {
    const id = uid(req);
    const rows = await prisma.notification.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 50 });
    const actors = await prisma.user.findMany({ where: { id: { in: rows.flatMap((r) => (r.actorId ? [r.actorId] : [])) } }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(actors.map((a) => [a.id, presentUser(a)]));
    const unread = await prisma.notification.count({ where: { userId: id, read: false } });
    return { unread, items: rows.map((r) => ({ ...r, actor: r.actorId ? byId.get(r.actorId) ?? null : null })) };
  });

  app.post('/notifications/read', { preHandler: requireAuth }, async (req) => {
    await prisma.notification.updateMany({ where: { userId: uid(req), read: false }, data: { read: true } });
    return { ok: true };
  });

  app.get('/leaderboard', { preHandler: requireAuth }, async (req) => {
    const q = z.object({ type: z.enum(['wealth', 'charm']).default('charm'), period: z.enum(['day', 'week', 'month']).default('week') }).parse(req.query);
    const days = q.period === 'day' ? 1 : q.period === 'week' ? 7 : 30;
    const since = new Date(Date.now() - days * 86400_000);
    const where = { createdAt: { gte: since } };
    const grouped =
      q.type === 'wealth'
        ? (await prisma.giftTransaction.groupBy({ by: ['senderId'], where, _sum: { coins: true }, orderBy: { _sum: { coins: 'desc' } }, take: 50 })).map((g) => ({ id: g.senderId, _sum: g._sum }))
        : (await prisma.giftTransaction.groupBy({ by: ['receiverId'], where, _sum: { coins: true }, orderBy: { _sum: { coins: 'desc' } }, take: 50 })).map((g) => ({ id: g.receiverId, _sum: g._sum }));
    const ids = grouped.map((g) => g.id);
    // Test hesabları reytinqdə göstərilmir
    const users = await prisma.user.findMany({ where: { id: { in: ids }, deletedAt: null, isTester: false }, select: { ...publicUserSelect, photos: true } });
    const byId = new Map(users.map((u) => [u.id, presentUser(u)]));
    const rows = grouped.flatMap((g, i) => {
      const u = byId.get(ids[i]);
      return u ? [{ score: g._sum.coins ?? 0, user: u }] : [];
    });
    return { items: rows.map((r, i) => ({ rank: i + 1, ...r })) };
  });

  /** Veb yükləmə səhifəsi üçün: ID ilə ad və avatar (minimum məlumat) */
  app.get('/public/users/:shortId', async (req) => {
    const { shortId } = z.object({ shortId: z.coerce.number().int() }).parse(req.params);
    const u = await prisma.user.findFirst({ where: { shortId, deletedAt: null, banned: false }, select: { shortId: true, name: true, avatarUrl: true } });
    if (!u) throw err.notFound('USER_NOT_FOUND');
    return u;
  });
}
