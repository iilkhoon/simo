# Simo

**Tanış ol. Danış. Sev.**

Simo Azərbaycan bazarı üçün tanışlıq, video/səsli zəng və canlı yayın platformasıdır. Proyekt üç hissədən ibarətdir:

- iOS və Android tətbiqi (Huawei AppGallery daxil);
- backend API;
- veb sayt (landing, coin yükləmə və admin panel).

Tətbiq 3 dildə işləyir: Azərbaycan, rus və ingilis.

| Qovluq | Nə var |
|---|---|
| `backend/` | Node 22 + Fastify 5 + Prisma 7 (PostgreSQL) + Socket.IO API |
| `mobile/` | Expo SDK 58 / React Native tətbiqi (expo-router) |
| `web/` | Landing, `topup.html` (Epoint), `admin.html`, `terms.html`, `privacy.html` |
| `design/` | Dizayn sistemi ([DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md)), hədiyyə SVG generatoru |

## Əsas imkanlar

- **Canlı mərkəz (ilk tab):**
  - Təsadüfi **video tanışlıq** və **səsli tanışlıq**. Sistem onlayn və boş olan bir hostu seçir. İstifadəçi "Növbəti" deyir və ya zəng edir.
  - Video yayınlar və 8 nəfərlik **səsli otaqlar**.
- **Zənglər:**
  - Görüntülü və səsli zənglər Agora üzərində işləyir.
  - Ödəniş dəqiqəlikdir. Balans azalanda istifadəçiyə xəbərdarlıq gəlir.
  - Zəng zamanı hədiyyə göndərmək olar.
- **Canlı yayın:**
  - Şərhlər, bəyənmə ürəkləri və bir toxunuşla hədiyyələr.
  - Böyük hədiyyələr bütün otağa animasiya ilə göstərilir.
  - Top dəstəkçilər siyahısı və VIP giriş effekti.
- **Kəşf:**
  - Swipe kartları və "Günün 10 seçimi".
  - "Yaxınlıqdakılar" bölməsi.
  - Tövsiyə alqoritmi bunları nəzərə alır: cins üstünlüyü, yaş, məsafə, aktivlik, ortaq maraqlar, VIP boost.
- **Çat:**
  - Ödənişli mesajlar (hostlara). İlk mesaj pulsuzdur, VIP-lər üçün də pulsuz limit var.
  - Buz-qıran cavablar, bir toxunuşla hədiyyələr.
  - Zəng tarixçəsi və geri zəng.
- **İqtisadiyyat:**
  - İstifadəçi Simo Coin xərcləyir, host isə ödənişli coin dəyərinin 50%-i qədər almaz qazanır.
  - Agentlik hostların qazancından 10% komissiya alır. Komissiya platformanın payından ödənir.
  - Almaz pula çevrilir: 200 almaz = 1 ₼, minimum 10 000 almaz, 3% xidmət haqqı.
  - Bonus (promo) coinlər birinci xərclənir və nağdlaşan almaz yaratmır — bonus fırıldağının qarşısını alır.
  - Platformanın payı mağaza komissiyasından sonra belə gəlirin ~60–85%-idir. Hesablama: [docs/ECONOMY.md](docs/ECONOMY.md).
- **Bonuslar:**
  - Qeydiyyatda 30 coin hədiyyə və ilk yükləmədə 300 coinədək hədiyyə (promo).
  - 7 günlük gündəlik bonus (promo coin).
  - Dəvət edən şəxs dəvət etdiyi istifadəçinin ilk alışından 10% alır (promo, ən çox 200 coin).
- **VIP:** Gümüş, Qızıl və Almaz səviyyələri. Hər səviyyə pulsuz mesaj, zəng endirimi, "məni kim bəyənib", görünməz rejim və boost verir.
- **Qısa videolar:** TikTok tipli lent. İstifadəçilər bəyənə, şərh yaza və hədiyyə göndərə bilər.
- **Təhlükəsizlik:**
  - Hostlar selfi ilə təsdiqlənir.
  - Çatda telefon nömrələri və linklər avtomatik gizlədilir.
  - Blok və şikayət imkanı var.
  - Moderasiya admin paneldən aparılır.

## Lokal işə salma

### 1. Verilənlər bazası və API

```bash
docker compose up -d db
```

```bash
cd backend && cp .env.example .env && npm install
```

```bash
npx prisma migrate deploy && npm run db:seed
```

