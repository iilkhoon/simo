# Simo — məhsul təklifləri (gəlir, saxlama, böyümə)

Tarix: 2026-11-07. Hazırlayan: məhsul rəhbəri rolunda Claude. Sahibin tapşırığı belə idi: "araşdır, ideyalar ver, 'bu belə daha yaxşı olar' kimi təkliflər ver. Əvvəl yalnız Azərbaycanda başlayırıq, alınsa genişlənəcəyik."

Bu sənəd dörd şeyi əhatə edir:

1. Rəqiblərdən nə öyrəndik: Bigo Live, Tango, Chamet, MICO, Azar, LivU, Poppo, Hakuna, Tinder, Bumble.
2. Təsir × səy üzrə sıralanmış təkliflər. Hər təklifdə bunlar var: nə, niyə, Simo-da necə, risk və status.
3. **"Bu belə olmasın, belə olsun"** bölməsi: indiki koda və ekranlara konkret tənqid.
4. Azərbaycanda ödəniş üsulları və regionlara genişlənmə yol xəritəsi.

> **Mənbələr haqqında qeyd.** Rəqiblərin daxili rəqəmləri (host payı, konversiya nisbəti) heç bir şirkətin rəsmi sənədində dərc olunmayıb. Tapılanların çoxu üçüncü tərəf bloqları və ya valyuta satan saytlardır. Belə yerlər **"zəif mənbə"** kimi işarələnib. Qərarı onlara yox, öz A/B testlərimizə əsaslandırın. Rəqiblərin funksiyalarının *mövcudluğu* (noble, ailə, ilk yükləmə təklifi və s.) tətbiqlərin özündə görünür və etibarlıdır. *Rəqəmlər* isə etibarlı deyil.

---

## 0. Bu iş çərçivəsində artıq edilənlər

| # | Nə | Harada | Status |
|---|---|---|---|
| A | **Mövsümi kampaniyalar (event framework).** Admin Novruz, 8 Mart, 14 Fevral, Ramazan və Yeni il kampaniyalarını hazır şablondan planlaşdırır. Tətbiqdə bunlar görünür: ana səhifədə banner, hədiyyə pəncərəsində ilk açılan "bayram" tabı, kampaniya səhifəsi (iki reytinq: *Səxavətlilər* və *Ulduzlar*), "mənim xalım", mükafatlar mətni və hüquqi qeyd. Kampaniya başlayanda aktiv istifadəçilərə **bir dəfə** push gedir. Gecə 23:00–09:00 arası push göndərilmir, səhərə saxlanır. | `backend/src/services/growth.ts`, `routes/campaigns.ts`, `Campaign` modeli; `mobile/app/campaign/[id].tsx`, `components/CampaignBanner.tsx`, `GiftSheet.tsx` (tab); `web/admin.html` (Kampaniyalar bölməsi) | ✅ Edildi, testlər var |
| B | **"Host onlayn oldu" push-u.** Host tətbiqə girəndə onu izləyənlərə bildiriş gedir. Bunu Bigo/Chamet-in "izlədiyin host onlayndır" bildirişindən götürdük. Spam olmasın deyə limitlər var: host başına 6 saatda bir, izləyici başına gündə ən çox 2, gecə göndərilmir. Bloklananlara və onlayn olanlara getmir. Əvvəlcə həmin hosta pul xərcləmiş izləyicilər seçilir, ən çox 200 nəfər. | `services/growth.ts → hostCameOnline`, `realtime/socket.ts` (1 sətir) | ✅ Edildi, testlər var |
| C | **Push toxunuşu ilə ekrana keçid.** Əvvəl bildirişə toxunanda tətbiq sadəcə açılırdı. İndi bildiriş növünə görə uyğun ekran açılır: söhbət, host profili, kampaniya, canlı otaq, pul kisəsi, baxanlar, bəyənənlər. | `mobile/src/lib/pushRoutes.ts`, `push.ts` (1 sətir) | ✅ Edildi (cihazda yoxlanmayıb) |
| D | **Host tərəfində "zəng tezliklə bitə bilər" banneri.** Backend `call:ending-soon` hadisəsini göndərirdi, amma mobil tətbiq ona qulaq asmırdı. İndi host saniyə sayğacı ilə banner görür. Zəng edən balansını artırsa, banner özü gizlənir. | `mobile/app/call/[id].tsx` (əlavə, minimal) | ✅ Edildi |
| E | **Köhnə `design/gifts.mjs` silindi.** O skript yeni hədiyyə rəsmlərinin üstünə köhnə düz ikonları yazırdı. Əvəzində `design/export-gifts.ts` yazıldı, o, yeganə mənbədən (`mobile/src/components/gifts/art.ts`) oxuyur. `web/assets/gifts/*` yeni rəsmlərlə yeniləndi (31 SVG). | `design/`, `web/assets/gifts/` | ✅ Edildi |

---

## 1. Araşdırma: rəqiblər nə edir

### 1.1 Canlı yayın və zəng tətbiqləri (Bigo, Tango, Chamet, MICO, LivU, Poppo, Hakuna, Azar)

