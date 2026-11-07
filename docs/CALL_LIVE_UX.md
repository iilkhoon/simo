# Zəng və canlı yayın UX-i (Simo) — tədqiqat və tətbiq

Bu sənəd Azar, Chamet, Tango, Bigo Live, LivU və MICO-nun pullu zəng / canlı yayın təcrübəsini
Simo-ya uyğunlaşdırmaq üçün toplanıb. Sonda Simo-da nəyin edildiyi və nəyin real telefonda yoxlanmalı olduğu yazılıb.

> **Mənbələr haqqında.** Bu tətbiqlərin rəsmi UX sənədləri yoxdur. Aşağıdakı faktlar App Store səhifələrindən,
> buraxılış qeydlərindən, Agora sənədlərindən və üçüncü tərəf bələdçilərindən götürülüb. Bələdçilər (buffget, bittopup,
> joytify) ziddiyyətlidir və reklam məqsədlidir — rəqəmləri (qiymət, faiz) yalnız istiqamət kimi götürün.
> Ekran yerləşdirmələrinin bir hissəsi bu kateqoriyanın ümumi qəbul olunmuş naxışıdır, mənbə ilə təsdiqlənməyib.

## 1. Pullu 1-ə-1 zəng

| Mövzu | Bazarda necədir | Simo-da |
|---|---|---|
| Qiymət zəngdən əvvəl | Chamet: host qiyməti özü təyin edir ("My Chat Price"), dəqiqəlik almaz/sikkə real vaxtda tutulur [3][4]. Pullu zəng tətbiqlərində ümumi naxış: zəngdən əvvəl qiymət + balans, çatmırsa "Top-Up" pop-up-ı, kredit tutulmur [7][8] | `CallConfirm` vərəqəsi: X Nar/dəq, balans, "≈ N dəqiqəyə çatır", VIP endirimi, ilk dəqiqənin nə vaxt tutulduğu. Balans çatmırsa — eyni yerdə "Yüklə və zəng et" |
| Ödəniş anı | Real vaxt, dəqiqə başında [3] | İlk dəqiqə **qəbul anında**, sonra hər dəqiqə başında (server). Cavab yoxdursa — 0 |
| Zəng içində taymer və xərc sayğacı | Zəng edən xərcini, host qazancını görür (bələdçilər: "diamonds deducted in real time") [3][5] | Yuxarıda həb: zəng edənə `🪙 xərc · N dəq qalıb`, hosta `💎 +qazanc`. Server hər dəqiqə `call:tick` göndərir |
| Az balans | Pullu zəng tətbiqlərində: hədd xəbərdarlığı + bir toxunuşla yükləmə, yenidən qoşulmadan [7][9] | `call:low-balance` (≤1 dəqiqə qalanda) → sarı kart; son dəqiqədə saniyə geri sayımı; toxunanda zəngi kəsmədən `RechargeSheet` |
| Gözəllik filtri, kamera çevir, mikrofon, dinamik | Hamısında standart | Var (Agora beauty, switchCamera, mute, speaker). Sistem zəng ekranından (CallKit) səsi bağlamaq da Agora-nı susdurur |
| Kiçiltmə (PiP) | Chamet/LivU-da var | **Edilmədi** — native PiP modulu tələb edir (yeni native build). Əvəzinə: ekrandan təsadüfən çıxanda zəng bitirilir (arxada pul getməsin), Android "geri" təsdiq soruşur |
| Zəngdən sonra xülasə | Müddət, xərclənən sikkə, qiymətləndirmə, izlə/hədiyyə/yenidən zəng (dizayn brifləri: "Call End Screen: Duration, Coins used, Recharge CTA") [8] | `call/summary`: müddət, xərclənən Nar (və ya hostun Almazı), hədiyyələr, 1–5 ulduz, İzlə / Hədiyyə / Yaz, "Yenidən zəng et" |
| Gələn zəng (host) | Zəng edənin profili, səviyyəsi | Profil şəkli, sərvət səviyyəsi, şəhər + **qiymət etiketi** (host bilsin ki, ödənişli zəngdir); 45 san. sonra öz-özünə bağlanır |
| Yenidən qoşulma | Agora: 4 san. məlumat gəlməsə `RECONNECTING`, 10 san. sonra `connection lost`, 20 dəq. sonra `FAILED` [6] | RTC `RECONNECTING` və ya socket kəsiləndə "Yenidən qoşulur…" pəncərəsi; qarşı tərəf düşəndə "X yenidən qoşulur…". Server 60 san. güzəşt verir, sonra zəngi bitirir |
| Şəbəkə keyfiyyəti | — | `onNetworkQuality` → 3 zolaqlı göstərici (yaşıl/sarı/qırmızı) |

## 2. Təsadüfi tanışlıq (Azar üslubu)

