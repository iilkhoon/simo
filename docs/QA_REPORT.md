# Simo — QA hesabatı (uçdan-uca səyahətlər)

Tarix: 2026-11-07 · Mühit: veb build (`expo export -p web`) + Playwright (Chromium), iki brauzer konteksti (kişi istifadəçi və qadın host), ayrıca backend və ayrıca DB (`simo_qa`).

## Necə işə salınır

```bash
# 1) DB
createdb simo_qa
cd backend && DATABASE_URL=postgresql://simo:simo@localhost:5432/simo_qa npx prisma migrate deploy && npx tsx prisma/seed.ts
# 2) Backend
DATABASE_URL=.../simo_qa PORT=4790 PUBLIC_URL=http://localhost:4790 npx tsx src/index.ts
# 3) Veb build
cd mobile && EXPO_PUBLIC_API_URL=http://localhost:4790 npx expo export -p web --output-dir /tmp/simo-web --clear
# 4) Səyahətlər (hamısı və ya --only=3,5)
QA_WEB_DIR=/tmp/simo-web QA_API=http://localhost:4790 DATABASE_URL=.../simo_qa node scripts/qa/journeys.mjs
# 5) Statik i18n yoxlaması (az/ru/en açarları, backend xəta kodları, əməliyyat növləri)
cd backend && npx tsx ../scripts/qa/i18n-check.ts
```

Ekran şəkilləri `QA_OUT` qovluğuna (standart `./qa-out`) yazılır; xəta anında bütün açıq səhifələrin şəkli `FAIL-*.png` kimi saxlanılır.
Hər səyahət öz istifadəçilərini yaradır (təsadüfi nömrələr), ona görə təkrar-təkrar işə salmaq olar.

## Nəticə: 10/10 səyahət keçir

| # | Səyahət | Nəticə | Tapılan və düzəldilən xətalar |
|---|---------|--------|------|
| 1 | Telefonla qeydiyyat (DEV OTP) → 18+ razılıq → onboarding (11 addım, 17 yaş bloku, foto) → ana səhifə | ✅ | **B1** CORS PUT/DELETE bloklanırdı · **B2** vebdə foto yükləmə işləmirdi |
| 2 | Kəşf → svayp (keç) → bəyən → qarşılıqlı uyğunluq → uyğunluq ekranı → "Salam yaz" → söhbət | ✅ | **B3** Söhbətlər siyahısı real vaxtda yenilənmirdi |
| 3 | Söhbət: ilk mesaj pulsuz, ödənişli mesaj (Nar azalır, hostun Almazı artır), şəkil (qarşılıqlı izləmə tələbi), şikayət + blok, bloklanan yaza bilmir və pul çıxılmır | ✅ | **B4** blokdan sonra yazma sahəsi görünməyə davam edirdi · **B5** özünü şikayət |
| 4 | Pul kisəsi: test hesabı demo alış → balans başlıqda, Pul kisəsində, Profildə və hədiyyə vərəqində səhifə yenilənmədən dəyişir | ✅ | **B6** demo alış balansı dəyişmirdi · **B7** tarixçədə xam "TEST_PURCHASE" |
| 5 | Hədiyyələr: kiçik (Qızılgül 1), orta (Gül dəstəsi 99), lüks (Tac 999) profildən; söhbətdən sürətli hədiyyə; host qazancı = HostEarning; balans çatmayanda "çatmır" + "Artır" → pul kisəsi | ✅ | — |
| 6 | Host yolu: tapşırıqlar (0/5 → 5/5), KYC (UI, sənəd + selfi), dəvət kodu ilə agentliyə müraciət, sahib UI-da qəbul edir, hədiyyədən sonra "Qazancım" ekranı | ✅ | **B8** kodla qoşulmaq mümkün deyildi (Host müqaviləsi) |
| 7 | Canlı (səsli otaq): host yayına çıxır, izləyici qoşulur (izləyici siyahısı), şərh real vaxtda, bəyənmə, hədiyyə (animasiya + söhbət sətri), host bitirir → nəticə, izləyicidə "Yayın bitdi" | ✅ | **B9** vebdə təsdiq dialoqları (Alert) açılmırdı |
| 8 | Zəng: qiymət təsdiqi (40 Nar/dəq) → "Zəng edilir" → hostda gələn zəng → qəbul → ACTIVE → bitir → hər iki tərəfdə xülasə (müddət, xərclənən/qazanılan); ikinci zəng rədd edilir, pul çıxılmır | ✅ | — (vebdə Agora yoxdur, səs/görüntü yoxlanılmayıb) |
| 9 | Profil: ad/bio redaktəsi, ikinci foto, foto-post, hekayə, Ayarlar → "Hesabı sil" → hesab silinir və welcome ekranı | ✅ | B9 (hesab silmə vebdə işləmirdi) |
| 10 | Dil AZ → RU → EN → AZ: 34 ekran + welcome/telefon skan (xam açar `a.b.c` və qarışıq dil); dil serverdə yadda qalır; bildiriş ayarı dəyişir və yenidən açanda qalır | ✅ | **B10** 46 xəta kodu tərcüməsiz · **B11** KYC placeholder |

