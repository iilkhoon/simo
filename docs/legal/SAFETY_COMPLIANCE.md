# Simo — zəng və yayınlarda təhlükəsizlik: hüquqi və mağaza uyğunluğu

> **LAYİHƏ — hüquqşünas baxışı tələb olunur.** Bu sənəd mühəndislik və uyğunluq qeydidir, hüquqi rəy deyil.
> Azərbaycan qanunvericiliyinə dair hissələr ikinci dərəcəli mənbələrə əsaslanır (rəsmi mətn: e-qanun.az) və
> lisenziyalı yerli hüquqşünas tərəfindən yoxlanılmalıdır. Versiya: 2026-11-06.

## 0. Qısa cavab (sahibin sualı)

"Kişi ilə qız görüntülü zəngdədir, qız bədənini açır — biz məsuliyyət daşımamalıyıq."

Platforma yalnız "biz cavabdeh deyilik" yazmaqla qorunmur. Hüquqi müdafiə (və App Store / Google Play-də qalmaq)
yalnız platforma bunları **etdikdə və sübut edə bildikdə** mümkündür:

| Tələb | Simo-da nə edildi | Harada |
|---|---|---|
| (a) Müqavilə ilə qadağa | Şərtlər §11–15, İcma qaydaları, Host və Agentlik müqavilələri, ilk görüntülü zəngdən əvvəl razılıq (versiya ilə qeyd olunur) | `web/terms.html`, `web/community-guidelines.html`, `web/host-agreement.html`, `web/agency-agreement.html`, `SafetyProfile.videoNoticeAt` |
| (b) Aktiv moderasiya | Hər 10–20 s (təsadüfi) öz kameranın kadrı → Sightengine / Rekognition / insan növbəsi; pozuntuda bulanıqlaşdırma, xəbərdarlıq, zəngin bitirilməsi, strike, dayandırma | `backend/src/services/safety.ts`, `mobile/src/lib/callSafety.ts`, `mobile/src/components/CallSafety.tsx` |
| (c) Şikayətə tez reaksiya | Zəng ekranında görünən "Şikayət" + qarşı tərəfin kadrı; azyaşlı şikayəti növbədə birinci (legalHold); 24 saatda 3 müstəqil şikayət → baxışa qədər avtomatik dayandırma | `POST /safety/reports`, admin "Moderasiya" bölməsi |
| (d) Sübut və jurnal | `SafetyEvidence` (sha256, ballar, kontekst, iştirakçılar), `SafetyStrike`, `AgeCheck`, `SafetyAuditLog` (hər moderator baxışı da yazılır); saxlama müddəti | `backend/prisma/schema.prisma` (son modellər) |
| (e) Orqanlarla əməkdaşlıq | İstifadəçi üzrə JSON ixrac (sorğu nömrəsi ilə, avtomatik legalHold), şəkillər ayrıca sha256 ilə | `GET /admin/safety/users/:id/export?ref=...` |

## 1. Araşdırma: bazar praktikası

