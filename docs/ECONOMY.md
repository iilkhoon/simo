# Simo iqtisadiyyatı

Bütün nisbətlər bir yerdədir: `backend/src/economy.ts`. Mobil tətbiq onları `mobile/src/lib/economy.ts`-də yalnız göstərmək üçün təkrarlayır. Hesablamanı həmişə server edir.

## Valyutalar

| Valyuta | Haradan gəlir | Nəyə xərclənir | Nağdlaşır? |
|---|---|---|---|
| **Nar** (ödənişli) | App Store, Google Play, Epoint ilə alış | Mesaj, zəng, hədiyyə, VIP, zadəganlıq, şəxsi məzmun abunəsi, super bəyənmə, filtr dəyişikliyi | Xeyr |
| **Promo Nar** | Qeydiyyat (30), gündəlik bonus (3–20), dəvət (hər alışın 5%-i, ≤500), ilk yükləmə hədiyyəsi (≤300), PK qələbəsi (100), çəkiliş mükafatı | Nar kimi istifadə olunur və **birinci xərclənir** | Xeyr. Qəbul edənə Ləl yazılmır |
| **Ləl** | Ödənişli Nar xərcləndikdə host və agentliyə yazılır | Nağd pul (100 Ləl = 1 ₼) və ya Nar (1:1) | Bəli: minimum 5 000 Ləl, 3% haqq, həftədə 1 dəfə, 7 gün gözləmə |

Nominal dəyər: 1 Nar = 1 qəpik, 1 Ləl = 1 qəpik.

Promo Nar-ın Ləl yaratmaması bonus fırıldağının qarşısını alır. Saxta hesablarla bonus toplayıb öz host hesabına hədiyyə göndərmək və pul çıxarmaq mümkün deyil.

## 1 ödənişli Nar xərcləndikdə

| Kim | Pay | Qeyd |
|---|---|---|
| **Simo** | **70%** | Həmişə |
| Host + agentlik | 30% | Yalnız qəbul edən **aktiv agentliyin üzvüdürsə** |
| — agentlik | 15–20% | Agentliyin səviyyəsinə görə, aşağıya bax |
| — host | 30% − agentlik payı | 10–15% |

Qəbul edən agentlikdə deyilsə, 100% Simo-da qalır. Agentlik sahibi özü də host olduqda hər iki payı alır.

Düstur (`splitEarnings`): `host = floor(paid × 0.30) − floor(paid × agencyShare)`.

### Agentlik səviyyələri

Səviyyə son 30 gündə agentliyin bütün hostlarının qazandığı Ləlin cəmi ilə müəyyən olunur. Məqsəd agentlikləri hostları böyütməyə həvəsləndirməkdir: agentlik böyüdükcə onun payı artır.

| Səviyyə | Ad | 30 günlük qazanc (Ləl) | ≈ ₼ | Agentlik | Host |
|---|---|---|---|---|---|
| 1 | Bürünc | 0+ | 0+ | 15% | 15% |
| 2 | Gümüş | 100 000+ | 1 000+ | 16% | 14% |
| 3 | Qızıl | 500 000+ | 5 000+ | 17% | 13% |
| 4 | Platin | 2 000 000+ | 20 000+ | 18% | 12% |
| 5 | Almaz | 10 000 000+ | 100 000+ | 20% | 10% |

Agentlik yaratmaq pulsuzdur. Müraciət formu doldurulur, sahib KYC-dən keçir, Simo admin paneldən təsdiq edir.

## Platformanın xalis payı

Mağaza komissiyası çıxıldıqdan sonra qalan pulun neçə faizi Simo-da qalır? Ən pis hal götürülüb: qəbul edən agentlikdədir, 30% ödənilir.

| Paket | 1 Nar qiyməti | Apple/Google (30%) xalis | Qəbul edənlər | **Simo** | Epoint (~2.5%) xalis | **Simo** |
|---|---|---|---|---|---|---|
| 100 Nar — 1.99 ₼ | 1.99 q | 1.39 q | 22% | **78%** | 1.94 q | **85%** |
| 630 Nar — 9.99 ₼ | 1.59 q | 1.11 q | 27% | **73%** | 1.55 q | **81%** |
| 1 400 Nar — 19.99 ₼ | 1.43 q | 1.00 q | 30% | **70%** | 1.39 q | **78%** |
| 18 400 Nar — 199.99 ₼ | 1.09 q | 0.76 q | 39% | **61%** | 1.06 q | **72%** |

Əlavə gəlirlər (100% Simo):

- **VIP** (500 / 1 200 / 3 000 Nar, 30 gün) və **zadəganlıq** (Bəy 2 000, Xan 8 000, Şah 30 000 Nar, 30 gün).
- **Super bəyənmə** (limitdən sonra 100 Nar) və **filtr dəyişikliyi** (həftədə 2 pulsuz, sonra 50 Nar).
- Agentliksiz qəbul edənə xərclənən Nar.
- **Ləl → Nar** mübadiləsi pulu tətbiqdə saxlayır, xərclənəndə yenidən 70/30 bölünür.
- **Promo Nar** heç kimə Ləl yaratmır.

## Qiymətlər (Nar)

| Nə | Qiymət | Qeyd |
|---|---|---|
| Mesaj | 30 (standart), host 10-dan səviyyəsinə görə 40 / 60 / 100 / 200-dək təyin edir | Gündə 3 yeni söhbətdə ilk "salam" pulsuz. Host pulsuz söhbəti aça bilər. Abunəçilər və VIP limitləri daxilində pulsuz |
| Görüntülü zəng | dəqiqəsi 40–400 (defolt 80) | |
| Səsli zəng | dəqiqəsi 20–200 (defolt 40) | |
| Hədiyyələr | 1 – 29 999 | Kateqoriyalar: populyar, romantik, Azərbaycan, lüks |
| Şəxsi məzmun abunəsi | 500 – 10 000 / ay | Yaradıcı təyin edir; şöhrət səviyyəsi 3+ və KYC tələb olunur; çılpaqlıq qadağandır |
| Super bəyənmə | gündə 1 pulsuz (VIP-də 3–10), sonra 100 | |
| Bəyənmə | gündə 10 pulsuz | Sonra VIP |

**Host qazancı nümunəsi (Bürünc, 15%):** gündə 40 mesaj (30 Nar), 30 dəqiqə video zəng (80 Nar) və 300 Nar hədiyyə = gündə 3 900 Nar → host 585 Ləl/gün ≈ **ayda 175 ₼**.

## Çıxarış

- KYC təsdiqlənməlidir.
- Minimum 5 000 Ləl (50 ₼), həftədə bir dəfə, 3% xidmət haqqı.
- Yeni qazanılan Ləl 7 gün gözləmədə qalır (geri qaytarılan ödənişlər və fırıldaq riski).

## Host olmaq üçün şərtlər

Agentliyə müraciətdən əvvəl tamamlanmalıdır (`GET /host/requirements`):

1. Hesab ən azı 3 günlükdür.
2. 10 nəfərlə söhbət edilib.
3. Profil: avatar, 3 foto, ən azı 10 simvolluq bio.
4. İlk paylaşım (video və ya foto).
5. KYC göndərilib.

## Tənzimləmə

Bütün rəqəmlər `backend/src/economy.ts` faylındadır. Paketlər və hədiyyələr `prisma/seed.ts`-də (və ya admin paneldə) dəyişdirilir. Hər dəyişiklikdən sonra yuxarıdakı cədvəli yenidən hesablayın: ən böyük paketdə Apple/Google ilə Simo-nun xalis payı **50%-dən aşağı düşməməlidir**.