| Mexanika | Necə işləyir | Simo-da vəziyyət |
|---|---|---|
| **İlk yükləmə təklifi** ("first recharge") | Tətbiqə girişdən bir neçə dəqiqə sonra və ya ilk pullu cəhddə 0.99$ kimi kiçik paket və iri bonus təklif olunur, çox vaxt üstündə vaxt sayğacı olur. | Var: ilk alışa +100%, ən çox 300 Nar. `FIRST_TOPUP` fərdi təklifi isə yalnız **1 gün sonra** gəlir. Bax §3.1 |
| **VIP / noble pilləsi** | Aylıq status verir: çərçivə, giriş effekti, otaqda üstdə görünmək, gizli rejim, endirim. Noble daha bahalıdır və "sosial status" kimi satılır. | Var: VIP 3 pillə, zadəganlıq Bəy/Xan/Şah |
| **Gündəlik giriş / tapşırıqlar** | 7 günlük ardıcıllıq ("streak") və gündəlik tapşırıqlar var: "3 hədiyyə göndər", "10 dəq. yayın izlə". | Gündəlik bonus var (3–20). İstifadəçi üçün **tapşırıq siyahısı yoxdur**, yalnız host tapşırıqları var |
| **Lucky gift / lotereya hədiyyəsi** | Göndərən təsadüfi multiplikatorla Nar qaytara bilər. Ən çox gəlir gətirən, amma **ən riskli** mexanikadır. | Yoxdur. Bax §4, hüquqi risk |
| **Ailə / klan** | Qrup reytinqi, ailə tapşırıqları, ailə nişanı. Uzunmüddətli saxlamada çox güclüdür. | Yoxdur. Agentlik var, amma o, istifadəçi tərəfi deyil |
| **Event və mövsümi kampaniyalar** | Bayram hədiyyələri, reytinq, mükafat. Bigo və MICO-da demək olar ki, hər həftə nəsə gedir. | ✅ İndi var (A) |
| **Host reytinqi və mükafatları** | Həftəlik "ulduz" reytinqi, yeni hostlara trafik dəstəyi ("new host boost"). | Ümumi reytinq var. Yeni host dəstəyi yoxdur |
| **PK döyüşləri** | İki yayın arasında hədiyyə yarışı. | Var |
| **Push strategiyası** | "İzlədiyin host onlayndır / yayına başladı", "sənə hədiyyə gəldi", geri qaytarma ("win-back"). | Ağıllı push var (`smart.ts`). Host onlayn bildirişi ✅ indi var |
| **Agentlik modeli** | Host gəliri agentlik vasitəsilə ödənir, agentlik komissiyası səviyyəyə görə dəyişir. | Var (Simo-nun güclü tərəfi) |

