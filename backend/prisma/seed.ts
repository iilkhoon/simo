/**
 * Əsas məlumatlar: hədiyyələr və coin paketləri (istehsal üçün də lazımdır).
 * SEED_DEMO=true olduqda yalnız inkişaf/test üçün demo istifadəçilər yaradılır —
 * İSTEHSALDA İSTİFADƏ ETMƏYİN (saxta profillər istifadəçiləri aldatmaq deməkdir).
 */
import { prisma } from '../src/db.js';
import type { GiftTier } from '../src/generated/prisma/client.js';

const GIFTS: [string, string, string, string, number, GiftTier, string][] = [
  ['rose', 'Qızılgül', 'Роза', 'Rose', 1, 'SMALL', 'popular'],
  ['heart', 'Ürək', 'Сердце', 'Heart', 5, 'SMALL', 'popular'],
  ['kiss', 'Öpüş', 'Поцелуй', 'Kiss', 10, 'SMALL', 'popular'],
  ['tea', 'Armudu çay', 'Чай в армуду', 'Armudu tea', 15, 'SMALL', 'azerbaijan'],
  ['pomegranate', 'Nar', 'Гранат', 'Pomegranate', 20, 'SMALL', 'azerbaijan'],
  ['chocolate', 'Şokolad', 'Шоколад', 'Chocolate', 30, 'SMALL', 'popular'],
  ['teddy', 'Ayıcıq', 'Мишка', 'Teddy bear', 50, 'SMALL', 'popular'],
  ['bouquet', 'Gül dəstəsi', 'Букет', 'Bouquet', 99, 'SMALL', 'popular'],
  ['perfume', 'Ətir', 'Духи', 'Perfume', 199, 'BIG', 'luxury'],
  ['champagne', 'Şampan', 'Шампанское', 'Champagne', 299, 'BIG', 'luxury'],
  ['ring', 'Nişan üzüyü', 'Кольцо', 'Ring', 520, 'BIG', 'luxury'],
  ['crown', 'Tac', 'Корона', 'Crown', 999, 'BIG', 'luxury'],
  ['maiden_tower', 'Qız Qalası', 'Девичья башня', 'Maiden Tower', 1999, 'LUXURY', 'azerbaijan'],
  ['flame_towers', 'Alov Qüllələri', 'Пламенные башни', 'Flame Towers', 2999, 'LUXURY', 'azerbaijan'],
  ['sports_car', 'İdman avtomobili', 'Спорткар', 'Sports car', 4999, 'LUXURY', 'luxury'],
  ['yacht', 'Yaxta', 'Яхта', 'Yacht', 9999, 'LUXURY', 'luxury'],
  ['palace', 'Saray', 'Дворец', 'Palace', 19999, 'LUXURY', 'luxury'],
  ['love_planet', 'Sevgi planeti', 'Планета любви', 'Love planet', 29999, 'LUXURY', 'luxury'],
];

// [id, coins, bonusCoins, qiymət (qəpik), populyar] — bonus böyük paketlərdə artır, amma 1 coin ≥ 1.08 qəpik qalır (bax: docs/ECONOMY.md)
const PACKAGES: [string, number, number, number, boolean][] = [
  ['coins_100', 100, 0, 199, false],
  ['coins_300', 300, 10, 499, false],
  ['coins_600', 600, 30, 999, true],
  ['coins_1300', 1300, 100, 1999, false],
  ['coins_3500', 3500, 350, 4999, false],
  ['coins_7500', 7500, 1000, 9999, false],
  ['coins_16000', 16000, 2400, 19999, false],
];

async function main() {
  for (const [i, [id, nameAz, nameRu, nameEn, price, tier, category]] of GIFTS.entries()) {
    await prisma.gift.upsert({
      where: { id },
      create: { id, nameAz, nameRu, nameEn, price, tier, category, sort: i },
      update: { nameAz, nameRu, nameEn, price, tier, category, sort: i },
    });
  }
  for (const [i, [id, coins, bonusCoins, priceQepik, popular]] of PACKAGES.entries()) {
    const productId = `az.simo.${id.replace('_', '.')}`;
    await prisma.coinPackage.upsert({
      where: { id },
      create: { id, coins, bonusCoins, priceQepik, popular, sort: i, appleProductId: productId, googleProductId: productId },
      update: { coins, bonusCoins, priceQepik, popular, sort: i },
    });
  }
  console.log(`✓ ${GIFTS.length} hədiyyə, ${PACKAGES.length} paket`);

  if (process.env.SEED_DEMO === 'true') {
    if (process.env.NODE_ENV === 'production') throw new Error('Demo seed istehsalda qadağandır');
    const names = ['Aysel', 'Leyla', 'Nigar', 'Günay', 'Aynur', 'Səbinə', 'Fidan', 'Lalə', 'Nərmin', 'Ülviyyə', 'Elvin', 'Rauf', 'Murad', 'Tural', 'Kamran'];
    const cities = ['Bakı', 'Gəncə', 'Sumqayıt', 'Şəki', 'Lənkəran', 'Quba'];
    const interests = ['music', 'travel', 'coffee', 'dance', 'movies', 'fitness', 'fashion', 'sea', 'tea', 'books'];
    for (const [i, name] of names.entries()) {
      const female = i < 10;
      const email = `demo${i}@demo.simo.az`;
      const age = 20 + (i % 12);
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email, name: `${name} (demo)`, gender: female ? 'FEMALE' : 'MALE', interestedIn: female ? 'MALE' : 'FEMALE',
          birthDate: new Date(new Date().getFullYear() - age, i % 12, 5), city: cities[i % cities.length],
          avatarUrl: `https://i.pravatar.cc/600?img=${female ? 20 + i : 50 + i}`, onboarded: true,
          interests: interests.slice(i % 5, (i % 5) + 4), languages: ['az', 'ru'], bio: 'Demo profil — test üçün',
          lat: 40.4093 + (Math.random() - 0.5) * 0.2, lng: 49.8671 + (Math.random() - 0.5) * 0.2, locationAt: new Date(),
          hostStatus: female && i < 6 ? 'APPROVED' : 'NONE', verified: female && i < 6, coins: female ? 0 : 1000,
        },
      });
    }
    console.log('✓ demo istifadəçilər (yalnız test)');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
