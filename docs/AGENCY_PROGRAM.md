# Simo agentlik və host proqramı (spesifikasiya)

> Məqsəd (sahibin sözü): **agentliklər üçün işləyən qızlar burada qazanmalıdır; kişilər qızlarla danışmaq üçün pul xərcləməlidir.**
> Bu sənəd rəqib platformaların modelini, Simo-da seçilmiş qaydaları və onların koddakı yerini təsvir edir.

## 1. Bazar araşdırması (qısa)

Mənbələrin əksəriyyəti üçüncü tərəf bələdçiləridir (çox vaxt "coin reseller" saytları). Rəqəmlər bir-birinə zidd ola bilər. Biz bunları yalnız istiqamət kimi istifadə etdik.

| Platforma | Qeydiyyat / dəvət | Pay bölgüsü | Səviyyələr / tələblər | Ödəniş |
|---|---|---|---|---|
| **Bigo Live** | Agentlik müraciəti, platforma təsdiq edir; host agentlik ID-si ilə qoşulur | Agentlik streamerin payının ~10–20%-ni alır, rəqəmlər səviyyəyə görə dəyişir (reseller proqramlarında 20–55%) | Aylıq hədd (məs. 40K bean, ayda 30 saat / 15 gün), hədd iki dəfə tutulmasa 50% kəsinti; yeni host ilk 3 ayda başqa agentliyə köçürülə bilmir, köçürmə üçün üç tərəfin razılığı lazımdır | Aylıq / həftəlik, 210 bean ≈ $1 |
| **Chamet** | Agentlik linki/ID-si ilə; zəng qiymətini host özü təyin edir | Host zəng gəlirinin ~60–70%-ni alır; agentlik komissiyası hostun gəlirinin **üstündən** verilir (≤30%), 30 günlük komanda gəlirinə görə | Səviyyə agentliyin payını artırır, hostun nağdlaşdırma məzənnəsi isə dəyişmir | MetWallet, 1–5 iş günü |
| **Poppo** | Ən azı 5 aktiv host; alt agentliklər (sub-agency) var | Agentlik 4–20% (canlı yayın), 1-ə-1 söhbətdə 30–50%; host 70% hədiyyə payını tam alır, komissiyanı platforma ayrıca ödəyir | 30 günlük xala görə D–S səviyyələri; hostlardan gündə ≥1 saat aktivlik tələb olunur; başqa agentliyin hostlarını cəlb etmək qadağandır | Həftəlik |
| **Tango** | Təsdiqdən sonra fərdi izləmə linki verilir; qeydiyyat yalnız bu linklə sayılır | Cəlb olunan streamerin gəlirindən 12 ay ərzində 10% | Səviyyə yoxdur, minimum saat tələbi yoxdur | Aylıq (Payoneer), minimum $25–50 |
| **MICO / Likee** | "My Agent" → agentlik ID-si | — | Agentlikdən çıxdıqdan sonra 30–90 gün gözləmə, köçürmə üçün 30+ gün təmiz tarixçə | — |

**Nəticələr:** (1) agentlik komissiyası adətən **platformanın payından, hostun gəlirinin üstündən** ödənir, hostun payını azaltmır; (2) səviyyə 30 günlük komanda gəlirinə görə hesablanır; (3) dəvət linki/kodu əsas cəlb kanalıdır; (4) hostun bir agentlikdən digərinə keçməsi gözləmə müddəti ilə məhdudlaşdırılır; (5) ödəniş həftəlik və ya aylıqdır, minimum məbləğ və şəxsiyyət təsdiqi (KYC) tələb olunur; (6) agentlik panelində hostlar, hər hostun qazancı, onlayn vaxtı, zəngləri və hədiyyələri göstərilir.

## 2. Simo qaydaları