## Düzəldilən xətalar

| ID | Harada | Simptom | Kök səbəb | Düzəliş | Test |
|----|--------|---------|-----------|---------|------|
| B1 | backend `src/app.ts` | Vebdə onboarding "Simo-ya başla" heç nə etmir; bütün PUT/PATCH/DELETE sorğuları (profil, hesab silmə, blokdan çıxarma…) brauzerdə bloklanır | `@fastify/cors` v11 standart olaraq yalnız `GET,HEAD,POST` icazə verir | `methods` siyahısı açıq verildi | `test/qa.ts` — preflight PUT/DELETE/PATCH |
| B2 | mobil `src/lib/api.ts` (upload) | Vebdə foto/video yükləmə "Xəta baş verdi" | Vebdə `FormData.append('file', {uri,…})` obyekti "[object Object]" mətni kimi göndərir | Vebdə `uri` Blob kimi oxunub göndərilir (native dəyişməyib) | səyahət 1, 3, 6, 9 |
| B3 | `app/(tabs)/chats.tsx` | Yeni mesaj/uyğunluq gələndə badge "1" olur, amma siyahı boş qalır ("Hələ söhbət yoxdur") | Ekran `getSocket()` ilə dinləyici qoşurdu — soyuq başlanğıcda socket hələ null olur | `useSocket()` + `match` hadisəsində də yenilənir | səyahət 2 |
| B3b | `src/components/CallSafety.tsx` | (eyni nümunə) CallKit/push ilə soyuq başlanğıcda zəng ekranı təhlükəsizlik hadisələrini (bulanıqlaşma, xəbərdarlıq) almaya bilərdi | eyni | `useSocket()` | kod baxışı |
| B4 | `ReportSheet.tsx`, `app/chat/[id].tsx` | Söhbətdən şikayət+blok edəndən sonra yazma sahəsi qalır; bloklanan tərəf yazanda yalnız xəta toast-u | Söhbət ekranı blok vəziyyətini yeniləmirdi | `openReport({ onBlocked })` callback; `BLOCKED` xətasında söhbət məlumatı yenilənir → "yazışma mümkün deyil" | səyahət 3 |
| B5 | backend `POST /reports` | İstifadəçi özünü şikayət edə bilirdi, limit yox idi | yoxlama yox idi | `SELF_REPORT` + 30/10 dəq limit | `test/qa.ts` |
| B6 | backend `POST /payments/dev/purchase` (test hesabı) | Test hesabı (TEST_PHONES) Nar alanda "+N Nar yükləndi" görünür, balans dəyişmir | Yalnız `refillTester` çağırılırdı (balans 500k-dan çoxdursa heç nə etmir) | Paket məbləği **promo** Nar kimi yazılır (hosta nağdlaşan Almaz yaratmır), `wallet:update` göndərilir; Almaz paketi — "alınmış" Almaz | `test/qa.ts` |
| B7 | i18n | Pul kisəsi tarixçəsində xam növlər: `TEST_PURCHASE`, `TEST_REFILL`, `SUBSCRIPTION`, `PK_WIN`, `SERVICE_*`, `SAFETY_*` və s. (15 növ) | `wallet.types` lüğətində yox idi | `mobile/src/i18n/qaText.ts` (az/ru/en) | `i18n-check.ts` |
| B8 | `app/agency/index.tsx` | Dəvət kodu ilə "Müraciət göndər" → "Əvvəlcə Host müqaviləsini qəbul et" — və qəbul etmək üçün heç bir yol yoxdur (agentlik yaratmada da eyni: Agentlik müqaviləsi) | Bu ekran `handleAgreementError` çağırmırdı (kataloqdan müraciət edəndə çağırılır) | Xəta müqavilə tələb edirsə dialoq açılır, qəbul edəndə sorğu təkrarlanır | səyahət 6 (köhnə build-də uğursuz, yenisində keçir) |
| B9 | `src/lib/alertWeb.ts` (yeni), `app/_layout.tsx` | Vebdə "Hesabı sil", "Yayını bitir", "Çıxış" və s. düymələri heç nə etmir | react-native-web-də `Alert.alert` no-op-dur | Vebdə `window.confirm/alert` ilə əvəz (native-ə təsir yoxdur) | səyahət 7, 9 |
| B10 | i18n | 46 backend xəta kodu (`SELF_GIFT`, `LIVE_NOT_ACTIVE`, `CALL_NOT_RINGING`, `PAYMENT_*`, `BAD_IMAGE`…) üçün istifadəçi yalnız "Xəta baş verdi" görürdü | `errors.<KOD>` tərcüməsi yox idi | `qaText.ts` (az/ru/en) | `i18n-check.ts` |
| B11 | `app/verify.tsx` | RU/EN-də doğum tarixi sahəsində "GG.AA.İİİİ" | sabit mətn | `kyc.birthPh` (ДД.ММ.ГГГГ / DD.MM.YYYY) | səyahət 10 |
| — | `app/_layout.tsx` | Almaz paketi alınanda (`wallet:update {diamondsCredited}`) Almaz balansı ekranlarda yenilənmirdi | yalnız `coins` emal olunurdu | `coins` yoxdursa `refreshMe()` | kod baxışı |

