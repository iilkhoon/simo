# Simo iqtisadiyyatı

Bütün nisbətlər bir yerdədir: `backend/src/economy.ts`. Mobil tətbiq onları `mobile/src/lib/economy.ts`-də yalnız göstərmək üçün təkrarlayır. Hesablamanı həmişə server edir.

## Valyutalar

| Valyuta | Haradan gəlir | Nəyə xərclənir | Nağdlaşır? |
|---|---|---|---|
| **Nar** (ödənişli) | App Store, Google Play, Epoint ilə alış | Mesaj, zəng, hədiyyə, VIP, zadəganlıq, şəxsi məzmun abunəsi, super bəyənmə, filtr dəyişikliyi | Xeyr |
| **Promo Nar** | Qeydiyyat (30), gündəlik bonus (3–20), dəvət (hər alışın 5%-i, ≤500), ilk yükləmə hədiyyəsi (≤300), PK qələbəsi (100), çəkiliş mükafatı, fərdi təklif bonusu | Nar kimi istifadə olunur və **birinci xərclənir** | Xeyr. Qəbul edənə Almaz yazılmır |
| **Almaz** (qazanılmış) | Ödənişli Nar (və ya Almaz) xərcləndikdə host və agentliyə yazılır | Nağd pul (10 Almaz = 1 ₼), Nar (1 Almaz = 10 Nar), Almaz hədiyyələri | Bəli: minimum 500 Almaz (50 ₼), 3% haqq, həftədə 1 dəfə, 7 gün gözləmə |
| **Almaz** (alınmış) | Almaz paketləri (100 / 500 / 2 000 Almaz) | Yalnız Almaz hədiyyələri və ya Nar-a mübadilə | Xeyr |

Nominal dəyər: 1 Nar = 1 qəpik, **1 Almaz = 10 qəpik** (Nar-dan 10 dəfə bahalı premium valyuta).

Texniki qeyd: server Almaz balansını qəpik dəyəri ilə saxlayır (`diamonds`, 10 vahid = 1 Almaz) ki, kiçik qazanclarda (məs. mesajdan 4.5 Almaz) dəqiqlik itməsin. Tətbiq ekranda vahid/10 göstərir. Alınmış hissə `diamondsBought`-dadır.

Promo Nar-ın Almaz yaratmaması bonus fırıldağının qarşısını alır. Saxta hesablarla bonus toplayıb öz host hesabına hədiyyə göndərmək və pul çıxarmaq mümkün deyil.

## 1 ödənişli Nar xərcləndikdə

| Kim | Pay | Qeyd |
|---|---|---|
| **Simo** | **65–70%** | Agentlik səviyyəsindən asılıdır |
| Host | **15% (sabit)** | Yalnız qəbul edən **aktiv agentliyin üzvüdürsə**; agentlik böyüdükcə azalmır |
| Agentlik | 15–20% | Səviyyəyə görə və ya admin fərdi faizi (0–30%); Simo-nun payından verilir |

Qəbul edən agentlikdə deyilsə, 100% Simo-da qalır. Almaz hədiyyəsi göndəriləndə də eyni bölgü işləyir (hədiyyənin dəyəri qəpiklə). Agentlik sahibi özü də host olduqda hər iki payı alır.

Düstur (`splitEarnings`): `host = floor(paid × 0.15)`, `agency = floor(paid × agencyShare)`, qalan Simo. Ətraflı: [AGENCY_PROGRAM.md](AGENCY_PROGRAM.md).

### Agentlik səviyyələri

Səviyyə son 30 gündə agentlikdə qazanılan məbləğin (host payı + komissiya, `HostEarning`) cəmi ilə müəyyən olunur. Məqsəd agentlikləri hostları böyütməyə həvəsləndirməkdir: agentlik böyüdükcə onun payı artır.

| Səviyyə | Ad | 30 günlük qazanc (daxili vahid) | ≈ ₼ | Agentlik | Host |
|---|---|---|---|---|---|
| 1 | Bürünc | 0+ | 0+ | 15% | 15% |
| 2 | Gümüş | 100 000+ | 1 000+ | 16% | 15% |
| 3 | Qızıl | 500 000+ | 5 000+ | 17% | 15% |
| 4 | Platin | 2 000 000+ | 20 000+ | 18% | 15% |
| 5 | Brilyant | 10 000 000+ | 100 000+ | 20% | 15% |