### 2.1 Valyuta
- **Nar**: kişi pulla alır. Nominal dəyəri 1 Nar = 1 qəpik. **Promo Nar** (bonuslar) birinci xərclənir və qəbul edənə nağdlaşan Almaz yaratmır.
- **Almaz**: host və agentliyin qazancıdır. Daxili vahidlə 10 vahid = 1 Almaz = 0.10 ₼, yəni 1 vahid = 1 qəpik.

### 2.2 Gəlir bölgüsü (`economy.ts → splitEarnings`)
Kişinin xərclədiyi hər **ödənişli** Nar belə bölünür:

| | Bürünc | Gümüş | Qızıl | Platin | Brilyant |
|---|---|---|---|---|---|
| Host | 15% | 15% | 15% | 15% | 15% |
| Agentlik (Simo payından) | 15% | 16% | 17% | 18% | 20% |
| Simo | 70% | 69% | 68% | 67% | 65% |

- Səviyyə həddləri agentlikdə **olarkən** son 30 gündə qazanılan məbləğə (host payı + komissiya) görə müəyyən edilir: 0 / 1 000 / 5 000 / 20 000 / 100 000 ₼. Kod `HostEarning` cədvəlindən istifadə edir. Başqa agentlikdən gələn hostun köhnə qazancı yeni agentliyin səviyyəsinə təsir etmir.
- **Əvvəlki model düzəldildi:** əvvəllər host `30% − agentlik payı` alırdı, yəni agentlik böyüdükcə hostun payı azalırdı. İndi host həmişə 15% alır. Bürünc səviyyədəki rəqəmlər əvvəlki kimi qalıb.
- Admin agentliyə **fərdi komissiya** təyin edə bilər (`Agency.customShare`, 0–30%). Boş saxlanılarsa komissiya səviyyəyə görə hesablanır.
- Pul həmişə aşağı yuvarlaqlaşdırılır. Qəpik qalığı platformada qalır və heç vaxt artıq ödənmir.
- Host aktiv agentlikdə deyilsə, agentlik dayandırılıbsa və ya host bloklanıbsa qazanc yazılmır və 100% Simo-da qalır.
- Agentlik sahibi özü də host kimi qazanırsa, host payı və komissiya hər ikisi ona yazılır.

### 2.3 Pullu əməliyyatlar
| Əməliyyat | Necə tutulur | Qazanc mənbəyi |
|---|---|---|
| Hədiyyə | Bir dəfə, `count × price` | `GIFT` |
| Mesaj | Hostun və ya agentliyin qiyməti. Gündə 3 pulsuz "salam" və VIP pulsuz mesajlar var | `MESSAGE` |
| Zəng | Hər **başlanan dəqiqə** əvvəlcədən ödənir. 1-ci dəqiqə zəng qəbul edilən anda tutulur və minimum ödənişdir | `CALL` |
| Abunə / xidmət | Bir dəfə; xidmət escrow ilə işləyir | `SUBSCRIPTION` / `SERVICE` |

**Zəng qaydaları** (`services/calls.ts`):
- Dəqiqə `billedMinutes` şərti ilə "iddia" edilir. Qəbul marşrutu ilə taymer eyni anda işləsə belə bir dəqiqə iki dəfə tutulmur.
- Növbəti dəqiqəyə balans çatmadıqda zəng edənə `call:low-balance` göndərilir (`minutesLeft`, `secondsLeft`, `endsAt`). Bu "1 dəqiqə qaldı" xəbərdarlığıdır. Hosta da `call:ending-soon` göndərilir. Ödənilmiş dəqiqə bitəndə zəng `INSUFFICIENT_COINS` səbəbi ilə bitir.
- Tərəflərdən birinin real-time bağlantısı 45 saniyədən çox olmadıqda zəng `DISCONNECTED` ilə bitir. Server yenidən başlasa belə zəng sonsuz ödənmir.