## Düzəldilməyən, amma diqqət tələb edən müşahidələr

1. **Təhlükəsizlik — `trustProxy: true`** (`backend/src/app.ts`): `X-Forwarded-For` başlığına tam etibar edilir. Backend birbaşa (Caddy-siz, 4000 portu ilə) açıqdırsa, OTP-nin IP limiti (5/10 dəq) saxta başlıqla keçilə bilər (SMS bombası, kod seçmə). Caddy standart olaraq gələn XFF-ni əvəz edir, ona görə `deploy/setup.sh` konfiqurasiyasında risk azdır. Tövsiyə: `trustProxy: 'loopback'` (və ya 1). QA skripti məhz bu xüsusiyyətdən istifadə edir (hər sorğuya ayrı IP).
2. **Agentliksiz host Almaz qazanmır** (`wallet.rewardReceiver`) — bu, sənədləşdirilmiş biznes qaydasıdır, amma test hesabı "Test Aysel" (host) agentliksizdir: ona göndərilən hədiyyə/mesaj/zəng heç bir qazanc göstərmir. Real telefon testində bunu xəta kimi qəbul etməmək üçün test hostunu agentliyə əlavə edin.
3. **Qızılgül (1 Nar)** hədiyyəsində host payı aşağı yuvarlaqlaşdırılır → 0 Almaz (HostEarning qeydi yaranmır). Qaydaya uyğundur, amma məhsul qərarıdır.
4. **Söhbət siyahısında hədiyyə mətni** həmişə azərbaycanca: `lastMessageText = "🎁 ${gift.nameAz} x1"` — RU/EN istifadəçidə qarışıq dil. Düzəliş üçün mətn yerinə hədiyyə ID saxlanmalı və ya müştəri `type=GIFT` üçün tərcümə etməlidir.
5. **Yayın nəticəsi pəncərəsi** gələn hədiyyə animasiyasının altında qalır (şəkil: `7-host-summary.png`) — vizual, UI agentinə ötürülür.
6. Test hesabının pul kisəsində "+300 hədiyyə" nişanı görünür, amma demo alış ilk yükləmə bonusu vermir (yalnız test hesabı).
7. RU pul kisəsində tab adı "Nar" latın hərfləri ilə, başqa yerlərdə "Нар".
8. `test/calls-live.ts` və `test/safety.ts` sabit 4556 portundan istifadə edir — paralel işə salınan test dəstləri toqquşa bilər (env ilə dəyişmək olmur).
9. Boş söhbətlər (mesajsız `/conversations/with`) siyahıda gizlədilir — gözlənilən davranışdır.

## Vebdə yoxlanıla bilməyənlər → real telefonda əl ilə test siyahısı

Vebdə Agora (səs/görüntü), CallKit/ConnectionService, push, mağaza alışları və kamera yoxdur. Aşağıdakılar **iOS və Android** cihazlarda yoxlanılmalıdır (iki telefon: kişi və host):