Agentlik yaratmaq pulsuzdur. Müraciət formu doldurulur, sahib KYC-dən keçir, Simo admin paneldən təsdiq edir.

## Platformanın xalis payı

Mağaza komissiyası çıxıldıqdan sonra qalan pulun neçə faizi Simo-da qalır? Qəbul edən Bürünc agentlikdədir, 30% ödənilir (Brilyant səviyyədə 35%; cədvəldəki Simo payı ~5 bənd azalır).

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
- **Almaz → Nar** mübadiləsi pulu tətbiqdə saxlayır, xərclənəndə yenidən 70/30 bölünür.
- **Promo Nar** heç kimə Almaz yaratmır.
- **Almaz paketləri** (100 Almaz — 12.99 ₼, 500 — 59.99 ₼, 2 000 — 229.99 ₼): 1 Almaz ≈ 11–13 qəpik, yəni Nar-dan bahalı. Alınmış Almaz nağdlaşmır.
- **Fərdi təkliflər** (alqoritm): bonus promo Nar olaraq verilir, ən böyük paketdə belə Simo-nun xalis payı 50%-dən aşağı düşmür.

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

**Host qazancı nümunəsi (Bürünc, 15%):** gündə 40 mesaj (30 Nar), 30 dəqiqə video zəng (80 Nar) və 300 Nar hədiyyə = gündə 3 900 Nar → host 585 qəpik/gün (58.5 Almaz) ≈ **ayda 175 ₼**.

## Çıxarış

- KYC təsdiqlənməlidir.
- Minimum 500 Almaz (50 ₼), həftədə bir dəfə, 3% xidmət haqqı.
- Yalnız qazanılmış Almaz nağdlaşır (alınmış Almaz yox).
- Yeni qazanılan Almaz 7 gün gözləmədə qalır (geri qaytarılan ödənişlər və fırıldaq riski).

## Host olmaq üçün şərtlər

Agentliyə müraciətdən əvvəl tamamlanmalıdır (`GET /host/requirements`):

1. Hesab ən azı 3 günlükdür.
2. 10 nəfərlə söhbət edilib.
3. Profil: avatar, 3 foto, ən azı 10 simvolluq bio.
4. İlk paylaşım (video və ya foto).
5. KYC göndərilib.

## Tənzimləmə

Bütün rəqəmlər `backend/src/economy.ts` faylındadır. Paketlər və hədiyyələr `prisma/seed.ts`-də (və ya admin paneldə) dəyişdirilir. Hər dəyişiklikdən sonra yuxarıdakı cədvəli yenidən hesablayın: ən böyük paketdə Apple/Google ilə Simo-nun xalis payı **50%-dən aşağı düşməməlidir**.

## Almaz hədiyyələri (yalnız Almaz ilə)

| Hədiyyə | Qiymət |
|---|---|
| Almaz ürək | 100 Almaz (10 ₼) |
| Brilyant üzük | 500 Almaz (50 ₼) |
| İpək xalça | 1 000 Almaz (100 ₼) |
| Almaz tac | 3 000 Almaz (300 ₼) |
| Şəxsi təyyarə | 10 000 Almaz (1 000 ₼) |

## Xidmət satışı

İstifadəçi (KYC təsdiqi ilə) öz xidmətini Nar ilə satır: fərdi görüntülü/səsli görüş, yazışma, video təbrik və s. Sifarişdə Nar alıcıdan tutulur (escrow). Satıcı qəbul edir və "tamamlandı" deyəndə ödənişli hissədən 70/30 qaydası ilə Almaz yazılır. İmtina, ləğv və ya 72 saat cavabsız qalmada Nar tam qaytarılır (ödənişli hissə ödənişli, promo hissə promo kimi).

## Nişanlar

- **Mavi nişan — "Təsdiqlənmiş profil"**: VIP ilə gəlir (satılır).
- **Yaşıl nişan — "Kimlik təsdiqlənib"**: yalnız şəxsiyyət sənədi ilə KYC-dən keçənlərə, satılmır.