| Platforma | Nə edir (açıq mənbələr) |
|---|---|
| **Bigo Live** | Öz AI CMS-i: şəkil/üz/video/səs tanıma; bildirilən: yayımdan **hər ~3 saniyədə ekran görüntüsü**, gündə 300 mln+ şəkil; 24/7 insan moderatorlar; "sıfır tolerantlıq" bəyanatı. [Gulf News](https://gulfnews.com/business/gitex-technology-week-bigo-uses-ai-and-humans-to-keep-violence-and-sex-off-its-apps-1.67019728), [KrASIA](https://kr-asia.com/live-video-app-bigo-already-had-to-block-200000-pieces-of-content-in-indonesia), [Marketing-Interactive](https://www.marketing-interactive.com/streaming-app-bigo-live-under-scrutiny-for-indecent-posts/) |
| **Tango** | Hive Moderation (vizual AI) ilə köhnə daxili sistemi əvəz edib; vendor case-study: uyğunsuz yayım məzmununda ~80% azalma. App Store-da "nudity, underage broadcasters or sexual behavior is prohibited". [Hive case study](https://www.casestudies.com/company/hive-moderation/case-study/tango-customer-case-study), [eSafety guide](https://esafety.gov.au/key-topics/esafety-guide/tango) |
| **Azar (Hyperconnect / Match Group)** | Vizual və səs siqnallarının avtomatik + insan monitorinqi; **"Video Blur"** — avtomatik sistem pozuntu aşkarlayanda video dayandırılır/bulanıqlaşır və şikayət təklif olunur. Buna baxmayaraq mətbuat (Le Monde) azyaşlıların cinsi məzmunla qarşılaşmasını tənqid edib — yəni yalnız AI kifayət deyil. [App Store](https://apps.apple.com/nz/app/azar-video-chat/id972558973), [TechCrunch](https://techcrunch.com/?p=2900858), [Le Monde/e-Enfance](https://e-enfance.org/en/le-monde-azar-the-application-that-exposes-minors-to-sexual-content/) |
| **Chamet, MICO, LivU, Hakuna** | Rəsmi açıq host/agentlik müqavilələri tapılmadı; istifadəçi şikayətləri (məs. Chamet-də host çılpaqlığı və şikayətə cavabın olmaması) göstərir ki, **şikayətə reaksiya müddəti** əsas risk nöqtəsidir. [Şikayətvar](https://www.sikayetvar.com/en/chamet-us/chamet-failed-to-stop-pornographic-live-content) |
| **Agora** | SDK-da `enableContentInspect` (ContentInspectModeration / Supervision) — Agora tərəfindən skrinşot götürüb yükləmə və webhook; Marketplace partnyorları (ActiveFence, əvvəllər Hive). Agora Console-da ayrıca aktivləşdirmə və ödəniş tələb edir. [Agora ActiveFence](https://docs.agora.io/en/realtime-media/marketplace/build/add-moderation-and-intelligence/activefence), [ContentInspectConfig](https://api-ref.agora.io/video-sdk/android/4.x/API/class_contentinspectconfig.html) |
| **Vendorlar** | Sightengine `nudity-2.1`: 1 model × 1 şəkil = 1 əməliyyat; Starter $29/ay 10k əməl., Pro ~$399/ay 200k, artıq ~$0.0015–0.002/əməl., pulsuz ~2000/ay. [Pricing](https://sightengine.com/pricing), [operation](https://sightengine.com/faq/what-is-an-operation), [model](https://sightengine.com/docs/advanced-nudity-detection-model-2.1). AWS Rekognition `DetectModerationLabels`: ~$0.001/şəkil ilk 1 mln, sonra ~$0.0008. [AWS pricing](https://aws.amazon.com/rekognition/pricing/), [Hive + IVS](https://aws.amazon.com/blogs/media/add-hive-content-moderation-to-your-amazon-ivs-video-streams) |

**Nəticə:** sənaye standartı = (1) müştəri və ya server tərəfdən dövri kadr → AI, (2) aşkarlamada dərhal bulanıqlaşdırma/dayandırma,
(3) insan baxışı növbəsi, (4) zəngdən şikayət, (5) strike/ban pilləsi, (6) host/agentlik müqaviləsi ilə məsuliyyətin ötürülməsi.
Simo eyni modeli tətbiq edir; Agora Extensions əvəzinə **provayderdən asılı olmayan** öz boru xəttimiz seçildi (Agora Console-da
əlavə məhsul tələb etmir, açarsız da işləyir, sübut bizim nəzarətimizdədir). Gələcəkdə `enableContentInspect`-ə keçid mümkündür.

## 2. Mağaza tələbləri

### Apple App Review Guidelines ([mənbə](https://developer.apple.com/app-store/review/guidelines/))
- **1.1.4** — açıq-aşkar cinsi/pornoqrafik material, "hookup" tətbiqləri, fahişəliyi və ya insan alverini asanlaşdıra bilən tətbiqlər qadağandır.
- **1.2** — UGC tətbiqində məcburidir: obyektiv məzmun filtri; şikayət mexanizmi və **vaxtında cavab**; istifadəçini bloklamaq; açıq əlaqə məlumatı.
  "Əsasən pornoqrafik məzmun, Chatroulette tipli, təsadüfi/anonim söhbət" üçün istifadə olunan tətbiqlər xəbərdarlıqsız silinə bilər.
  Pozuntunu silmək tərtibatçının məsuliyyətidir; təkrarlanan pozuntu Developer Program-dan çıxarılmaya səbəb ola bilər.
- **1.2.1(a)** — creator tətbiqləri yaş həddini aşan məzmunu müəyyən etməli və **təsdiqlənmiş və ya bəyan edilmiş yaşa** əsaslanan məhdudiyyət tətbiq etməlidir.
- **5.1.4** — uşaqlardan məlumat toplanmamalıdır (Simo 18+, yaş qapısı var).

**Simo üçün konkret öhdəliklər:** (1) Təsadüfi video tanışlıq funksiyası "Chatroulette" kimi görünməməlidir — yalnız təsdiqlənmiş hostlar, profil göstərilir, monitorinq və şikayət var; App Review qeydlərində bu izah edilməlidir (`docs/APP_REVIEW.md`-ə əlavə edin). (2) Yaş reytinqi 17+/18+, "Frequent/Intense Mature/Suggestive Themes" düzgün doldurulmalı. (3) Review hesabı moderasiya axınını göstərə bilməlidir.

### Google Play ([UGC](https://support.google.com/googleplay/android-developer/answer/12923286), [Inappropriate content](https://support.google.com/googleplay/android-developer/answer/9876937))
- Cinsi həzz üçün nəzərdə tutulmuş məzmun qadağandır; azyaşlılarla bağlı cinsi məzmun — hesabın bağlanması və hüquq-mühafizəyə bildiriş.
- UGC tətbiqi: istifadəçi paylaşmadan əvvəl qəbul etdiyi şərtlər, **tətbiqdaxili şikayət**, 1-ə-1 ünsiyyətdə **bloklama**, effektiv və davamlı moderasiya.
- Əsas məqsədi və ya şöhrəti cinsi UGC olan tətbiqlər silinir. Medianama (2026) Play-də anonim video tətbiqlərinin cinsi söhbəti asanlaşdırdığı üçün təzyiq altında olduğunu qeyd edir. [Medianama](https://www.medianama.com/2026/06/223-nudity-age-checks-anonymous-chat-apps-play-stores/)
- Play Console → Data safety: "Photos/videos — collected, processed ephemerally? NO (pozuntular saxlanılır)", məqsəd "App functionality / Fraud prevention, security, compliance" — **yenilənməlidir**.

## 3. Azərbaycan qanunvericiliyi (hüquqşünas yoxlamalıdır)

| Sahə | Qeyd | Simo üçün öhdəlik |
|---|---|---|
| **Cinayət Məcəlləsi, m. 242** — pornoqrafik material/əşyaların qanunsuz yayılması; 2025–2026 düzəlişləri ilə süni intellektlə razılıqsız cinsi material üçün 3–7 il | [Trend](https://www.trend.az/azerbaijan/society/1868414.html), [news.az](https://news.az/news/azerbaijan-approves-penalties-for-ai-generated-fake-non-consensual-content), [Eurasianet](https://eurasianet.org/node/66920) | Platforma "yayıcı" sayılmamalıdır: qadağa + aktiv moderasiya + sürətli silmə + sübutun saxlanması. Azyaşlı pornoqrafiyası ayrıca ağır cinayətdir (hüquqşünas maddəni dəqiqləşdirməli). |
| **İnzibati Xətalar Məcəlləsi** — "əxlaqsız" onlayn məzmuna yeni cərimələr (2025) | [AzerNews](https://www.azernews.az/nation/250652.html), [Report.az](https://report.az/en/amp/milli-majlis/azerbaijan-s-parliament-backs-initial-ban-on-immoral-online-content) | Dəqiq tərkib və subyektlər (platforma? istifadəçi?) hüquqşünasla müəyyənləşdirilməli. |
| **"İnformasiya, informasiyalaşdırma və informasiyanın mühafizəsi haqqında" Qanun, m. 13-2 / 13-3** — qadağan olunmuş informasiya; resurs sahibi və hostinq provayderi **xəbərdarlıqdan sonra ~8 saat ərzində** silməli/bloklamalıdır; təcili hallarda məhkəməsiz bloklama | [az-netwatch](https://www.az-netwatch.org/?p=1209), [WIPO Lex](https://www.wipo.int/wipolex/en/legislation/details/9204), [Meydan TV](https://www.meydan.tv/en/article/internet-controls-are-tightening-in-azerbaijan-the-governments-authority-to-block-websites-is-expanding/) | Rəsmi orqanın bildirişinə **8 saat** daxilində reaksiya prosesi: legal@simo.az növbətçi, admin paneldə "Daimi blok / Bitir". Bu müddət daxili SLA kimi qəbul edilib. |
| **"Uşaqların zərərli informasiyadan qorunması haqqında" Qanun (2018)** + 2026 düzəlişləri (16 yaşadək sosial şəbəkə məhdudiyyəti müzakirədə) | [MinCom](https://mincom.gov.az/en/media-en/news/strengthening-childrens-safety-in-the-digital-environment-what-do-the-amendments-cover), [Report.az](https://report.az/en/domestic-politics/children-and-social-media-why-legal-protection-is-becoming-a-necessity), [family.gov.az](https://family.gov.az/en/post/2086/usaqlarin-zererli-informasiyadan-qorunmasi-ile-bagli-komitenin-melumati) | 18+ yaş qapısı; azyaşlı bəyanı → hesab bloku; host üçün sənəd ilə 18+; yaş təsnifatı. Düzəlişlər qəbul olunarsa yaş yoxlaması gücləndirilməli. |
| **"Fərdi məlumatlar haqqında" Qanun (2010, № 998-IIIQ)** — emal üçün (yazılı/açıq) razılıq, sərhədkənar ötürmə yalnız adekvat qoruma ilə, informasiya sistemlərinin dövlət reyestrində qeydiyyat | [DataGuidance](https://www.dataguidance.com/notes/azerbaijan-data-protection-overview), [ACON Law](https://acon.az/data-protection-in-azerbaijan) | (1) Kadr moderasiyası üçün **ayrıca açıq razılıq** — ilk görüntülü zəngdən əvvəlki bildiriş (versiya + tarix DB-də). (2) Sightengine (Fransa/AB) və ya AWS region (məs. eu-central-1) — sərhədkənar ötürmə; razılıq mətnində göstərilib. (3) Simo informasiya sistemi reyestrdə qeydiyyatdan keçməlidir (hüquqşünas + DTX/İqtisadiyyat nazirliyi — tənzimləyici dəqiqləşdirilməli). (4) KYC selfi biometrik ola bilər — ayrıca razılıq. |
| **"Elektron imza və elektron sənəd haqqında" Qanun** | — | Host/Agentlik müqaviləsinin "klik" ilə qəbulu sadə elektron razılıq kimi saxlanılır (`SafetyProfile.hostAgreementAt/Version`, `SafetyAuditLog CONSENT`). Hüquqşünas kifayət edib-etmədiyini təsdiqləməlidir. |
| **Vergi Məcəlləsi** | — | Hostlar müstəqil podratçı; vergi öhdəliyi onlardadır, lakin platformanın vergi agenti öhdəliyi olub-olmaması (fiziki şəxslərə ödənişlər) hüquqşünas/mühasiblə yoxlanılmalıdır. |

## 4. Texniki axın

```
Mobil (görüntülü zəng qoşulub, kamera açıq, bildiriş qəbul edilib)
  └─ hər 10–20 s (təsadüfi): Agora takeSnapshot(uid=0) → cache/simo_safety_local.jpg (üzərinə yazılır)
       └─ POST /safety/frames?contextType=CALL|LIVE&contextId=…  (multipart, Bearer)
Backend
  ├─ iştirakçı + aktiv VIDEO zəng / VIDEO yayının hostu (və ya video qonaq) yoxlanılır
  ├─ sharp: EXIF silinir, ≤640 px JPEG
  ├─ provayder: Sightengine nudity-2.1 | Rekognition DetectModerationLabels | none
  ├─ qərar (lib/moderation.ts → frameVerdict): sexual ≥ 0.80 → VIOLATION; ≥ 0.50 və ya suggestive ≥ 0.90 → SUSPECT; açarsız → UNSCANNED
  ├─ SAFE → heç nə saxlanılmır
  ├─ SUSPECT / UNSCANNED (seçmə, SAFETY_QUEUE_SAMPLE) → sübut + admin növbəsi
  └─ VIOLATION →
       ├─ qarşı tərəfə `safety:blur` (ekran örtülür + muteRemoteVideoStream), yayında bütün otağa
       ├─ pozucuya `safety:warning` (öz videosu müvəqqəti göndərilmir: muteLocalVideoStream)
       ├─ (istəyə görə) Agora REST kicking-rule: publish_video / join_channel qadağası — dəyişdirilmiş müştəriyə qarşı
       ├─ strike (bir zəng/yayın = 1 avtomatik strike)
       ├─ eyni zəngdə 2-ci aşkarlama → zəng bitir (`SAFETY_VIOLATION`) / yayın bitir (`MODERATION`)
       └─ 3 aktiv strike → 7 gün dayandırma; 6 → daimi blok
```

Zəng daxilində şikayət: `POST /safety/reports` — qarşı tərəfin videosunun kadrı (`takeSnapshot(remoteUid)`), səbəb
(NUDITY, UNDERAGE, HARASSMENT, SCAM, VIOLENCE, OTHER). Kadr da provayderdən keçir; açıq pozuntu → dərhal yuxarıdakı tədbirlər.
UNDERAGE → `legalHold=true`, növbədə birinci. NUDITY/UNDERAGE seçildikdə şikayətçinin ekranı dərhal örtülür və zəngi bitirmək / bloklamaq təklif olunur.

## 5. Strike, dayandırma və etiraz

| Hadisə | Tədbir |
|---|---|
| Avtomatik pozuntu (hər zəng/yayın üçün ən çox 1) | strike, 180 gün aktiv |
| Moderator "Təsdiq" | strike (avtomatik ləğv edilibsə yenidən), sübut 1 il |
| Moderator "Yanlış — ləğv" | həmin kontekstin avtomatik strike-ları ləğv; strike səbəbli dayandırma hədd altına düşərsə götürülür |
| 3 aktiv strike | 7 gün dayandırma (`banned=true`, `SafetyProfile.suspensionActive`), aktiv zəng/yayın bitir, force-logout; 10 dəqiqəlik iş müddət bitəndə avtomatik açır |
| 6 aktiv strike / moderator "Daimi blok" | `permanentBan` |
| 24 saatda 3 fərqli şikayətçi (NUDITY/UNDERAGE) | 1 gün dayandırma (baxışa qədər) |
| 18-dən kiçik doğum tarixi (onboarding və ya KYC formu) | hesab bloku (`declaredMinorAt`), başqa tarixlə təkrar cəhd mümkün deyil |

Etiraz: support@simo.az, 30 gün (Şərtlər §11). Admin: "Dayandırmanı götür".

**Məlum məhdudiyyət:** dayandırma `User.banned` sahəsindən istifadə edir. Admin ümumi "Blokla" düyməsi ilə dayandırılmış istifadəçini
bloklasa, avtomatik iş müddət bitəndə onu aça bilər — daimi blok üçün Moderasiya bölməsindəki "Daimi blok" düyməsindən istifadə edin.

## 6. Ödəniş qərarı (sənədləşdirilmiş)

- Pozuntu ilə bitən zəng **ödəməyə davam etmir**: zəng `ENDED` olur, dəqiqəlik ödəniş dövrü dayanır.
- **Pozucu qəbul edən (host) olduqda:** ödəyənə ilk aşkarlamanın düşdüyü dəqiqədən (−60 s) sonrakı bütün dəqiqələr qaytarılır
  (`SAFETY_REFUND`; promo hissə promo kimi qaytarılır), hostun həmin dəqiqələrdən Almaz qazancı geri alınır (`SAFETY_CLAWBACK`,
  yalnız qazanılmış Almaz, mənfiyə düşmədən; çatmayan hissə `owed:N` qeydində). İdempotentdir; moderator "Təsdiq" edəndə də (avtomatik olmayıbsa) işləyir.
- **Pozucu ödəyənin özüdürsə:** qaytarılma yoxdur (öz pozuntusuna görə pul qaytarılmır), host qazancını saxlayır.
- Tək aşkarlama (zəng bitmədən): avtomatik qaytarılma yoxdur — video 20 s örtülür, ödəyən zəngi bitirə bilər; moderator təsdiqində qaytarılır.
- **Açıq məsələ:** agentlik komissiyasının (`AGENCY_COMMISSION`, refId=host) avtomatik geri alınması edilməyib — Agentlik müqaviləsi §4 hüquqi əsası verir, əl ilə və ya sonrakı iterasiyada.

## 7. Sübutların saxlanması (retention)

| Növ | Müddət | Env |
|---|---|---|
| Təmiz kadr | saxlanılmır | — |
| UNSCANNED (açarsız rejim, seçmə) | 3 gün | `SAFETY_RETENTION_UNSCANNED_DAYS` |
| SUSPECT | 30 gün | `SAFETY_RETENTION_SUSPECT_DAYS` |
| VIOLATION / şikayət kadrı | 180 gün | `SAFETY_RETENTION_VIOLATION_DAYS` |
| Moderator təsdiqi | 1 il | `SAFETY_RETENTION_CONFIRMED_DAYS` |
| Yanlış pozitiv | 7 gün | `SAFETY_RETENTION_DISMISSED_DAYS` |
| legalHold (azyaşlı şübhəsi, rəsmi sorğu) | silinmir | — |

Fayllar `SAFETY_EVIDENCE_DIR` (standart: `UPLOAD_DIR/../safety-evidence`) qovluğunda, **ictimai `/files/` altında deyil**, 0600 icazə ilə.
Müddət bitəndə fayl silinir, metadata (qərar, ballar, sha256) jurnal kimi qalır. İstehsalda: şifrələnmiş disk / ayrıca bucket (server-side encryption), yalnız backend girişi, ehtiyat nüsxə siyasəti.

## 8. Hüquq-mühafizə orqanları ilə iş qaydası

1. Rəsmi sorğu (DİN, Prokurorluq, məhkəmə) yalnız legal@simo.az ünvanına, yazılı və imzalı formada qəbul edilir; həqiqiliyi yoxlanılır.
2. Admin → Moderasiya → "İxrac (DİN)": sorğu nömrəsi daxil edilir → JSON (profil, KYC metadata, strike, sübut metadata + sha256, şikayətlər, zəng/yayın tarixçəsi, jurnal) yüklənir; bütün sübutlar avtomatik `legalHold` olur. Jurnalda `LE_EXPORT` yazılır.
3. Şəkillər ayrıca, sha256 müqayisəsi ilə təhvil verilir.
4. Azyaşlı istismarı (CSAM) şübhəsi: şəkli **yükləməyin, köçürməyin, paylaşmayın**; legalHold qoyun, hesabı daimi bloklayın, eyni gün DİN Kibercinayətkarlığa qarşı mübarizə idarəsinə bildirin. (Hüquqşünas: Azərbaycanda platformanın məcburi bildiriş öhdəliyini və belə materialın saxlanma rejimini təsdiqləməlidir; NCMEC / INHOPE-ə könüllü bildiriş imkanı da qiymətləndirilsin.)
5. Rəsmi bloklama bildirişi (İnformasiya Qanunu m. 13-2): **8 saat** daxilində icra.

## 9. Yaş təminatı

- Qeydiyyat: 18+ və Şərtlər işarəsi (mövcud) + monitorinq qeydi; 18-dən kiçik doğum tarixi → hesab bloku (`AgeCheck SELF_DECLARED`).
- Host təsdiqinin **bütün yolları** (admin `hostStatus=APPROVED`, agentliyin müraciəti qəbulu, agentliyin `approve-host`, agentlik təsdiqində sahib) `assertHostAgeEligible` çağırır: PENDING/APPROVED KYC olmalı, sənəddəki doğum tarixi 18+, hesab doğum tarixi 18+. Uyğunsuzluq `DOB_MISMATCH` qeydi ilə yazılır. Hər yoxlama `AgeCheck` (HOST_APPROVAL).
- Admin KYC "Təsdiq" — sənəddəki doğum tarixi <18 olduqda rədd (`UNDERAGE`), `AgeCheck KYC_REVIEW`.
- **Tövsiyə:** host qazancı yalnız KYC **APPROVED** olduqdan sonra başlasın (indi agentliyə qəbul PENDING KYC ilə də mümkündür; pul çıxarışı isə APPROVED tələb edir). Biznes qərarı — dəyişdirilmədi.

## 10. Sahibin etməli olduqları (hesablar, açarlar, xərclər)

| # | Nə | Niyə | Xərc (təxmini, 2026) |
|---|---|---|---|
| 1 | **Sightengine** hesabı → `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET` (`MODERATION_PROVIDER=sightengine`) | Əsas tövsiyə: nudity-2.1 dəqiq, sadə | Pulsuz ~2000 əməl./ay (test); Starter $29/ay 10k; Pro ~$399/ay 200k + ~$0.0015/əlavə |
| 1-alt | və ya **AWS** IAM istifadəçisi (yalnız `rekognition:DetectModerationLabels`) → `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REKOGNITION_REGION=eu-central-1` | Daha ucuz, böyük həcm | ~$0.001/kadr (ilk 1 mln/ay), sonra ~$0.0008 |
| 2 | (istəyə görə) **Agora RESTful** Customer ID/Secret → `AGORA_CUSTOMER_ID`, `AGORA_CUSTOMER_SECRET` | Pozucunun videosunu server tərəfdən kəsmək (dəyişdirilmiş müştəri) | Agora planına daxil |
| 3 | Azərbaycanda lisenziyalı hüquqşünas | Bütün `web/*` hüquqi mətnlərin və bu sənədin yoxlanması, reyestr qeydiyyatı | — |
| 4 | legal@simo.az və support@simo.az qutuları + növbətçi moderator (azyaşlı şikayəti ≤1 saat) | Apple 1.2 "timely response", qanuni 8 saat | Kadr |
| 5 | Sübut qovluğu üçün şifrələnmiş saxlama (`SAFETY_EVIDENCE_DIR`) | Məxfilik | — |
| 6 | App Store Connect: yaş reytinqi, Review Notes (monitorinq + şikayət izahı); Play Console: Data safety (foto/video toplanır — təhlükəsizlik) | Mağaza | — |

**Həcm hesabı:** görüntülü zəngdə hər iki tərəf orta hesabla 15 s-də 1 kadr göndərir → ~8 kadr/dəqiqə/zəng. Gündə 1000 zəng-dəqiqəsi ≈ 240k kadr/ay:
Sightengine ≈ $399 + 40k×$0.0015 ≈ **$460/ay**; Rekognition ≈ **$240/ay**. Xərci azaltmaq üçün: `SAFETY_FRAME_MIN_SEC/MAX_SEC` (məs. 20–40 s), yalnız
host tərəfini yoxlamaq (biznes riski hostdadır), və ya yeni/aşağı etibarlı hesablar üçün tezlik. Açarsız (`none`) rejim pulsuzdur, amma yalnız insan baxışı
(`SAFETY_QUEUE_SAMPLE`, standart 25%) — **App Review üçün kifayət etməyə bilər**; istehsalda provayder açarı tövsiyə olunur.

## 11. Konfiqurasiya (env)

```
MODERATION_PROVIDER=sightengine|rekognition|none   # boş: açar hansıdırsa
SIGHTENGINE_API_USER= SIGHTENGINE_API_SECRET= SIGHTENGINE_MODELS=nudity-2.1
AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= AWS_REKOGNITION_REGION=eu-central-1
AGORA_CUSTOMER_ID= AGORA_CUSTOMER_SECRET=
SAFETY_BLOCK_SCORE=0.8 SAFETY_REVIEW_SCORE=0.5 SAFETY_END_AFTER=2
SAFETY_STRIKES_TO_SUSPEND=3 SAFETY_SUSPEND_DAYS=7 SAFETY_STRIKE_TTL_DAYS=180 SAFETY_REPORTS_TO_SUSPEND=3
SAFETY_FRAME_MIN_SEC=10 SAFETY_FRAME_MAX_SEC=20 SAFETY_BLUR_SECONDS=20 SAFETY_QUEUE_SAMPLE=0.25
SAFETY_EVIDENCE_DIR=/var/lib/simo/safety-evidence
SAFETY_RETENTION_{UNSCANNED,SUSPECT,VIOLATION,CONFIRMED,DISMISSED}_DAYS
```

## 12. Hüquqşünas üçün açıq suallar

1. Kadr moderasiyası üçün tətbiqdaxili klik-razılıq "Fərdi məlumatlar haqqında" Qanunun "yazılı razılıq" tələbinə cavab verirmi?
2. Sightengine (AB) / AWS-ə sərhədkənar ötürmə üçün əlavə şərt (adekvatlıq, müqavilə) lazımdırmı?
3. Simo informasiya sistemi fərdi məlumatların dövlət reyestrində qeydiyyatdan keçməlidirmi; tənzimləyici kimdir?
4. Platformanın azyaşlı pornoqrafiyası barədə məcburi bildiriş öhdəliyi və belə sübutun saxlanma rejimi.
5. İnzibati Xətalar Məcəlləsinin "əxlaqsız məzmun" düzəlişləri platformaya şamil olunurmu?
6. Hostlara ödənişlərdə Simo vergi agentidirmi (ÖMV / gəlir vergisi)?
7. Məsuliyyətin 12 aylıq ödənişlə məhdudlaşdırılması və təzminat bəndləri İstehlakçıların hüquqları Qanunu ilə uyğundurmu?
8. Agentlik komissiyasının geri alınması (clawback) və 14 günlük xitam bəndləri Mülki Məcəllə ilə uyğundurmu?
