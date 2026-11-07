export type Gender = 'MALE' | 'FEMALE';
export type VipTier = 'NONE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export interface PublicUser {
  id: string;
  shortId: number;
  name: string;
  gender: Gender | null;
  age: number | null;
  bio: string;
  city: string;
  avatarUrl: string | null;
  photos: string[];
  interests: string[];
  languages: string[];
  lookingFor: string;
  verified: boolean;
  isHost: boolean;
  wealthLevel: number;
  charmLevel: number;
  vipTier: VipTier;
  online: boolean;
  lastSeenAt: string | null;
  videoCallPrice: number;
  voiceCallPrice: number;
  distanceKm: number | null;
  nobleTier?: 'NONE' | 'BEY' | 'XAN' | 'SAH';
  privatePrice?: number | null;
  freeChat?: boolean;
  msgPrice?: number | null;
  joinedAt?: string;
  /** Şəxsiyyət sənədi ilə təsdiqlənib (KYC) — ayrıca yaşıl nişan. `verified` — VIP ilə gələn mavi nişan */
  idVerified?: boolean;
  presence?: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'AWAY';
  /** Hazırda görüntülü/səsli zəng qəbul edirmi (ayarlar + zəng saatları) */
  acceptVideo?: boolean;
  acceptVoice?: boolean;
  callHours?: CallHours | null;
  extra?: ProfileExtra;
}

export interface CallHours { from: string; to: string; days?: number[] }
export interface ProfileExtra {
  heightCm?: number; education?: string; job?: string; smoking?: string; drinking?: string; kids?: string;
  personality?: string; comm?: string[]; activeTimes?: string[]; dateIdeas?: string[]; music?: string[]; wantsToEarn?: boolean;
}
export type NotifPrefs = Partial<Record<'messages' | 'calls' | 'likes' | 'follows' | 'visits' | 'subscriptions' | 'lives' | 'offers' | 'smart', boolean>>;

export interface VipPlan {
  tier: Exclude<VipTier, 'NONE'>;
  priceCoins: number;
  days: number;
  freeMessagesPerDay: number;
  callDiscount: number;
  superLikesPerDay: number;
  seeLikes: boolean;
  seeVisitors: boolean;
  incognito: boolean;
  discoveryBoost: number;
  entryEffect: boolean;
  /** Fərdi endirim (alqoritmin təklifi) */
  discountPct?: number;
  finalPrice?: number;
}

export interface Me extends PublicUser {
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  interestedIn: Gender | null;
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  onboarded: boolean;
  role: 'USER' | 'ADMIN';
  hostStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  coins: number;
  /** Almaz balansı (daxili vahid, 10 = 1 Almaz) */
  diamonds: number;
  /** Alınmış Almaz — yalnız Almaz hədiyyələrinə, nağdlaşmır */
  diamondsBought?: number;
  notifPrefs?: NotifPrefs;
  presenceSetting?: 'AUTO' | 'ACTIVE' | 'BUSY' | 'AWAY';
  callHoursSetting?: CallHours | null;
  acceptVideoSetting?: boolean;
  acceptVoiceSetting?: boolean;
  vipUntil: string | null;
  vip: VipPlan | null;
  incognito: boolean;
  locale: string;
  firstRechargeDone: boolean;
  promoCoins?: number;
  /** Test hesabı: limitsiz balans, alış demo, reytinqdən kənar */
  isTester?: boolean;
  kycStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  noble?: { tier: 'BEY' | 'XAN' | 'SAH'; priceCoins: number; days: number; perks: string[] } | null;
  nobleUntil?: string | null;
  hellosLeft?: number;
  superLikesLeft?: number;
  filterChangesLeft?: number | null;
  referralCode: string;
  agency: { id: string; name: string; code: string } | null;
  ownedAgency: { id: string; name: string; code: string; status: string } | null;
  wealth: { level: number; xp: number; next: number };
  charm: { level: number; xp: number; next: number };
  freeMessagesLeft: number;
  likesLeft: number | null;
  checkin: { streak: number; doneToday: boolean; rewards: number[] };
}

export interface Gift {
  id: string;
  nameAz: string;
  nameRu: string;
  nameEn: string;
  price: number;
  tier: 'SMALL' | 'BIG' | 'LUXURY';
  category: string;
  /** DIAMOND — yalnız Almaz ilə (qiymət daxili vahiddə: 10 = 1 Almaz) */
  currency?: 'COIN' | 'DIAMOND';
}

export interface GiftEvent {
  id: string;
  gift: Pick<Gift, 'id' | 'tier' | 'price' | 'nameAz' | 'nameRu' | 'nameEn'>;
  count: number;
  coins: number;
  sender: { id: string; name: string; avatarUrl: string | null; wealthLevel: number; vipTier: VipTier };
  receiverId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'IMAGE' | 'GIFT' | 'CALL' | 'SYSTEM';
  text: string;
  mediaUrl: string | null;
  giftId: string | null;
  coinsCost: number;
  createdAt: string;
}

export interface Call {
  id: string;
  callerId: string;
  calleeId: string;
  type: 'VIDEO' | 'VOICE';
  status: string;
  pricePerMin: number;
  channel: string;
  startedAt: string | null;
  billedMinutes?: number;
  coinsSpent?: number;
  endReason?: string | null;
}

export interface RtcCreds {
  appId: string;
  token: string | null;
  channel: string;
  uid: number;
}

export interface CoinPackage {
  id: string;
  coins: number;
  bonusCoins: number;
  priceQepik: number;
  appleProductId: string;
  googleProductId: string;
  popular: boolean;
}
