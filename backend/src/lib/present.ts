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
> & { photos?: Photo[] };

export const publicUserSelect = {
  id: true, shortId: true, name: true, gender: true, birthDate: true, bio: true, city: true, avatarUrl: true,
  interests: true, languages: true, lookingFor: true, verified: true, hostStatus: true, totalSpent: true,
  totalEarned: true, vipTier: true, vipUntil: true, online: true, lastSeenAt: true, videoCallPrice: true,
  voiceCallPrice: true, lat: true, lng: true, incognito: true,
  nobleTier: true, nobleUntil: true, privatePrice: true, freeChat: true, msgPrice: true, createdAt: true,
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
    verified: u.verified,
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
  };
}

export type PublicUser = ReturnType<typeof presentUser>;