Mənbələr (zəif, üçüncü tərəf):
- Chamet agentlik və host gəliri: [buffget.com](https://buffget.com/news/chamet-agency-revenue-model-diamond-to-cash-rates-2026), [topuplist.com](https://topuplist.com/blogs/detail/chamet-host-earnings-gifts-calls-payouts), [oyelabs.com](https://oyelabs.com/chamet-business-model/)
- MICO, Poppo və Chamet müqayisəsi: [lootbar.gg](https://lootbar.gg/blog/en/mico-vs-poppo-live-vs-chamet-which-is-the-best-host-platform.html), [bittopup.com (MICO)](https://bittopup.com/article/MICO-Live-2025-Earnings-Guide-6-Real-Ways-to-Make-Money-from-Gifts-and-Events)
- Bigo səviyyə və ailə sistemi: [bittopup.com (Bigo)](https://bittopup.com/article/Bigo-Live-Money-Guide-Earn-15010K-Monthly-in-2025)

Bu mənbələrə görə Chamet-də agentlik komissiyası 5–30%-dir. MICO-da host Income Diamond-larının təxminən 75%-ni saxlayır. Rəqəmlər bir-birinə zidd və yoxlanmamışdır. Amma hamısının ortaq nəticəsi var: **rəqiblərdə host və agentliyin birlikdə payı Simo-dakı 30–35%-dən açıq-aşkar yüksəkdir.** Bax §3.2.

### 1.2 Tanışlıq tətbiqləri (Tinder, Bumble)

- Gəlir pillələrdən gəlir: Plus → Gold → Platinum, hər pillə aşağıdakının hamısını içində saxlayır. Əlavə olaraq ayrıca alınan Boost və Super Like var. 2025-ci ildə ödəyən istifadəçi sayı azalanda belə gəlir **qiymət artımı və həftəlik abunə** hesabına böyüdü. Match Group həftəlik abunəyə "ciddi tələb" olduğunu bildirib. Mənbələr: [appfigures](https://app.appfigures.com/resources/insights/20250509?f=2), [globaldatinginsights](https://www.globaldatinginsights.com/featured/dating-apps-record-highest-ever-monthly-revenue-in-april-2025/), [SCMP](https://www.scmp.com/tech/tech-trends/article/3232764/dating-apps-match-bumble-gindr-turn-premium-tiers-boost-revenue-and-discounts-gen-z).
- Bir mənbəyə görə ödəyən istifadəçi başına gəlir Bumble-da (~28$) Tinder-dəkindən (~18$) yüksəkdir. Bu rəqəmlər zəif mənbədəndir və yoxlanmalıdır. Nəticə: kiçik, amma "keyfiyyətli" ödəyici bazası daha sərfəlidir.
- **Simo üçün dərs:** VIP-ə 7 günlük, 2.99 ₼ kimi ucuz giriş pilləsi əlavə edilsin. Azərbaycanda aylıq məbləğ psixoloji baryerdir.

### 1.3 Hüquqi və App Store çərçivəsi

- **Təsadüfi məhsul (loot box) ehtimalları:** Apple 3.1.1 bəndinə görə təsadüfi virtual məhsul satan tətbiq hər nəticənin ehtimalını **alışdan əvvəl** göstərməlidir. Mənbələr: [PC Gamer](https://www.pcgamer.com/apple-now-requires-app-store-games-to-disclose-loot-box-odds/), [Fenwick](https://fenwick.com/insights/publications/apple-now-requires-disclosure-of-loot-box-odds). Real pul qazandıran təsadüf (Almaz → nağd) 5.3 bəndi ilə qumar sayıla bilər.
- **Azərbaycan:** lotereya və qumar oyunları dövlət inhisarındadır (2001-ci il "Lotereyalar haqqında" qanunu). 2026-cı ildə qanunsuz onlayn qumara cəzalar sərtləşdirilib, amma bu, zəif mənbələrdən gələn xəbərdir və hüquqşünasla yoxlanmalıdır. Fərdi məlumatlar haqqında qanun 2010-cu ildəndir (998-IIIQ), 2025-ci ildə yenilənib. Bu qanun məlumat sistemlərinin qeydiyyatını tələb edir. Mənbələr: [Caspian Legal Center](https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan), [report.az](https://report.az/en/ict/azerbaijan-updates-law-on-protection-of-personal-data), [mondaq (qumar)](https://www.mondaq.com/gaming/1151766/amendments-to-gambling-regulations).
- **Kənar ödəniş linki:** 2025-ci ilin mayından **yalnız ABŞ vitrinində** tətbiqdən veb ödənişə link vermək olar. Azərbaycan vitrinində bu hələ qadağandır: tətbiq içində "saytdan ucuz al" demək olmaz. Mənbələr: [Mondaq](https://www.mondaq.com/unitedstates/consumer-law/1621598/court-finds-apple-violated-order-resulting-in-key-changes-for-ios-external-purchase-methods), [AppleInsider](https://appleinsider.com/articles/26/03/30/the-epic-vs-apple-case-wont-get-a-rehearing-for-app-store-fees).

---

## 2. Prioritet cədvəli (təsir × səy)

Təsir: 1–5 (gəlir və ya saxlamaya gözlənilən təsir). Səy: 1–5 (5 ən çətin). **Bal = təsir × (6 − səy).**

| # | Təklif | Təsir | Səy | Bal | Risk | Status |
|---|---|---|---|---|---|---|
| P1 | Mövsümi kampaniyalar (banner, tab, reytinq, push) | 5 | 2 | 20 | Aşağı | ✅ Edildi |
| P2 | "Host onlayn oldu" izləyici push-u | 4 | 1 | 20 | Aşağı (spam limiti var) | ✅ Edildi |
| P3 | Push toxunuşu ilə keçid | 4 | 1 | 20 | Yox | ✅ Edildi |
| P4 | İlk yükləmə təklifini ilk sessiyaya çəkmək (`FIRST_TOPUP` 24 saat yox, ilk pullu cəhddə) | 5 | 1 | 25 | Aşağı | 🟡 Sahibin qərarı lazımdır (§3.1) |
| P5 | Kiçik "giriş" paketi: 0.99 ₼ = 50 Nar + ilk yükləmə bonusu | 5 | 1 | 25 | Mağaza qiymət pilləsi | 🟡 Təklif |
| P6 | Gündəlik tapşırıqlar (istifadəçi üçün): "1 hədiyyə göndər", "3 profilə bax", "1 zəng" → promo Nar | 4 | 2 | 16 | Aşağı | Təklif |
| P7 | Hədiyyə push-unun dili (indi həmişə `nameAz` göndərilir) | 2 | 1 | 10 | Yox | Təklif (gifts.ts başqa agentin sahəsidir) |
| P8 | VIP 7 günlük pillə (2.99 ₼) | 4 | 2 | 16 | Aşağı | Təklif |
| P9 | Yeni host dəstəyi: ilk 7 gün kəşfdə önə çıxarmaq + "yeni" nişanı | 4 | 2 | 16 | Aşağı | Təklif |
| P10 | Geri qaytarma ardıcıllığı: 3/7/14/30 gün, hər addımda fərqli mesaj, yalnız bir dəfə bonus | 4 | 2 | 16 | Aşağı | Qismən var (`picks`, `COMEBACK`) |
| P11 | Ailə / klan (istifadəçi qrupları, həftəlik ailə reytinqi) | 4 | 4 | 8 | Orta (moderasiya) | Gələcək |
| P12 | Kampaniya mükafatlarının avtomatik paylanması (indi admin əl ilə verir) | 3 | 2 | 12 | Aşağı | Növbəti addım |
| P13 | Dəvət döngüsünü gücləndirmək: dəvət edən **və** dəvət olunan 50 promo Nar alsın (ilk alışdan sonra) | 3 | 1 | 15 | Fırıldaq: yalnız alışdan sonra verilsin | Təklif |
| P14 | Epoint veb ödənişi (topup.html), App Store-dan kənar | 5 | 2 | 20 | **App Store**: tətbiqdən link vermək olmaz | Var (veb). Tətbiqdə yönləndirmə **etməyin** |
| P15 | Lucky gift | 5 | 3 | 15 | **Yüksək** (qumar, Apple 3.1.1/5.3) | ❌ İndi etməyin (§4) |
| P16 | Təhlükəsizlik nişanları: "Təsdiqlənmiş host", "Canlı selfi", zəngdən əvvəl qiymət | 3 | 1 | 15 | Yox | Qismən var (verify, CallConfirm) |
| P17 | Hostlar üçün "ən yaxşı saatlar" bildirişi: "indi 34 izləyicin onlayndır" | 3 | 2 | 12 | Aşağı | Təklif |
| P18 | Operator ödənişi (Azercell / Bakcell / Nar mobil balansı) | 4 | 4 | 8 | Komissiya 30–50%, fırıldaq | Araşdırılsın |

---

## 3. Ətraflı təkliflər

### 3.1 P4 + P5. İlk yükləmə: daha tez, daha kiçik, daha aydın
- **Nə:** İlk pullu cəhd anında bir ekran çıxsın: mesaj, zəng və ya hədiyyə üçün Nar çatmayanda. Ekranda olacaqlar: "İlk yükləməyə +100% (300 Nar-a qədər)", vaxt sayğacı (məsələn 30 dəqiqə) və **ən kiçik paket** (0.99 ₼). Hal-hazırda `FIRST_TOPUP` təklifi (+50%) istifadəçi **24 saatdan sonra** gələndə yaradılır. O vaxta qədər yeni istifadəçilərin çoxu artıq gedib.
- **Niyə:** Bigo, Chamet və LivU-da ilk yükləmə təklifi qeydiyyatdan dərhal sonra və ya ilk paywall anında çıxır. Bu, tətbiqdən istifadə edəndə görünür. "Ödəyən istifadəçiyə çevrilmə" ən çox ilk sessiyada baş verir. İlk alış kiçik məbləğ olanda psixoloji baryer aşılır, sonrakı alışlar daha asan olur.
- **Simo-da necə:** `smart.ts → generateOffers` içində `ageDays >= 1` şərtini götürmək. Təklif `paywall_view` hadisəsi gələndə yaradılsın (bu hadisə artıq `/events`-ə yazılır). `RechargeSheet` təklif kartını sayğacla göstərsin. App Store və Google Play-də 0.99 ₼ pilləsi yaradılmalıdır (`coins_50` paketi).
- **Diqqət, ikiqat bonus:** Hal-hazırda ilk alış həm `FIRST_RECHARGE_BONUS` (+100%, ≤300), həm də `FIRST_TOPUP` təklifi (+50%) ala bilər. Bu, şüurlu qərardırsa, qalsın. Deyilsə, `FIRST_TOPUP` yalnız `firstRechargeDone=true` olandan sonra (ikinci alış üçün) verilsin. **Sahib qərar verməlidir.** Pul axınına toxunduğu üçün bunu dəyişmədim.
- **Risk:** aşağı. Ölçmək üçün: ilk 24 saatda ödəyənə çevrilmə nisbəti.

### 3.2 Host payı: 15% bazar üçün azdır
- **Nə:** Hal-hazırda 1 ödənişli Nar belə bölünür: host 15%, agentlik 15–20%, Simo 65–70%. Rəqiblərdə host və agentliyin birlikdə payı daha yüksəkdir. Zəif mənbələrə görə MICO-da host ~75% saxlayır, Chamet-də isə platforma ~40% götürür.
- **Niyə vacibdir:** Bu biznesdə tələbi **təklif tərəfi** yaradır, yəni gözəl, aktiv və cavab verən hostlar. Agentliklər hostları gəlirin daha çox olduğu tətbiqə köçürür. Azərbaycanda agentliklər Bigo və Chamet ilə də işləyir. Onlar müqayisə edəcək.
- **Təklif:** Hər şeyi birdən dəyişməyin. **Host səviyyəsinə görə** pay artsın: aylıq qazanc 15% → 18% → 22% → 25%. Simo payı ödəniş üsulu ilə də kompensasiya olunur: Epoint ilə ödənəndə Simo-nun xalis payı 78–85%-dir. Kampaniya dövründə müvəqqəti "+5% host bonusu" vermək də olar.
- **Risk:** gəlir modelinə toxunur. Maliyyə modeli ilə hesablanmalıdır (bax `docs/ECONOMY.md`).

### 3.3 P6. İstifadəçi üçün gündəlik tapşırıqlar
- **Nə:** Gündəlik 3 tapşırıq olsun, mükafatı promo Nar. Promo Nar Almaz yaratmır, ona görə fırıldaqçı üçün maraqsızdır. Nümunələr: "1 profilə bəyən", "1 canlı yayına 3 dəq. bax", "1 hədiyyə göndər (istənilən)". Hər həftə hamısı tamamlananda bonus sandıq verilsin. Bu sandıq **təsadüfi olmamalıdır**, məzmunu əvvəlcədən göstərilməlidir.
- **Niyə:** Bigo, MICO və Poppo-da "daily tasks" əsas saxlama alətidir. Simo-da gündəlik giriş bonusu var, amma istifadəçini konkret hərəkətə yönəltmir.
- **Necə:** `rewards.tsx`-ə blok əlavə etmək. Backend-də `UserTask` saymaq üçün `UserEvent` cədvəli artıq var. Bu, kiçik iş, təxminən 1–2 gündür.

### 3.4 P10. Geri qaytarma (win-back) ardıcıllığı
- **İndi:** 2+ gün girməyənə "sənə uyğun yeni profillər" bildirişi gedir, 14+ gün almayana `COMEBACK` +30% təklifi yaranır.
- **Təklif:** Ardıcıllığı sabitləmək və hər addımda fərqli mesaj vermək:
  - 3 gün: "Səni gözləyən 2 mesaj var" (real mesaj varsa) və ya "baxanlar".
  - 7 gün: izlədiyi hostların yeni story və ya yayını.
  - 14 gün: `COMEBACK` bonusu.
  - 30 gün: sonuncu mesaj, sonra dayanmaq.

  Push-a toxunan, amma tətbiqə daxil olmayan istifadəçiyə tezliyi azaltmaq lazımdır.
- **Risk:** spam şikayətləri və bildirişlərin bağlanması. Gündəlik 2 limiti artıq var.

### 3.5 P11. Ailə / klan (növbəti böyük funksiya)
- **Nə:** 5–50 nəfərlik qruplar olsun: ailə adı, nişan, ailə söhbəti, həftəlik ailə reytinqi (üzvlərin göndərdiyi hədiyyə və yayın dəqiqəsi) və ailə tapşırıqları.
- **Niyə:** Bigo-da ailə yaratmaq **pulludur** (təxminən 120–175$, zəif mənbə). Bu, ailənin nə qədər dəyərli status olduğunu göstərir. Qrup üzvləri bir-birini tətbiqə qaytarır. Bu, push-dan güclü saxlama mexanizmidir.
- **Simo-da:** Agentlik host tərəfidir. Ailə isə **istifadəçi tərəfidir**, onları qarışdırmaq olmaz. Moderasiya yükü (qrup söhbəti) nəzərə alınmalıdır.
- **Səy:** 2–3 həftə.

### 3.6 P9 və P17. Host təklifini gücləndirmək
- **Yeni host dəstəyi:** Təsdiqlənən hostu ilk 7 gün "Yeni" tabında və kəşf alqoritmində önə çıxarmaq lazımdır. Hosta ilk həftədə ən azı bir neçə zəng gəlməsə, o tətbiqdən çıxır.
- **"İndi yaxşı vaxtdır" push-u hosta:** "İzləyicilərindən 34-ü indi onlayndır, yayına başla". Tezlik limiti `hostCameOnline` kimi olsun.
- **Host reytinqində ayrıca "yeni ulduzlar" kateqoriyası:** son 30 gündə qoşulanlar üçün.

### 3.7 P12. Kampaniya mükafatlarının avtomatlaşdırılması
- **İndi:** kampaniya bitəndə admin reytinqə baxıb mükafatı əl ilə verir (istifadəçi → "Nar ver").
- **Növbəti addım:** `Campaign.rewards` sahəsi əlavə etmək, məsələn `[{rank:1, coins:20000, frame:'novruz'}]`. Kampaniya bitəndə bir dəfə işləyən iş promo Nar və çərçivə versin, "Təbriklər, 1-ci oldun" push-u göndərsin. Mükafat **promo Nar** olmalıdır, nağdlaşmamalıdır. Belə olanda hüquqi baxımdan bu, "lotereya" yox, reklam xarakterli yarışdır.

---

## 4. Lucky gift və lotereyalar: niyə indi yox

- **Necə işləyir:** İstifadəçi "lucky gift" alır, təsadüfi olaraq x1…x500 Nar qaytarır. Bigo, MICO və Poppo-da ən çox gəlir gətirən mexanikalardandır.
- **Risklər:**
  1. **Azərbaycan:** pul ödəyib təsadüfi qiymətli nəticə almaq lotereya qanununun dövlət inhisarına düşə bilər. Qanunsuz onlayn qumara cəzalar 2026-cı ildə sərtləşdirilib (zəif mənbə). Yerli hüquqşünas rəyi olmadan etməyin.
  2. **Apple 3.1.1:** ehtimallar alışdan əvvəl göstərilməlidir. Qaytarılan Nar sonradan Almaza, Almaz isə nağd pula çevrilə bilirsə, bu, 5.3 (qumar) bəndi ilə rədd edilə bilər. Google Play-in "Real-Money Gambling" siyasəti də buna oxşardır.
  3. **Reputasiya:** "Simo — qumar tətbiqi" başlığı agentliklərin və hostların ailələri üçün böyük maneədir.
- **Təhlükəsiz alternativlər:**
  - Pulsuz çəkilişlər. Bunlar artıq var: `raffles`, iştirak pulsuzdur, mükafat promo Nar.
  - **Sabit nəticəli sürpriz hədiyyə**: animasiya təsadüfi görünür, dəyər isə sabitdir.
  - Kampaniya reytinqi (✅ edildi).

---

## 5. "Bu belə olmasın, belə olsun"

Kodu və ekranları oxuyandan sonra yazılan konkret qeydlərdir.

1. **Bildirişə toxunanda heç nə olmurdu.** `push.ts` token qeyd edirdi, amma toxunuşu emal etmirdi. "X sənə hədiyyə göndərdi" bildirişinə basan istifadəçi ana ekranı görürdü və bildirişin mənası itirdi.
   → **Belə olsun:** hər növ öz ekranını açsın. ✅ Edildi (`pushRoutes.ts`). `call` növü CallKeep-də qalır.

2. **Hədiyyə push-unun mətni həmişə azərbaycanca idi.** `gifts.ts` faylında `body: \`${sender.name}: ${gift.nameAz} x${count}\`` yazılıb. Rus dilli istifadəçi "Qızılgül x10" görür.
   → **Belə olsun:** `notify` `data`-da `giftNameAz/Ru/En` daşısın, mətn alıcının dilinə görə yığılsın. `gifts.ts` başqa agentin sahəsi olduğu üçün dəyişmədim.

3. **Zəngdə hostun xəbəri olmurdu ki, zəng birdən kəsiləcək.** Server `call:ending-soon` göndərirdi, ekran isə ona qulaq asmırdı. Host danışığın ortasında kəsilib "nə oldu?" deyə qalırdı.
   → ✅ Edildi: hostda saniyə sayğaclı banner görünür. Hostlar üçün təlim mətni də yazmaq olar: "Banner görünəndə nəzakətlə xəbər ver ki, zəng bitir. Hədiyyə tələb etmək qadağandır."

4. **`FIRST_TOPUP` təklifi gec yaranır və ilk yükləmə bonusu ilə üst-üstə düşə bilir.** Bax §3.1.
   → **Belə olsun:** təklif ilk paywall anında yaransın, ikiqat bonus siyasəti açıq qərarla müəyyənləşsin.

5. **"Mən" tabında 21 keçid var.** VIP, zadəganlıq, çəkilişlər, xidmətlər, sifarişlər, mükafatlar və s. hamısı eyni çəkidə görünür. Yeni istifadəçi itir, pullu funksiyalar səs-küyün içində görünmür.
   → **Belə olsun:** üç blok olsun. (a) **Pul kisəsi** kartı ilk yükləmə təklifi ilə. (b) **Statusum** (VIP/zadəganlıq, bir kart). (c) "Hamısı" siyahısı yığılmış halda. Hostlar və istifadəçilər üçün ayrı sıralama. Ekran dizaynı başqa agentin sahəsidir, ona görə yalnız təklif kimi yazılıb.

6. **Host payı 15% sabitdir** və host böyüdükcə artmır. Agentlik payı artır, hostunku yox. Bu, ən yaxşı hostların rəqibə keçməsinə səbəb ola bilər.
   → **Belə olsun:** host səviyyəsinə görə 15 → 25%. Bax §3.2.

7. **Veb saytdakı hədiyyə şəkilləri köhnə idi və istənilən vaxt yenidən köhnələ bilərdi.** `design/gifts.mjs`-i işə salan hər kəs yeni rəsmlərin üstünə köhnələrini yazardı.
   → ✅ Edildi: skript silindi, yeni `export-gifts.ts` yeganə mənbədən ixrac edir.

8. **Reytinq promo Nar ilə göndərilən hədiyyələri də sayır.** `/leaderboard` və kampaniya reytinqi `GiftTransaction.coins`-u cəmləyir. Bu cəm pulsuz bonus Nar ilə (qeydiyyat, gündəlik bonus, dəvət) göndərilən hədiyyələri də içinə alır. Saxta hesablarla bonus toplayıb bir hostu reytinqin başına çıxarmaq mümkündür. Promo Nar host üçün nağd pul yaratmır, amma **reytinq mükafatı** verilirsə, fırıldaq yolu açılır.
   → **Belə olsun:** `GiftTransaction`-a `paidCoins` (ödənişli hissə) sahəsi əlavə edilsin. `spend()` bu rəqəmi artıq qaytarır (`paid`). Mükafatlı reytinqlər yalnız ödənişli hissə ilə hesablansın. Kampaniya mükafatını avtomatlaşdırmazdan (P12) əvvəl bu edilməlidir. `gifts.ts` başqa agentin sahəsidir, ona görə dəyişmədim.

9. **Kampaniya və bayram yox idi.** Novruz Azərbaycanda ilin ən böyük emosional anıdır. Rəqiblər bu dövrdə xüsusi hədiyyə və reytinqlə gəlirin böyük hissəsini qazanır.
   → ✅ Edildi. **Növbəti addım:** Novruz 2027 (≈ 13–24 mart) üçün 2–3 **yalnız kampaniyada satılan** hədiyyə hazırlamaq: "Səməni", "Tonqal", "Xonça". Hədiyyə rəsmi `art.ts`-ə əlavə olunur, kampaniyaya `giftIds` ilə bağlanır.

10. **Zəngdən əvvəl hostun etibarlılığı zəif görünür.** İnsanlar pullu zəngdən əvvəl "bu real adamdır?" deyə tərəddüd edir.
    → **Belə olsun:** profil və zəng təsdiq ekranında bunlar görünsün: "✓ Şəxsiyyət təsdiqlənib", "Son 30 gündə 120 zəng · ★4.8", "Cavab vermə nisbəti 92%". Bu məlumatlar artıq var (`kycStatus`, `Call.rating`, `HostDailyStat`). Etibar konversiyanı artırır, bu, xüsusilə yeni istifadəçinin ilk pullu zəngində vacibdir.

---

## 6. Azərbaycanda ödəniş üsulları

| Üsul | Qeyd | Simo-da |
|---|---|---|
| **App Store / Google Play** | 15–30% komissiya. Bütün rəqəmsal məhsullar üçün tətbiq içində məcburidir. | Var |
| **Epoint (Visa/Mastercard, Apple Pay, Google Pay, taksit kartları)** | Kapital Bank tərəfindən dəstəklənir. ~2.5% komissiya, Simo payı 78–85%. Mənbə: [creativegroup.az](https://creativegroup.az/en/blog/epoint-az-odenis-sistemi-inteqrasiyasi), [asanimza.az](https://asanimza.az/en/epoint-az-presents-an-innovative-payment-solution-for-sme-business-clients-with-credit-cards-in-installments/) | Var: `topup.html` (veb) |
| **Birbank / m10 (Bir ekosistemi)** | 2025-ci ildə Birbank, Birmarket, MilliÖN terminalları və m10 cüzdanı bir ekosistemdə birləşib, 5 mln+ istifadəçi var. Kartsız QR ödəniş mümkündür. Mənbə: [banco.az](https://banco.az/az/node/139879), [cartdna](https://cartdna.com/shopify-payment-guide/europe/azerbaijan) | **Təklif:** m10 / Birbank QR-ı veb topup səhifəsinə əlavə etmək |
| **MilliÖN terminalları (nağd)** | Kartı olmayan auditoriya üçündür: terminalda ID nömrəsi yazıb nağd yükləmək. | Araşdırılsın: provayderlə müqavilə lazımdır |
| **Operator balansı (Azercell / Bakcell / Nar)** | Konversiya yüksəkdir, komissiya isə çox vaxt 30–50%. Fırıldaq və geri qaytarma riski var. | P18, araşdırılsın |

**App Store qaydası:** Azərbaycan vitrinində tətbiq içində "saytdan ucuz al" demək və ya veb ödənişə link vermək **qadağandır**. ABŞ istisnası Azərbaycana şamil olunmur. Veb topup yalnız tətbiqdən kənar marketinqlə təbliğ olunsun: agentliklər, Instagram, sayt. Tətbiqdə bu barədə heç bir düymə və mətn olmasın.

---

## 7. Genişlənmə yol xəritəsi

**Mərhələ 0 (indi, Azərbaycan):** məhsulun bazara uyğunluğunu sübut etmək. Bunlara baxırıq:

- D1, D7, D30 saxlama;
- ödəyənə çevrilmə nisbəti;
- ödəyən istifadəçi başına gəlir (ARPPU);
- hostun həftəlik aktivliyi;
- agentlik başına aktiv host sayı.

Növbəti mərhələyə keçid şərti 3 aydır sabit qalan göstəricilərdir: D30 ≥ 15% və ödəyənə çevrilmə ≥ 3%. Bu hədəflər təxminidir, sahib dəqiqləşdirsin.

| Mərhələ | Bazar | Niyə | Nə dəyişməlidir |
|---|---|---|---|
| 1 | **Gürcüstan** | Yaxındır, Azərbaycan dilli icma var (Marneuli, Borçalı), rus dili geniş yayılıb, tənzimləmə nisbətən sadədir. | Gürcü dili (4-cü dil), GEL valyutasında mağaza qiymətləri, TBC Pay / BOG ödənişi (veb), yerli agentliklər. `callHours` hazırda Bakı vaxtı ilə hesablanır, saat qurşağı istifadəçiyə görə olmalıdır. |
| 2 | **Qazaxıstan** | Böyük rus dilli bazardır, Kaspi ekosistemi var, bu tip tətbiqlərə xərcləmə yüksəkdir. Mənbə: [Kaspi (8b.world)](https://www.8b.world/payment-methods/kaspi-kz) | Rus dili artıq var, qazax dili sonra. KZT qiymətləri. Veb ödənişdə Kaspi QR. Fərdi məlumatların ölkədə saxlanması tələbi (lokalizasiya) hüquqşünasla yoxlanmalıdır. |
| 3 | **Özbəkistan** | 37 mln əhali, gənc auditoriya, Payme (15 mln+) və Click populyardır. Mənbə: [the-tech.kz](https://the-tech.kz/czifrovye-koshelki-uzbekistana-kto-lidiruet-na-rynke-i-v-chem-ih-otlichie/) | Özbək dili (latın qrafikası). UZS. Payme/Click veb ödənişi. Mühafizəkar bazardır, moderasiya və "tanışlıq" mövqeləndirməsi ehtiyatla qurulmalıdır. |
| 4 | **Türkiyə** | Böyük bazardır, dil yaxındır. | **Rəqabət çox sərtdir** (Bigo, Azar, Tango burada güclüdür). Türk dili, TRY (inflyasiya ilə tez-tez qiymət yeniləmək lazımdır), KVKK məlumat qanunu, BTK tənzimləməsi. Ən son mərhələdir. |
| — | **Rusiya** | Böyük rus dilli bazardır. | **Tövsiyə olunmur:** sanksiya, ödəniş və App Store məhdudiyyətləri, tənzimləmə riski. |

**Texniki hazırlıq.** Bu işlər genişlənmədən əvvəl, bir dəfə görülür:

1. **Valyuta.** `CoinPackage.priceQepik` yalnız AZN-dir. Paketlərə `prices: {AZN, GEL, KZT, UZS}` əlavə etmək lazımdır, ya da qiyməti mağazadan (StoreKit / Play Billing localized price) götürmək.
2. **Dil.** i18n artıq paketlərlə qurulub: `mobile/src/i18n/*.ts` və `PACKS`. Yeni dil 4-cü açar kimi əlavə olunur. Server push mətnləri (`notify.ts → TITLES`) də genişlənməlidir.
3. **Saat qurşağı.** `smart.ts`, `growth.ts` (gecə rejimi) və `callHours` Bakı vaxtı ilə (UTC+4) hesablanır. İstifadəçinin saat qurşağı (`User.tz`) saxlanmalıdır.
4. **Ölkə üzrə kampaniyalar.** `Campaign` modelinə `countries String[]` sahəsi əlavə olunmalıdır.
5. **Agentliklər:** hər ölkədə ən azı 2–3 agentlik **əvvəlcədən** müqavilə ilə hazır olsun. Hostsuz istifadəçi trafiki pul itkisidir.

---

## 8. Ölçmə: hər təklif üçün nəyə baxmaq lazımdır

| Təklif | Əsas göstərici | Əks göstərici (zərər yoxlaması) |
|---|---|---|
| Kampaniyalar | Kampaniya dövründə hədiyyə gəliri və kampaniya hədiyyələrinin payı | Kampaniyadan sonrakı 2 həftədə gəlirin düşməsi (sadəcə vaxtı əvvələ çəkmək effekti) |
| Host onlayn push | Push-dan sonra 30 dəqiqədə həmin hosta zəng və mesaj sayı | Bildirişləri bağlayanların faizi (`notifPrefs.follows=false`) |
| Push toxunuşu ilə keçid | Push açılma → hərəkət (mesaj, zəng) nisbəti | — |
| İlk yükləmə dərhal | İlk 24 saatda ödəyənə çevrilmə | Qaytarma (refund) nisbəti |
| Host payı artımı | Aktiv host sayı, cavab vermə nisbəti | Simo-nun xalis marjası |

Lazım olan məlumat artıq toplanır: `UserEvent`, `Notification`, `GiftTransaction`, `HostDailyStat`. Admin panelə "Kampaniya nəticəsi" hesabatı növbəti iş kimi əlavə oluna bilər.

---

## 9. Mənbələr

Rəqiblər:
- https://buffget.com/news/chamet-agency-revenue-model-diamond-to-cash-rates-2026 (zəif)
- https://topuplist.com/blogs/detail/chamet-host-earnings-gifts-calls-payouts (zəif)
- https://oyelabs.com/chamet-business-model/ (zəif)
- https://lootbar.gg/blog/en/mico-vs-poppo-live-vs-chamet-which-is-the-best-host-platform.html (zəif)
- https://bittopup.com/article/MICO-Live-2025-Earnings-Guide-6-Real-Ways-to-Make-Money-from-Gifts-and-Events (zəif)
- https://bittopup.com/article/Bigo-Live-Money-Guide-Earn-15010K-Monthly-in-2025 (zəif)

Tanışlıq tətbiqləri:
- https://app.appfigures.com/resources/insights/20250509?f=2
- https://www.globaldatinginsights.com/featured/dating-apps-record-highest-ever-monthly-revenue-in-april-2025/
- https://www.scmp.com/tech/tech-trends/article/3232764/dating-apps-match-bumble-gindr-turn-premium-tiers-boost-revenue-and-discounts-gen-z

App Store qaydaları:
- https://www.pcgamer.com/apple-now-requires-app-store-games-to-disclose-loot-box-odds/
- https://fenwick.com/insights/publications/apple-now-requires-disclosure-of-loot-box-odds
- https://www.mondaq.com/unitedstates/consumer-law/1621598/court-finds-apple-violated-order-resulting-in-key-changes-for-ios-external-purchase-methods
- https://appleinsider.com/articles/26/03/30/the-epic-vs-apple-case-wont-get-a-rehearing-for-app-store-fees

Azərbaycan qanunvericiliyi:
- https://www.caspianlegalcenter.az/insights/more/personal-data-azerbaijan
- https://report.az/en/ict/azerbaijan-updates-law-on-protection-of-personal-data
- https://www.mondaq.com/gaming/1151766/amendments-to-gambling-regulations

Ödəniş üsulları:
- https://creativegroup.az/en/blog/epoint-az-odenis-sistemi-inteqrasiyasi
- https://asanimza.az/en/epoint-az-presents-an-innovative-payment-solution-for-sme-business-clients-with-credit-cards-in-installments/
- https://banco.az/az/node/139879
- https://cartdna.com/shopify-payment-guide/europe/azerbaijan
- https://www.8b.world/payment-methods/kaspi-kz
- https://the-tech.kz/czifrovye-koshelki-uzbekistana-kto-lidiruet-na-rynke-i-v-chem-ih-otlichie/
- https://developers.tbcbank.ge/docs/payment-methods

> Hüquqi bölmələr hüquq məsləhəti deyil. Lucky gift, mükafatlı yarışlar və operator ödənişi kimi pul və təsadüflə bağlı mexanikalar Azərbaycan hüquqşünasının rəyi ilə yoxlanmalıdır.