### Zənglər (Agora)
- [ ] Səsli zəng: hər iki tərəf bir-birini eşidir; dinamik/qulaqlıq keçidi; mikrofonu söndürmə qarşı tərəfdə səssizlik yaradır.
- [ ] Görüntülü zəng: hər iki kamera görünür; ön/arxa kamera keçidi; kameranı söndürmə; 4 san sonra düymələr gizlənir.
- [ ] İlk dəqiqə qəbul anında, sonra hər dəqiqə tutulur; balans 1 dəqiqəyə enəndə "az qalıb" xəbərdarlığı, bitəndə zəng avtomatik bitir.
- [ ] Şəbəkə 10–40 san kəsiləndə zəng bərpa olunur; 45 san-dan çox — bitir, artıq pul tutulmur.
- [ ] Zəng zamanı hədiyyə: hostda banner/animasiya, göndərəndə balans azalır.
- [ ] Görüntülü zəngdə çılpaqlıq aşkarlanması (təhlükəsizlik): qarşı tərəfdə bulanıqlaşma, xəbərdarlıq.
- [ ] Xülasə ekranı: müddət, xərclənən Nar / qazanılan Almaz, ulduz qiyməti göndərilir.

### CallKit / ConnectionService
- [ ] Tətbiq fonda: iOS-da CallKit tam ekran gələn zəng (zəng edənin adı), Android-də ConnectionService/tam ekran bildiriş.
- [ ] Kilid ekranından qəbul → tətbiq açılır və zəng birləşir (soyuq başlanğıc — B3b düzəlişi).
- [ ] Kilid ekranından rədd → zəng edəndə "rədd edildi", pul tutulmur.
- [ ] Zəng edən ləğv edəndə sistem zəng ekranı dərhal bağlanır.
- [ ] Eyni hesab iki cihazda: birində qəbul edəndə digərində zəng ekranı bağlanır.

### Push bildirişləri
- [ ] Yeni mesaj, uyğunluq, bəyənmə, hədiyyə, izlədiyim yayına çıxdı, agentlik qərarı — hər biri gəlir, toxunanda düzgün ekran açılır (söhbət, profil, yayın).
- [ ] Bildiriş dili istifadəçinin seçdiyi dildədir (AZ/RU/EN).
- [ ] Bildiriş ayarlarında söndürülən növ gəlmir.
- [ ] Tətbiq tam bağlı ikən push-a toxunanda söhbət ekranı açılır və yeni mesajlar görünür.

### Alışlar
- [ ] iOS App Store (sandbox): paket alışı → balans dərhal artır (başlıq, Profil, hədiyyə vərəqi); ilk yükləmə bonusu (≤300 promo).
- [ ] Alışı ləğv etmək → xəta yox, balans dəyişmir.
- [ ] Eyni qəbzin təkrar göndərilməsi (tətbiqi alış ortasında bağlamaq) → Nar bir dəfə yazılır.
- [ ] Google Play: eyni yoxlamalar; geri qaytarılan alış (refund) → `PAYMENT_REVOKED`.
- [ ] Huawei/Epoint: veb ödəniş səhifəsi açılır, qayıdanda balans yenilənir.
- [ ] Almaz paketləri: Almaz balansı yenilənir (`_layout.tsx` — `wallet:update` düzəlişi).
- [ ] App Review hesabı (`REVIEW_PHONES`) — adi hesab kimi real sandbox alışı.

### Kamera / media
- [ ] Onboarding və profil fotosu: qalereya və kamera icazəsi (rədd edəndə xəta yox), 3:4 kəsmə.
- [ ] KYC: sənəd (arxa kamera) və selfi (ön kamera) çəkilir və göndərilir.
- [ ] Video post (≤90 san), uzun video xətası (`VIDEO_TOO_LONG` mətni), yükləmə irəliləyişi.
- [ ] Hekayə: foto və video; 24 saat sonra itir.
- [ ] Video yayın: kamera, gözəllik filtri, kamera çevirmə, qonaq (co-host) qoşulması, PK döyüşü.
- [ ] Söhbətdə şəkil (yalnız qarşılıqlı izləmədə).

### Ümumi
- [ ] Dil dəyişmə (AZ/RU/EN) bütün ekranlarda dərhal tətbiq olunur, tətbiqi yenidən açanda qalır.
- [ ] 18+ razılıq qutusu işarələnmədən davam etmək olmur; 17 yaş doğum tarixi bloklanır.
- [ ] Hesabın silinməsi → çıxış, yenidən eyni nömrə ilə daxil olanda yeni hesab.
- [ ] Kiçik ekran (iPhone SE, 360×740 Android) — düymələr klaviaturanın altında qalmır.
