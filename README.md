# Simo

**Tanış ol. Danış. Sev.**

Simo Azərbaycan bazarı üçün tanışlıq, video/səsli zəng və canlı yayın platformasıdır. Proyekt üç hissədən ibarətdir:

- iOS və Android tətbiqi (Huawei AppGallery daxil);
- backend API;
- veb sayt (landing, Nar yükləmə, hüquqi sənədlər və admin panel).

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
  - Gündə 3 yeni söhbətdə ilk "salam" pulsuzdur, növbəti mesajların qiymətini host təyin edir. Host pulsuz söhbəti aça bilər.
  - Foto və video yalnız qarşılıqlı izləyənlər arasında göndərilir.
  - Buz-qıran cavablar, bir toxunuşla hədiyyələr, zəng tarixçəsi və geri zəng.
- **İqtisadiyyat** (ətraflı: [docs/ECONOMY.md](docs/ECONOMY.md)):
  - İstifadəçi **Nar** xərcləyir. Ödənişli Nar-ın 70%-i Simo-da qalır, 30%-i host və agentlik arasında bölünür.
  - Agentlik payı səviyyəyə görə 15%-dən (Bürünc) 20%-dək (Almaz) artır. Qazanc yalnız aktiv agentliyin üzvü olan hostlara yazılır.
  - Qazanc **Almaz**-dır (premium valyuta, 1 Almaz = 10 Nar): 10 Almaz = 1 ₼, minimum 500 Almaz (50 ₼), 3% haqq, həftədə 1 çıxarış, 7 gün gözləmə, KYC tələb olunur. Almaz paketlə də alınır (nağdlaşmır) və lüks Almaz hədiyyələrinə xərclənir.
  - Promo Nar birinci xərclənir və Almaz yaratmır — bonus fırıldağının qarşısını alır.
- **Bonuslar və limitlər:**
  - Qeydiyyatda 30 Nar, ilk yükləmədə 300 Nar-adək hədiyyə, 7 günlük gündəlik bonus (promo).
  - Dəvət edən şəxs dəvət etdiyi istifadəçinin **hər alışından** 5% alır (promo, ən çox 500).
  - Gündə 10 pulsuz bəyənmə və 1 super bəyənmə; "kimi göstərək" filtri həftədə 2 dəfə pulsuz.
  - Paylaşaraq pulsuz qatılınan çəkilişlər.
- **VIP və zadəganlıq:** Gümüş, Qızıl, Almaz VIP; Bəy, Xan, Şah zadəganlıq statusları. Profil qonaqlarını yalnız VIP görür.
- **Lent:** TikTok tipli video və foto lenti (video ≤ 90 san). Bəyənmə, şərh, saxlama, paylaşma; müəllif bəyənənləri görür. Alqoritm bəyənmə, şərh, saxlama və baxışa görə sıralayır.
- **Hekayələr:** 24 saatlıq; canlı olanlar birinci göstərilir.
- **Şəxsi məzmun:** aylıq Nar abunəsi, qiyməti yaradıcı təyin edir. Çılpaqlıq qadağandır.
- **Canlı yayım 2.0:** PK döyüşləri, qonaq dəvəti və qoşulma sorğusu, host paneli, oturacaq sayı seçilən səsli otaqlar, konkret oturacaqdakı şəxsə hədiyyə.
- **Agentliklər:** agentlik kataloqu, müraciət formu, admin təsdiqi; host olmaq üçün tapşırıqlar (3 günlük hesab, 10 söhbət, profil, ilk paylaşım, KYC).
- **Nişanlar:** səxavət və şöhrət səviyyələri, staj, təsdiq, "Bakı #1" kimi regional reytinqlər.
- **Təhlükəsizlik:**
  - Şəxsiyyət təsdiqi (KYC): ad, soyad, doğum tarixi, sənəd və selfi.
  - Çatda telefon nömrələri və linklər avtomatik gizlədilir.
  - Blok və şikayət imkanı var.
  - Moderasiya, KYC, agentlik və çəkilişlər admin paneldən idarə olunur.


## Windows-da test (Expo Go)

Heç nə quraşdırmaq lazım deyil: telefonda yalnız **Expo Go**, telefon və kompüter eyni Wi-Fi-da.

1. **`BASLAT.bat`**-a iki dəfə klikləyin. İlk dəfə Node.js (portativ), verilənlər bazası (embedded PostgreSQL) və paketlər layihə qovluğunun içinə yüklənir — 5-10 dəqiqə. Sonrakı dəfələr bir neçə saniyə.
2. "Simo Expo" pəncərəsindəki QR kodu skan edin (Android — Expo Go, iPhone — Kamera).

| Fayl | Nə edir |
|---|---|
| `BASLAT.bat` | Hər şeyi başladır (backend + baza + Expo) |
| `FIREWALL-AC.bat` | Telefon qoşula bilmirsə: 4000 və 8081 portlarını açır |
| `DB-SIFIRLA.bat` | Bazanı təmizləyib demo profillərlə yenidən yaradır |

Baza faylları `backend/.localdb`, portativ Node `.tools/` qovluğundadır — silsəniz, növbəti dəfə yenidən yaradılır. Giriş kodu (OTP) `DEV_MODE=true` olduğu üçün ekranda görünür.
Expo Go-da işləməyənlər (dev build lazımdır): zəng/canlı yayın videosu (Agora), sistem zəng ekranı, mağaza ödənişi, Android push.

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

- Nar rəqəmsal məhsuldur, ona görə iOS və Google Play versiyalarında yalnız IAP istifadə olunur.
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

## Yeniliklər (2026-11)

- **Şəxsi alqoritm** (`backend/src/services/taste.ts`): bəyənmə, baxış (müddətlə), mesaj, hədiyyə, zəng, canlı yayın, ekran və axtarış siqnallarından zövq profili; kollektiv tövsiyə; kəşf və "Günün 10 seçimi" buna görə sıralanır.
- **Fərdi təkliflər və ağıllı bildirişlər** (`smart.ts`): xərcləmə davranışına görə paket bonusu / VIP endirimi; "5 nəfər profilinə baxdı", "3 nəfər səni bəyəndi", təklif bitir, sənə uyğun yeni profillər — gündə ən çox 2, gecə yox.
- **Onboarding 2.0**: 7 məcburi + 4 opsional addım (kimi görmək, yaş aralığı, boy, təhsil, iş, vərdişlər, ünsiyyət üslubu, aktiv saatlar, görüş/musiqi zövqü, bildirişlər).
- **Postlar**: hamı / demo (serverdə bulanıqlaşdırılmış önizləmə) / tam xüsusi, planlama, məkan, ≤5 heşteq, heşteq axtarışı, şərhləri bağlama və silmə.
- **Zənglər**: CallKit (iOS) və ConnectionService (Android) — sistem zəng ekranı; iOS PushKit VoIP (`mobile/plugins/withVoipPush.js`, `backend/src/services/apns.ts`, `.env`-də APNS_*), Android data-push fon tapşırığı. Zəng ayarları: yalnız görüntülü/səsli, zəng saatları, status (aktiv/məşğul/uzaqda).
- **Xidmət satışı** (escrow), **iki nişan** (VIP mavi / KYC yaşıl), **Almaz hədiyyələri və paketləri**, iOS 27 üslubunda şüşə tab paneli, 3D Nar sikkəsi (three.js), yeni loqo və maskot.
