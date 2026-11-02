# Simo iqtisadiyyatı

Bütün nisbətlər bir yerdədir: `backend/src/economy.ts`. Mobil tətbiq onları `mobile/src/lib/economy.ts`-də yalnız göstərmək üçün təkrarlayır. Hesablamanı həmişə server edir.

## Valyutalar

| Valyuta | Haradan gəlir | Nəyə xərclənir | Nağdlaşır? |
|---|---|---|---|
| **Coin** (ödənişli) | App Store, Google Play, Epoint ilə alış | Mesaj, zəng, hədiyyə, VIP | Xeyr |
| **Promo coin** | Qeydiyyat (30), gündəlik bonus (3–20), dəvət (≤200), ilk yükləmə hədiyyəsi (≤300) | Coin kimi istifadə olunur və **birinci xərclənir** | Xeyr. Qəbul edənə almaz yazılmır |
| **Almaz** | Ödənişli coin xərcləndikdə qəbul edənə yazılır | Nağd pul (200 almaz = 1 ₼) və ya coin (3 almaz = 1 coin) | Bəli, minimum 10 000, 3% haqq |

Promo coinlərin almaz yaratmaması bonus fırıldağının qarşısını alır. Məsələn, saxta hesablarla bonus toplayıb öz host hesabına hədiyyə göndərib pul çıxarmaq mümkün deyil.

## 1 ödənişli coin xərcləndikdə

| Kim | Nə alır | Pulla (qəpik) |
|---|---|---|
| Host (qəbul edən) | 0.5 almaz | 0.25 |
| Agentlik (varsa) | hostun almazının 10%-i, platforma payından | 0.025 |
| Platforma | qalan hissə | alış qiymətindən asılıdır, aşağıya bax |

Çıxarışda 3% xidmət haqqı tutulur. Bu, bank və köçürmə xərcini örtür.

## Platformanın payı

Hesablamada agentlik daxil olmaqla ən pis hal götürülüb: hosta və agentliyə 0.275 qəpik/coin.

| Paket | 1 coin qiyməti | Apple/Google (30%) xalis | Host + agentlik | **Platforma** | Epoint (~2.5%) xalis | **Platforma** |
|---|---|---|---|---|---|---|
| 100 coin — 1.99 ₼ | 1.99 q | 1.39 q | 20% | **80%** | 1.94 q | **86%** |
| 630 coin — 9.99 ₼ | 1.59 q | 1.11 q | 25% | **75%** | 1.55 q | **82%** |
| 1 400 coin — 19.99 ₼ | 1.43 q | 1.00 q | 27% | **73%** | 1.39 q | **80%** |
| 18 400 coin — 199.99 ₼ | 1.09 q | 0.76 q | 36% | **64%** | 1.06 q | **74%** |

Əlavə gəlirlər:

- **VIP** coinlə alınır və 100%-i platformada qalır.
- **Promo coinlər** hosta ödəniş yaratmır.
- **Almazın coinə dəyişdirilməsi** (3:1) platformanın xeyrinədir. 3 almaz nağd 1.5 qəpikdir, 1 coin isə 1.09–1.99 qəpikə satılır.
- **VIP zəng endirimi** ümumi qiymətdən çıxılır, ona görə hostun payı da mütənasib azalır.

### Əvvəlki model niyə zərərli idi

Əvvəlki modeldə host 60% alırdı, 100 almaz 1 ₼ edirdi, ilk yükləmədə coinlər ×2 olurdu, böyük paketdə isə 5000 bonus verilirdi.

- **Böyük paket (Apple):** platformaya 1 coin üçün 0.67 qəpik qalırdı, hosta və agentliyə isə 0.66 qəpik gedirdi. Marja təxminən **1%** idi.
- **İlk yükləmədə ×2:** platforma hər coindən **zərər** edirdi.
- **Bonus coinlər:** hamısı nağdlaşan almaza çevrilirdi.

## Qiymətlər (coin)

| Nə | Qiymət | Host qazancı |
|---|---|---|
| Hosta mesaj (ilk mesaj pulsuz) | 10 | 5 almaz = 2.5 q |
| Görüntülü zəng | dəqiqəsi 40–400 (defolt 80) | 80 → 40 almaz = 20 q/dəq |
| Səsli zəng | dəqiqəsi 20–200 (defolt 40) | 40 → 20 almaz = 10 q/dəq |
| Hədiyyələr | 1 – 29 999 | dəyərin 50%-i almazla |

**Host qazancı nümunəsi:** gündə 40 mesaj, 30 dəqiqə video zəng və 300 coin hədiyyə ilə ayda təxminən **225 ₼** qazanılır. Saytdakı kalkulyator eyni düsturla hesablayır.

## Tənzimləmə

Bütün rəqəmlər `backend/src/economy.ts` faylındadır. Paket qiymətləri və bonusları `prisma/seed.ts`-də (və ya admin paneldə) dəyişdirilir. Hər hansı dəyişiklikdən sonra yuxarıdakı cədvəli yenidən hesablayın. Ən böyük paketdə platformanın payı **50%-dən aşağı düşməməlidir**.