Azar: bir toxunuşla uyğunlaşma, sürüşdürüb keçmək, cins/region filtri pullu (gems) — ən çox şikayət filtrin
pullu olmasındandır [1][2]. Simo-da `match.tsx` artıq var: onlayn və boş hostlardan seçir, kartda qiymət görünür,
"Növbəti" / "Zəng et". Dəyişiklik: kartda qiymət göstərildiyi üçün "Zəng et" balans çatırsa təsdiqsiz zəng edir,
çatmırsa yükləmə vərəqəsi açılır.

## 3. Canlı yayın otağı

| Element | Bazarda | Simo-da |
|---|---|---|
| Yuxarı zolaq | Host + izlə düyməsi, izləyici sayı, top dəstəkçilər (Tango buraxılış qeydləri: "Leaderboards", "Top Gifters list for broadcasters") [10] | Host həbi (izlə +), 👁 say (toxunanda izləyicilər), top-3 dəstəkçi (toxunanda sıralama) |
| İzləyici siyahısı / sıralama | Standart (Bigo/Tango) | `LiveUsersSheet`: "İzləyicilər" (bu yayında hədiyyə edənlər öndə, sonra VIP, sərvət) və "Top dəstəkçilər" |
| Giriş bildirişləri | MICO buraxılış qeydləri giriş effektlərini və onların söndürülməsini qeyd edir [12] | VIP / yüksək səviyyə — iri rəngli banner; adi istifadəçi — şərhlərin üstündə qısa sürüşən zolaq (`JoinTicker`) |
| Bəyənmə ürəkləri | Standart | Ürək düyməsi + videoya iki dəfə toxunmaq; serverə 1,5 san.-də bir toplu göndərilir |
| Şərhlər | Standart | Göndər düyməsi (mətn olanda), ilk dəfə üçün cəld salam çipləri ("Salam 👋", …) |
| PK döyüşü | Hədiyyələr xal kimi zolağı doldurur, 3–10 dəq., sonda qalib [11] | 5 dəq., `PkBar`; öz host həmişə solda; son 10 saniyə geri sayım; bitəndə "Qalib" və ya "Bərabərlik", 8 san. sonra gizlənir; dəvət 60 san.-dən sonra köhnəlir |
| Qonaq / ko-host oturacaqları | MICO: 9 nəfərə qədər party, host oturacağa dəvət edir/çıxarır [12][13] | Mövcud idi (video yayında 3 qonaq, səsli otaqda 4/8/12 oturacaq) |
| VIP/zadəgan giriş effekti | Tango/Bigo VIP statusu [10] | Mövcud VIP banneri saxlanıldı; zadəgan (Noble) effektləri başqa agentin sahəsidir |

## 4. Etibarlılıq — tapılan və düzəldilən səhvlər

Server (hamısı `backend/test/calls-live.ts` testləri ilə):

1. **İkiqat dəqiqə ödənişi**: billing intervalı üst-üstə düşə bilirdi, `chargeMinute` şərtsiz idi → eyni dəqiqə iki dəfə tutula bilərdi. İndi şərtli (`status=ACTIVE AND billedMinutes=gözlənilən`) + tik qoruyucusu.
2. **Bitmiş zəngə ödəniş**: `chargeMinute` statusu oxuyandan sonra zəng bitə bilərdi. Şərtli yeniləmə sətri kilidləyir.
3. **Server yenidən başlayanda ACTIVE zəng ilişib qalırdı** (oflayn taymer yaddaşda idi) → balans bitənə qədər pul gedirdi. Yeni sweeper: tərəflərdən biri 60 san. oflayn — `DISCONNECTED`.
4. **Eyni hosta paralel iki zəng** keçə bilirdi (yoxla-sonra-yarat). Postgres advisory lock.
5. **Qəbul anında zəng edən ləğv etsə** — host ENDED zəngə "qəbul" cavabı alırdı. Yoxlanılır.
6. Host cavab vermədən "bitir" bassa — zəng edən "ləğv edildi" görürdü; indi "rədd edildi".
7. Host gələn zəngi bir cihazda qəbul edəndə digər cihazında ekran çalmağa davam edirdi → `call:accepted` hosta da gedir.
8. **Canlı izləyici sayı**: istifadəçinin iki cihazı / eyni soketdən təkrar `live:join` sayğacı pozurdu (xəyali izləyicilər). İndi soket başına otaq izlənir.
9. **Host qayıtmayan yayın** (restartdan sonra izləyicilər qayıdır, host yox) əbədi LIVE qalırdı → 90 san. sweeper.
10. **PK qalib bonusu iki dəfə** yazıla bilərdi (taymer + "bitir" + sweeper). Atomik keçid. Restartda itən PK taymerləri sweeper ilə bitir; yayın bitəndə PK da bitir; köhnə dəvət qəbul olunmur; artıq PK-da olan otaq ikinci PK-ya girə bilmir.
11. **Söhbət**: zəng qeydi (CALL mesajı, senderId = zəng edən) "ilk pulsuz salam" hüququnu yandırırdı; paralel mesajlar eyni pulsuz yeri tuta bilirdi.
12. Swipe bloklanmış istifadəçi ilə uyğunluq/söhbət yaradırdı; təkrar bəyənmə təkrar "uyğunluq" bildirişi göndərirdi.
13. Xidmət sifarişi: satıcı qəbul edəndən sonra alıcı yarış ilə ləğv edə bilirdi; çəkiliş iki admin tərəfindən iki dəfə ödənə bilirdi.
14. Video: paralel bəyənmə/saxlama/baxış 500 qaytarırdı (unikal açar), mövcud olmayan videoya baxış 500.