```bash
npm run dev
```

API `http://localhost:4000` ünvanında açılır. Test ssenarisini (21 addım) belə işə salın:

```bash
DATABASE_URL=postgresql://simo:simo@localhost:5432/simo npx tsx test/e2e.ts
```

`SEED_DEMO=true npm run db:seed` demo profillər yaradır. Bu yalnız inkişaf üçündür və istehsalda bloklanır.

### 2. Mobil tətbiq

```bash
cd mobile && npm install
```

```bash
EXPO_PUBLIC_API_URL=http://<kompüterin-IP>:4000 npx expo start
```

Zəng, yayın (Agora) və ödəniş (IAP) native modullardır, Expo Go-da işləmir. Onları yoxlamaq üçün development build yığın:

```bash
npx eas-cli@latest build --profile development --platform android
```

### 3. Veb sayt

```bash
docker compose up -d web
```

Sayt `http://localhost:8080` ünvanında açılır. API ünvanı `web/config.js` faylında təyin olunur.

## İstehsala çıxmaq üçün lazım olanlar

Bu açarları `backend/.env` faylına yazın:

1. **Agora**. [console.agora.io](https://console.agora.io)-dan `AGORA_APP_ID` və `AGORA_APP_CERTIFICATE` götürün. Zənglər və yayınlar bunlarsız işləmir.
2. **SMS provayder** (məsələn, LSIM və ya Azercell Business). `SMS_API_URL` və `SMS_API_TOKEN` yazın. OTP kodları bu provayderlə göndərilir.
3. **Apple In-App Purchase**:
   - App Store Connect-də 7 consumable məhsul yaradın: `az.simo.coins.100` … `az.simo.coins.16000`.
   - App Store Server API açarını yazın: `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`.
4. **Google Play Billing**:
   - Eyni ID-lərlə məhsullar yaradın.
   - Service account JSON faylını `GOOGLE_SERVICE_ACCOUNT_JSON` dəyişəninə yazın.
5. **Epoint.az** merchant hesabı: `EPOINT_PUBLIC_KEY` və `EPOINT_PRIVATE_KEY`. Huawei versiyası və veb yükləmə bu hesabla işləyir.
6. **Təhlükəsizlik**: `JWT_SECRET` üçün uzun təsadüfi sətir yazın, `DEV_MODE=false` və `NODE_ENV=production` qoyun.
7. **Fayl yükləmə**: istehsalda S3 və ya Cloudflare R2 tövsiyə olunur. İndiki halda fayllar `UPLOAD_DIR` qovluğunda saxlanır.
8. **Miqyas**: çox serverli rejimdə canlı otaq vəziyyəti və Socket.IO üçün Redis adapteri qoşulmalıdır.

## Mağazalara yükləmə

```bash
cd mobile
```

```bash
npx eas-cli@latest build --profile production --platform ios
```

```bash
npx eas-cli@latest build --profile production --platform android
```

```bash
npx eas-cli@latest build --profile huawei --platform android
```

**Apple və Google qaydaları:**

- Coin rəqəmsal məhsuldur, ona görə iOS və Google Play versiyalarında yalnız IAP istifadə olunur.
- Bu versiyalarda veb yükləməyə link göstərmək olmaz. Kod bunu `EXPO_PUBLIC_STORE` ilə avtomatik idarə edir.

**Huawei:**

- Google Play Services yoxdur. Ödəniş Epoint ilə edilir.
- Push bildirişlər üçün HMS Push inteqrasiyası əlavə edilməlidir.

**Tələblər:**

- Yaş reytinqi 18+ olmalıdır.
- Məxfilik siyasəti `simo.az/privacy.html` ünvanındadır.
- Hesabın silinməsi tətbiqdə var: Parametrlər → Hesabı sil.

**Yoxlama hesabı:** App Review üçün demo hesab hazırlayın. Saxta profillərlə istifadəçi cəlb etmək mağaza qaydalarına ziddir.

## Dizayn

"Nar 2" dizayn sistemi: foto-birinci, yumşaq kartlar (iri radius, yumşaq kölgə) + oynaq brend qatı (düz rəng blokları, çat-qabarcığı başlıqlar, "Nari" nar maskotu). Yayın, zəng və video ekranları tünd premium rejimdədir. Şriftlər: Geologica və Onest.
Brend rəngi nar qırmızısıdır (`#F2344F`). Ətraflı məlumat [design/DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) faylındadır.
