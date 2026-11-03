/**
 * Test hesabları (TEST_PHONES): limitsiz Nar və Almaz.
 * Nar promo kimi yazılır — xərclənəndə qəbul edənə nağdlaşan Almaz yaratmır.
 * Almaz "alınmış" kimi yazılır — nağdlaşmır.
 */
import { prisma } from '../db.js';
import { config } from '../config.js';
import { creditCoins } from './wallet.js';

export const TESTER_COINS = 1_000_000;
const TESTER_DIAMONDS = 1_000_000;

export function isTestPhone(phone?: string | null) {
  return !!phone && !!config.testOtpCode && config.testPhones.includes(phone);
}

/** App Review hesabı (adi hesab, yalnız sabit kod) */
export function isReviewPhone(phone?: string | null) {
  return !!phone && /^\d{6}$/.test(config.reviewOtpCode) && config.reviewPhones.includes(phone);
}

/** Sabit kodla daxil olan nömrə üçün kod (test və ya review), əks halda null */
export function fixedOtpFor(phone: string): string | null {
  if (isTestPhone(phone)) return config.testOtpCode;
  if (isReviewPhone(phone)) return config.reviewOtpCode;
  return null;
}

/** Balansı yenidən doldurur (girişdə, /me və /wallet sorğusunda) */
export async function refillTester(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isTester: true, coins: true, diamonds: true } });
  if (!u?.isTester) return;
  await prisma.$transaction(async (tx) => {
    if (u.coins < TESTER_COINS / 2) await creditCoins(tx, userId, TESTER_COINS - u.coins, 'TEST_REFILL', undefined, '', true);
    if (u.diamonds < TESTER_DIAMONDS / 2) {
      const add = TESTER_DIAMONDS - u.diamonds;
      const d = await tx.user.update({ where: { id: userId }, data: { diamonds: { increment: add }, diamondsBought: { increment: add } }, select: { diamonds: true } });
      await tx.walletTransaction.create({ data: { userId, currency: 'DIAMOND', amount: add, balanceAfter: d.diamonds, type: 'TEST_REFILL' } });
    }
  });
}

/** Hazır profillər: test hesabı onboarding-dən keçmir (məlumatları hər dəfə doldurmaq lazım deyil) */
const PROFILES = [
  { name: 'Test Aysel', gender: 'FEMALE', interestedIn: 'MALE', img: 47, host: true },
  { name: 'Test Elvin', gender: 'MALE', interestedIn: 'FEMALE', img: 12, host: false },
] as const;

/** Test nömrəsi üçün istifadəçini yaradır və ya profilini tamamlayır */
export async function ensureTesterUser(phone: string) {
  const i = Math.max(0, config.testPhones.indexOf(phone)) % PROFILES.length;
  const p = PROFILES[i];
  const profile = {
    name: config.testPhones.length > PROFILES.length ? `${p.name} ${config.testPhones.indexOf(phone) + 1}` : p.name,
    gender: p.gender, interestedIn: p.interestedIn,
    birthDate: new Date(Date.UTC(1998, 4, 15)), city: 'Bakı',
    avatarUrl: `https://i.pravatar.cc/600?img=${p.img}`,
    bio: 'Test hesabı', interests: ['music', 'travel', 'coffee'], languages: ['az', 'ru'],
    lat: 40.4093, lng: 49.8671, locationAt: new Date(),
    onboarded: true, isTester: true, termsAcceptedAt: new Date(),
    ...(p.host ? { hostStatus: 'APPROVED' as const, verified: true } : {}),
  };
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (!existing) return prisma.user.create({ data: { phone, locale: 'az', ...profile } });
  if (existing.onboarded && existing.isTester) return existing;
  // Onboarding yarımçıq qalıbsa — profili tamamla (doldurulmuş məlumatlara toxunma)
  return prisma.user.update({
    where: { id: existing.id },
    data: existing.onboarded ? { isTester: true } : profile,
  });
}

/** Server başlayanda test hesablarını əvvəlcədən yaradır */
export async function ensureTesterUsers() {
  if (!config.testOtpCode) return;
  for (const phone of config.testPhones) {
    const u = await ensureTesterUser(phone);
    await refillTester(u.id);
  }
}