### 2.4 Host olmaq və agentliyə qoşulmaq
1. Host şərtləri: hesab ən azı 3 günlükdür, 10 nəfərlə söhbət edilib, profildə 3 foto var, 1 post paylaşılıb, KYC göndərilib (`/host/requirements`).
2. Qoşulma iki yolla olur: **dəvət kodu / link** (`POST /agencies/join`, link `WEB_URL/join.html?code=XXXXXX` → `simo://agency?code=`) və ya **kataloqdan müraciət** (`POST /agencies/:id/apply`).
3. Sahib müraciəti qəbul və ya rədd edir. Qəbul olunan istifadəçi avtomatik host olur və qazanc başlayır.
4. **Çıxış və köçürmə:** host agentlikdən könüllü çıxdıqda başqa agentliyə qoşulmaq üçün **7 gün** gözləməlidir (`ECONOMY.agencyCooldownDays`). Sahib hostu çıxardıqda gözləmə tətbiq olunmur. Agentlik sahibi öz agentliyindən çıxa bilməz.
5. Sahib dəvət kodunu yeniləyə bilər. Bundan sonra köhnə link işləmir.

### 2.5 Agentlik qeydiyyatı
Müraciət formunda ad, şəhər, əlaqə şəxsi, telefon, təcrübə və gözlənilən host sayı doldurulur. KYC göndərilməlidir. Agentlik admin təsdiqi ilə aktiv olur və **sahibin KYC-si APPROVED olmalıdır**. Admin agentliyi dayandıra bilər; səbəb sahibə göstərilir.

### 2.6 Hədəflər və host səviyyəsi
- Gündəlik hədəf: **120 dəqiqə onlayn** və **30 dəqiqə zəng**. Həftədə 5 aktiv gün tələb olunur (`HOST_TARGETS`). Onlayn vaxt hər dəqiqə yazılır (`HostDailyStat`).
- Host səviyyəsi son 30 günün qazancına görə müəyyən edilir: Yeni → Aktiv → Ulduz → Super → Top (`HOST_LEVELS`).
- Hədəf bonusu (Bigo və Poppo-dakı "maaş") **hələ avtomatik ödənmir**. Bu, biznes qərarıdır: hədəfi tutan host üçün sabit bonus və ya kəşfdə üstünlük verilə bilər.

### 2.7 Pul çıxarışı
- Şərtlər: KYC APPROVED, minimum 500 Almaz (50 ₼), həftədə 1 çıxarış, eyni anda yalnız 1 açıq sorğu. Son **7 günün qazancı gözləmədə qalır** ki, ödənişin geri qaytarılması (chargeback) və fırıldaq riski azalsın. Alınmış Almaz çıxarışa düşmür. Xidmət haqqı 3%-dir.
- Bütün yoxlamalar istifadəçi sətri kilidləndikdən sonra edilir (`SELECT … FOR UPDATE`). Paralel sorğular limiti keçə bilmir.
- Admin axını: PENDING → APPROVED → PAID. PENDING və ya APPROVED sorğu **REJECTED** edilə bilər: səbəb məcburidir, Almaz bir dəfə qaytarılır (şərti keçid tətbiq olunur) və istifadəçiyə bildiriş gedir.
- Agentlik komissiyası sahibin pul kisəsinə dərhal yazılır, eyni gözləmə və KYC qaydaları ilə çıxarılır. Admin **həftəlik hesabatı** "bağlayır" (`AgencySettlement`). Bu, ödəniş deyil, cəmləri yoxlama və mühasibat üçün qeyd edir. Hesabatı CSV kimi ixrac etmək olur.

