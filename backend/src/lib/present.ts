import type { User, Photo } from '../generated/prisma/client.js';
import { activeNoble, activeVip, ageFrom, levelFromXp } from '../economy.js';

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type PublicSource = Pick<
  User,
  | 'id' | 'shortId' | 'name' | 'gender' | 'birthDate' | 'bio' | 'city' | 'avatarUrl' | 'interests' | 'languages'
  | 'lookingFor' | 'verified' | 'hostStatus' | 'totalSpent' | 'totalEarned' | 'vipTier' | 'vipUntil' | 'online'
  | 'lastSeenAt' | 'videoCallPrice' | 'voiceCallPrice' | 'lat' | 'lng' | 'incognito'
  | 'nobleTier' | 'nobleUntil' | 'privatePrice' | 'freeChat' | 'msgPrice' | 'createdAt'
  | 'kycStatus' | 'acceptVideo' | 'acceptVoice' | 'callHours' | 'presence' | 'profileExtra'
> & { photos?: Photo[] };

export const publicUserSelect = {
  id: true, shortId: true, name: true, gender: true, birthDate: true, bio: true, city: true, avatarUrl: true,
  interests: true, languages: true, lookingFor: true, verified: true, hostStatus: true, totalSpent: true,
  totalEarned: true, vipTier: true, vipUntil: true, online: true, lastSeenAt: true, videoCallPrice: true,
  voiceCallPrice: true, lat: true, lng: true, incognito: true,
  nobleTier: true, nobleUntil: true, privatePrice: true, freeChat: true, msgPrice: true, createdAt: true,
  kycStatus: true, acceptVideo: true, acceptVoice: true, callHours: true, presence: true, profileExtra: true,
} as const;

export function presentUser(u: PublicSource, viewer?: { lat: number | null; lng: number | null }) {
  const vip = activeVip(u);
  let distance: number | null = null;
  if (viewer?.lat != null && viewer?.lng != null && u.lat != null && u.lng != null) {
    // Məxfilik: məsafə 1 km dəqiqliyə yuvarlaqlaşdırılır, dəqiq koordinat heç vaxt göndərilmir
    distance = Math.max(1, Math.round(distanceKm(viewer.lat, viewer.lng, u.lat, u.lng)));
  }
  const hidden = u.incognito && !!vip?.incognito;
  return {
    id: u.id,
    shortId: u.shortId,
    name: u.name,
    gender: u.gender,
    age: ageFrom(u.birthDate),
    bio: u.bio,
    city: u.city,
    avatarUrl: u.avatarUrl,
    photos: (u.photos ?? []).sort((a, b) => a.order - b.order).map((p) => p.url),
    interests: u.interests,
    languages: u.languages,
    lookingFor: u.lookingFor,
    /** Mavi nişan "Təsdiqlənmiş profil" — VIP ilə satılır */
    verified: !!vip,
    /** Ayrıca nişan: şəxsiyyət sənədi ilə təsdiqlənib (KYC) */
    idVerified: u.kycStatus === 'APPROVED' || u.verified,
    isHost: u.hostStatus === 'APPROVED',
    wealthLevel: levelFromXp(u.totalSpent),
    charmLevel: levelFromXp(u.totalEarned),
    vipTier: vip ? vip.tier : 'NONE',
    online: hidden ? false : u.online,
    lastSeenAt: hidden ? null : u.lastSeenAt,
    videoCallPrice: u.videoCallPrice,
    voiceCallPrice: u.voiceCallPrice,
    distanceKm: distance,
    nobleTier: activeNoble(u)?.tier ?? 'NONE',
    privatePrice: u.privatePrice,
    freeChat: u.freeChat,
    msgPrice: u.msgPrice,
    joinedAt: u.createdAt,
    presence: presenceOf(u, hidden),
    acceptVideo: u.acceptVideo && callWindowOpen(u.callHours),
    acceptVoice: u.acceptVoice && callWindowOpen(u.callHours),
    callHours: u.callHours as CallHours | null,
    extra: (u.profileExtra ?? {}) as Record<string, unknown>,
  };
}

export type PublicUser = ReturnType<typeof presentUser>;

export type CallHours = { from: string; to: string; days?: number[] };

/** Zəng saatları (Bakı vaxtı, UTC+4) — indi açıqdırmı? Gecəni keçən aralıqlar (22:00–02:00) da dəstəklənir. */
export function callWindowOpen(h: unknown, now = new Date()): boolean {
  const ch = h as CallHours | null;
  if (!ch || !ch.from || !ch.to) return true;
  const baku = new Date(now.getTime() + 4 * 3600_000);
  const day = baku.getUTCDay() === 0 ? 7 : baku.getUTCDay();
  if (ch.days?.length && !ch.days.includes(day)) return false;
  const m = baku.getUTCHours() * 60 + baku.getUTCMinutes();
  const toMin = (s: string) => { const [a, b] = s.split(':').map(Number); return (a || 0) * 60 + (b || 0); };
  const f = toMin(ch.from), t = toMin(ch.to);
  return f <= t ? m >= f && m < t : m >= f || m < t;
}

/** Görünən status: BUSY / AWAY istifadəçi seçimidir; ACTIVE və AUTO — real onlayn vəziyyətə görə */
export function presenceOf(u: { presence: string; online: boolean }, hidden = false): 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY' {
  if (hidden) return 'OFFLINE';
  if (u.presence === 'BUSY') return 'BUSY';
  if (u.presence === 'AWAY') return 'AWAY';
  return u.online ? 'ONLINE' : 'OFFLINE';
}