Müştəri:

15. **Soyuq başlanğıc** (CallKit-dən cavab, push linki): zəng/canlı/söhbət ekranının effekti kök layout socket-i yaratmazdan əvvəl işləyirdi → `call:accepted`, `call:ended`, şərhlər heç gəlmirdi, canlı otağa `live:join` göndərilmirdi. `useSocket()` hook-u ilə düzəldildi (veb önizləmədə təkrarlanıb və düzəldiyi görülüb).
16. Şəbəkə kəsilib bərpa olunanda canlı otağa yenidən qoşulmurdu (host 60 san. sonra "çıxmış" sayılırdı); söhbətdə arada gələn mesajlar itirdi.
17. Qaçırılmış `call:ended`/`call:accepted` — zəng ekranı indi qoşulanda, tətbiq önə gələndə və hər 8 san. serverlə tutuşdurur; taymer server saatına görə.
18. Veb: `answeredInApp`/`declinedInApp` stub-u yox idi — vebdə gələn zəngi qəbul etmək xəta verirdi.

## 5. Real telefonda yoxlanmalı olanlar

- Agora: yenidən qoşulma pəncərəsi (Wi-Fi ↔ LTE keçidi, təyyarə rejimi 5–30 san.), şəbəkə göstəricisi, gözəllik filtri.
- iOS fonda (CallKit aktiv) socket-in sağ qalması — əks halda server 60 san.-dən sonra zəngi `DISCONNECTED` ilə bitirər.
- Zəng içində yükləmə: iOS IAP vərəqəsi və Android Google Play / Huawei Epoint brauzeri açılanda səs/video davam edirmi.
- CallKit səs düyməsi → tətbiqdə mikrofon ikonunun dəyişməsi.
- Android "geri" düyməsi təsdiqi; zəng ekranından başqa ekrana keçid (push-a toxunmaq) zəngi bitirir — bu gözlənilən davranışdır (PiP yoxdur).
- Canlı: iki toxunuşla bəyənmə videonu bağlamır; şərh klaviaturası; PK zolağının sağ/sol yönü hər iki otaqda.

## Mənbələr

1. Azar — App Store: https://apps.apple.com/az/app/azar-video-chat/id972558973
2. Azar rəy icmalı (gems, filtr şikayətləri): https://unstar.app/blog/is-azar-legit-safe-random-video-chat-app-reviews-2026
3. Chamet video zəng qiyməti (üçüncü tərəf): https://buffget.com/news/chamet-video-call-price-2026-minute-cost-breakdown
4. Chamet private call rates (üçüncü tərəf): https://buffget.com/news/chamet-private-call-rates-2026-goddess-host-pricing-guide
5. Chamet host qazancı (üçüncü tərəf): https://news.bittopup.com/news/chamet-host-earnings-guide-make-50--1200-weekly-in-2025
6. Agora — Connection status management: https://docs.agora.io/en/realtime-media/rtc/build/manage-connection-and-quality/connection-status-management
7. Talk360 — out of credits pop-up: https://help.talk360.com/en/articles/558581-why-do-i-see-you-are-out-of-call-credits
8. Video call app dizayn brifi (pre-call rate, call end screen): https://www.freelancer.com/projects/ui-design/modern-video-call-app
9. Pay-per-minute video konsultasiya (balans yoxlaması, bir toxunuşla yükləmə): https://tpstreams.com/?p=14161
10. Tango buraxılış qeydləri (leaderboards, top gifters, VIP): https://www.apkmirror.com/apk/tango/tango-tango/tango-tango-4-8-226693-release/
11. Bigo Live PK bələdçisi (üçüncü tərəf): https://www.joytify.com/blog/en-us/other/other-bigo-live-pk-battles-guide/
12. MICO — App Store (party, multi-guest): https://apps.apple.com/de/app/id908023218 ; buraxılış qeydləri: https://apkmirror.com/apk/mico-world/mico-go-live-streaming-chat
13. Tencent Cloud — live room seat management (ümumi model): https://www.tencentcloud.com/document/product/1071/76652
14. LivU top-up (Codashop): https://la.support.codashop.com/hc/en-us/articles/4408425581455-How-to-top-up-LivU
