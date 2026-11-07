# Simo dizayn sistemi — "Nar 2"

Simo-nun vizual dili iki qatdan ibarətdir.

1. **Məhsul qatı (foto-birinci, yumşaq).** Bu qat insanları və canlı yayınları ön plana çıxarır.
   - Tam ekran foto kartlar, məlumat fotonun üstündə yazılır.
   - Ağ kartlar, iri radius (20–34 px), yumşaq kölgələr və çoxlu boşluq.
2. **Brend qatı (oynaq, düz rəngli).** Bu qat Simo-ya xarakter verir.
   - Düz rəng blokları və çat-qabarcığı formasında başlıqlar.
   - "Nari" nar maskotu, nazar boncuğu və hədiyyə stikerləri.

Qradiyent dekor kimi işlədilmir. Yeganə istisna foto üzərindəki tünd "scrim"dir: o, mətnin oxunması üçündür.


**Nar 3 (2026-11) yeniləməsi:** qradiyentlər yalnız "dəyər" səthlərində işlədilir: əsas düymə, premium kartlar (VIP, Zadəganlıq, balans), illüstrasiyalar və bayram anları. Tokenlər: `gradients`, `spacing`, `motion` (`theme.ts`). Hərəkət primitivləri `components/motion.tsx`-dədir (Appear, Pressable3, Skeleton, Pulse, PopIn, Shine, Float). Boş vəziyyət illüstrasiyaları `components/Illustration.tsx`-dədir. Yeganə ikon ailəsi Ionicons-dur, tac və sikkə üçün eyni üslubda xüsusi SVG var. Əsas interfeysdə emoji işlədilmir. Araşdırma: `docs/DESIGN_RESEARCH.md`. Audit: `docs/SCREEN_AUDIT.md`.
Yayın, zəng, video lent və təsadüfi tanışlıq ekranları **Gecə (night) premium** rejimindədir: tünd fon, şüşə (glass) həblər, parlaq aksentlər.


Kod mənbələri:

- `mobile/src/theme.ts` — tokenlər;
- `mobile/src/components/ui.tsx` — komponentlər;
- `mobile/src/components/Logo.tsx` — loqo, maskot və nazar;
- `web/styles.css` — veb üçün eyni tokenlər.

## Rənglər

| Token | Hex | İstifadə |
|---|---|---|
| `paper` | `#F7F2EC` | Əsas fon (isti bej) |
| `paper2` | `#EFE7DE` | Sahələr (input), deaktiv düymələr, seqment fonu |
| `card` | `#FFFFFF` | Kartlar |
| `ink` | `#1A1512` | Mətn, tünd düymələr |
| `ink2` / `ink3` | `#6B6058` / `#A89D94` | İkinci dərəcəli mətn |
| **`nar`** | `#F2344F` | Brend, əsas düymə, "LIVE", video zəng |
| `saffron` | `#FFB21E` | Coin, hədiyyə, VIP Qızıl |
| `xazar` | `#2F6BFF` | Almaz, VIP Almaz |
| `mint` | `#17B978` | Onlayn, uğur |
| `lime` | `#D9F26B` | Vurğu blokları ("3 ortaq maraq", bonus) |
| `lilac` | `#CDB8FF` | Səsli tanışlıq, ikinci brend bloku |
| `sky` | `#8ED1FF` | Super bəyənmə, təsdiq nişanı (gecədə) |
| `orange` | `#FF7A3D` | Maskot variantı, aksiya |
| `night` / `night2` / `night3` | `#100E0D` / `#1D1A18` / `#2A2623` | Gecə rejimi qatları |
| `glass` / `glassLight` | `rgba(16,14,13,.42)` / `rgba(255,255,255,.22)` | Foto və video üzərində həblər |

Hər əsas rəngin yumşaq (`…Soft`) variantı var. O, ikon fonları və kiçik bloklar üçündür.

## Tipoqrafiya

İki şrift var. Hər ikisi Azərbaycan (ə, ğ, ı, ş), kiril hərflərini və ₼ işarəsini dəstəkləyir.

- **Geologica** (600–900) başlıqlar, rəqəmlər və brend blokları üçündür: geometrik, yumru və mehriban.
- **Onest** (400–800) mətn, düymələr və etiketlər üçündür.

| Stil | Şrift / ölçü |
|---|---|
| `hero` | Geologica 900 · 40 |
| `h1` | Geologica 800 · 30 |
| `h2` | Geologica 800 · 22 |
| `h3` | Geologica 700 · 17 |
| `title` | Onest 700 · 17 |
| `body` | Onest 400 · 15 |
| `small` | Onest 500 · 13 |
| `label` | Onest 700 · 11, böyük hərf |

