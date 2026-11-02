# Simo dizayn sistemi — "Nar"

Simo-nun vizual dili **yumşaq neobrutalizmdir**: isti kağız fon, mürəkkəb-qara konturlar,
bulanıqsız sərt kölgələr, düz rəng blokları və iri, xarakterli başlıqlar. Qradiyent və
"parıltı" effektləri istifadə olunmur. Brend rəngi Azərbaycanın simvolu olan **nardan** gəlir.

Kod mənbəyi: `mobile/src/theme.ts` (tokenlər) və `mobile/src/components/ui.tsx` (komponentlər).

## Rənglər

| Token | Hex | İstifadə |
|---|---|---|
| `paper` | `#F6F0E8` | Əsas fon |
| `paper2` | `#ECE3D7` | Batıq sahələr, deaktiv düymələr |
| `card` | `#FFFDF9` | Kartlar, stikerlər |
| `ink` | `#17120F` | Mətn, konturlar, kölgələr |
| `ink2` / `ink3` | `#5C524A` / `#9B9087` | İkinci dərəcəli mətn |
| **`nar`** | `#F2344F` | Brend, əsas düymə, "canlı", video zəng |
| `narSoft` | `#FFD9DE` | Nar fonlu sahələr |
| `saffron` | `#FFB21E` | Coin, hədiyyə, VIP Qızıl |
| `xazar` | `#2F6BFF` | Almaz, səsli zəng/otaq, VIP Almaz |
| `mint` | `#14B577` | Onlayn, uğur |
| `lime` | `#DDF46B` | Vurğu stikerləri ("YENİ", "1:1") |
| `night` | `#0F0D0C` | İmmersiv ekranlar (video lent, yayın) |

Hər əsas rəngin yumşaq (`Soft`) variantı fon üçündür. Mətn həmişə `ink` və ya ağ olur.

## Tipoqrafiya

- **Unbounded** (ExtraBold, Bold, SemiBold) başlıqlar və rəqəmlər üçündür: geniş və xarakterli.
- **Onest** (400–800) mətn, düymə və etiketlər üçündür.
- Hər iki şrift Azərbaycan (ə, ğ, ı, ş), Kiril hərflərini və manat simvolunu (₼) dəstəkləyir.

| Üslub | Şrift | Ölçü |
|---|---|---|
| `hero` | Unbounded 800 | 38 |
| `h1` | Unbounded 800 | 28 |
| `h2` | Unbounded 700 | 21 |
| `h3` | Unbounded 600 | 16 |
| `body` | Onest 400 | 15 |
| `label` | Onest 700, BÖYÜK HƏRF | 11 |

## Forma qaydaları

- **Kontur:** bütün kart, düymə, çip və avatarlarda 2px `ink` kontur olur.
- **Sərt kölgə:** kölgə 2/4/6 px sağa-aşağı sürüşdürülür, bulanıqlıq yoxdur. `Box` komponenti bunu ayrıca təbəqə kimi çəkir, ona görə iOS və Android-də eyni görünür.
- **Basma effekti:** `PressBox` basılanda kölgənin üstünə "oturur", fiziki düymə hissi verir. Haptic geri-bildiriş də var.
- **Radius:** 8 / 12 / 16 / 22 / 28 və həb formalı (pill).
- **Stikerlər:** `Tag` etiketləri yüngül fırladılmış formada istifadə olunur. `Burst` (partlayış ulduzu) aksiya və hədiyyə anları üçündür.

## Komponentlər

| Komponent | Təyinatı |
|---|---|
| `Btn` | Düymə. Növlər: primary, dark, light, coin, mint, diamond. Ölçülər: lg, md, sm. |
| `IconBtn` | Dairəvi ikon düyməsi. |
| `Box`, `PressBox`, `Card` | Konturlu qutu və kart. |
| `Tabs`, `Segmented`, `Chip` | Seçicilər. |
| `Input` | Fokusda Nar rəngli kontur alır. |
| `Tag`, `Badge`, `LiveDot` | Etiketlər. |
| `MenuRow`, `SectionTitle`, `TitleBar`, `Header` | Siyahı sətri və başlıqlar. |
| `Avatar` | VIP halqası və "LIVE" stikeri ilə. |
| `GiftSheet`, `GiftOverlay` | Hədiyyə paneli və hədiyyə animasiyası. |
| `IncomingCall` | Gələn zəng ekranı. |

## Hədiyyə ikonları

`design/gifts.mjs` mənbə illüstrasiyalarını avtomatik olaraq düz rəngə çevirir və mürəkkəb kontur əlavə edir (`brutalize()`).
Yenidən yaratmaq üçün:

```bash
node design/gifts.mjs
```

## Ekran rejimləri

- **Kağız (gündüz):** kəşf, çat, profil, pul kisəsi, VIP, səsli otaq, zəng gözləmə ekranı.
- **Gecə:** video lent, video yayın, aktiv video zəng. Burada da eyni stiker dili işlənir (ağ kart + qara kontur).