### 2.8 Ekranlar və API
| Kim | Ekran | API |
|---|---|---|
| Agentlik sahibi | `mobile/app/agency/index.tsx` (panel): dövr seçimi (bu gün / həftə / ay), komissiya, host qazancı, onlayn saat, zəng dəqiqəsi, hədiyyələr, səviyyə irəliləyişi, dəvət kodu və linki, 14 günlük qrafik, mənbə bölgüsü, müraciətlər (qəbul / rədd), hostlar (profil, çıxarmaq) | `GET /agencies/me?period=`, `POST /agencies/requests/:id/approve\|reject`, `DELETE /agencies/members/:id`, `POST /agencies/me/rotate-code` |
| Host | Agentlik ekranı (agentlik, şərtlər, sahib, çıxış) və `earnings.tsx` (qazanc bölgüsü, səviyyə, hədəflər, çıxarış, rədd səbəbi) | `GET /agencies/my`, `POST /agencies/leave`, `GET /host/earnings`, `POST /wallet/withdraw` |
| Qoşulmaq istəyən | Kod daxil edilir (və ya link ilə gəlir), agentliyə önbaxış, müraciət və ya müraciəti geri götürmək | `GET /agencies/public/:code`, `POST /agencies/join`, `DELETE /agencies/my-request` |
| Admin | `web/admin.html`: Agentliklər (təsdiq, dayandırma, komissiya %, hostlar, CSV), Pul çıxarışları (filtr, təsdiq, ödənildi, rədd + səbəb, CSV), Həftəlik hesabat (cəmlər, bağlama, CSV) | `/admin/agencies*`, `/admin/withdrawals*`, `/admin/settlements*` |

### 2.9 Hələ edilməyənlər (gələcək)
- **Alt agentliklər** (sub-agency, Poppo modeli): komissiya fərqini yuxarı agentliyə ötürmək.
- Hədəf bonusu və ya maaş.
- App Store və Google Play geri qaytarma bildirişləri (refund → Nar balansından çıxılır). Hazırda bu riski 7 günlük gözləmə azaldır.

## Mənbələr
- [Bigo Live Agency Guide 2026 — TopUpList](https://topuplist.com/blogs/detail/bigo-live-agency-guide-2026)
- [Bigo Live Agency 2026: Tiers, Diamonds & Commissions — Buffget](https://buffget.com/news/bigo-live-agency-2026-tiers-diamonds-and-commissions)
- [Bigo Live Agency Rebates 2026 — BitTopup](https://news.bittopup.com/news/bigo-live-agency-rebates-2026-45-80-commission-guide)
- [Bigo agency/host FAQ (Google Sites)](https://sites.google.com/netstar-us.com/company-name/faqs)
- [Chamet Agency vs Solo Host 2025 — BitTopup](https://bittopup.com/article/Chamet-Agency-vs-Solo-Host-2025-Commission-Earnings)
- [Chamet Agency Revenue Model 2026 — Buffget](https://buffget.com/news/chamet-agency-revenue-model-diamond-to-cash-rates-2026)
- [Chamet Host Earnings Explained — TopUpList](https://topuplist.com/blogs/detail/chamet-host-earnings-gifts-calls-payouts)
- [Poppo Live Agency Commissions: 4–20% — Buffget](https://buffget.com/news/poppo-live-agency-commission-how-much-do-agents-make-per-host-1xd5qxm)
- [Poppo Live Sub-Agency Guide — Buffget](https://buffget.com/news/poppo-live-sub-agency-guide-scale-hosts-and-earn-more)
- [Poppo Live Agency Requirements 2025 — BitTopup](https://bittopup.com/pl/article/Poppo-Live-Agency-Requirements-2025-5-Hosts-420-Rates)
- [Tango Live Agency Commission 2026 — Buffget](https://buffget.com/news/tango-live-agency-commission-2026-earn-10percent-revenue-share)
- [Tango Agency Guide 2026 — Buffget](https://buffget.com/news/tango-agency-guide-2026-earn-10percent-commission-on-coins)
- [MICO Live Agency Transfer — BitTopup](https://bittopup.com/article/MICO-Live-Agency-Transfer-Keep-Your-Level-80-Followers)
- [How to exit MICO agency contracts — BitTopup](https://news.bittopup.com/news/how-to-exit-mico-agency-contracts-3-blocking-clauses-2026)