## Forma, kölgə, boşluq

- **Radius:** xs 10 · sm 14 · md 20 · lg 26 · xl 34. Düymələr və çiplər tam yumrudur (pill).
- **Kölgə:** `elev(1–3)` yumşaq, isti-qəhvəyi kölgədir. `glow(color)` əsas (nar) düymənin rəngli parıltısıdır.
- **Kontur:** adi elementlərdə yoxdur. `Box hard` variantı (nazik kontur və sərt ofset kölgə) yalnız xüsusi promo stikerlər üçündür.
- **Boşluq:**
  - ekran kənarları 16;
  - kartlar arası 10–12;
  - bölmə başlığından əvvəl 24.

## Komponentlər

- **Btn**
  - Növlər: `primary` (nar, parıltılı), `dark`, `light`, `coin`, `mint`, `diamond`, `ghost`.
  - Ölçülər: lg 56, md 46, sm 36.
  - `full={false}` olan düymə konteynerin ortasına düzülür.
- **IconBtn:** dairəvi düymədir. Gecə rejimində `glassLight` fon və ağ ikonla istifadə olunur.
- **Box / PressBox / Card:** ağ kart, yumşaq kölgə. Basıldıqda 0.97 miqyasına kiçilir.
- **GlassPill:** foto və video üstündə məlumat etiketidir (məsafə, onlayn, maraqlar).
- **SpeechBlock:** düz rəngli çat-qabarcığı başlığıdır. "Tanış ol. Danış. Sev.", "Match!" və promo başlıqlar üçündür.
- **Chip / Segmented / Tabs:**
  - Chip ağ həbdir, aktiv halda qara olur.
  - Tabs `paper2` fon üzərində ağ "slider" göstərir.
- **Input:** `paper2` fonlu sahədir. Fokusda nar konturu görünür.
- **Avatar:** canlı yayında olanda nar halqası və "LIVE" həbi, VIP olanda səviyyə rəngində halqa göstərir.
- **Tab paneli:** üzən ağ kapsuldur. Ortadakı qaldırılmış nar düyməsi təsadüfi video tanışlığı açır.

## Brend elementləri

- **Loqo:** düz nar gövdəsi, içində ağ ürək. Tətbiq ikonu nar fonunda ağ işarədir.
- **Nari (maskot):** gülümsəyən nar personajıdır. Əhval variantları: `happy`, `wink`, `love`, `wow`. Xoş gəlmisiniz, match, boş vəziyyətlər və tanışlıq bloklarında işlədilir.
- **Nazar boncuğu:** uğur simvolu kimi stiker şəklində işlədilir.
- **Hədiyyələr:** yeganə mənbə `mobile/src/components/gifts/art.ts`-dir (çoxqatlı qradiyentli SVG). Veb üçün fayllar: `cd backend && npx tsx ../design/export-gifts.ts` (köhnə `design/gifts.mjs` silindi).

## Ekran qaydaları

| Ekran | Rejim | Əsas fikir |
|---|---|---|
| Canlı mərkəz | Gündüz | Story sırası, tanışlıq blokları, foto kartlar |
| Kəşf | Gündüz | Tam ekran foto kart, "N ortaq maraq", dairəvi hərəkət düymələri |
| Təsadüfi tanışlıq | Gecə | Radar, tapılan insan tam foto ilə |
| Zəng | Gecə | Bulanıq foto fon, şüşə idarəetmə paneli |
| Video / səsli yayın | Gecə | Şüşə həblər, tünd səhnə kartı |
| Video lent | Gecə | Tam ekran |
| Pul kisəsi, VIP, qazanc | Gündüz | Düz rəng blokları (saffron, ink, xazar) |

## Hizalama qaydaları

- **Başlıqlar:** Tab ekranlarının başlıq sırası minimum 54 px hündürlükdədir. Daxili ekranlarda `Header` 60 px-dir və bütün ekranlarda eyni yerdə durur.
- **Şəbəkə enləri:** boşluqla hesablanır. Kölgə üçün əlavə margin qoyulmur.
- **Absolute elementlər:** foto üzərindəki etiketlər kənarlardan simmetrik (10/12/14/18) yerləşdirilir.
- **Ekran ölçüləri:** hər ekran 360 px (kiçik Android) və 390 px enində yoxlanılır.
