# Dizayn araşdırması: kateqoriyanın ən yaxşı tətbiqləri

Tarix: 2026-11. Məqsəd: Simo-nu "top-tier" tanışlıq və canlı yayım tətbiqləri səviyyəsinə çatdırmaq üçün konkret vizual qaydalar toplamaq.

Mənbə qeydi: bu sessiyada tinder.com, hinge.co və oxşar saytlar şəbəkə siyasəti ilə bloklanmışdı. Ona görə nəticələr veb-axtarış nəticələrinə, üçüncü tərəf brend-analizlərinə və tətbiqlərin ictimai ekran görüntülərindən məlum olan, müşahidə edilə bilən naxışlara əsaslanır. Rəqəmlər (radius, ölçü) ictimai ekran görüntülərindən təxminidir, rəsmi spesifikasiya deyil.

## Tətbiqlər üzrə müşahidələr

### Tinder
- Brend qradiyenti: çəhrayıdan mərcan-narıncıya (#FD267A → #FF7854; üçüncü tərəf mənbələri #FE3C72 da göstərir). Qradiyent yalnız brend anlarında işlədilir: loqo, "It's a Match", Gold/Platinum promo. Adi interfeys ağ və ya qaradır.
- Kəşf kartı tam ekrana yaxın foto kartıdır, radiusu təxminən 8–12 pt. Ad və yaş iri ağ şriftlə şəklin üstündə yazılır, altda qara "scrim" var. Kartın üstündə şəkil indikatoru (seqmentlər) olur.
- Hərəkət dili: kart barmağın ardınca gedir və fırlanır. "LIKE/NOPE" möhürləri şəffaflıqla görünür. "It's a Match" ekranında iki avatar, böyük skript başlıq və qradiyent fon var.
- Premium səhifələr (Gold/Platinum): tünd fon, qızılı və gümüşü qradiyentlər, üstünlüklər ikon + bir sətir kimi siyahılanır.

### Bumble
- Sarı (#F7C948 ətrafı) yalnız aksent və brend səthlərindədir. Fon ağ və ya açıq bozdur. Kartların radiusu böyükdür (təxminən 16–24), kölgə yoxdur və ya çox yumşaqdır.
- Bir az yumru, mehriban şrift (Bumble Sans) və yumşaq bozlarla aydın iyerarxiya qurulur.
- Boş vəziyyətlərdə illüstrasiya, qısa başlıq, bir cümlə və bir düymə olur.

### Hinge
- UI əsasən qara-ağdır, rəng yalnız xüsusi funksiyalarda görünür (Hinge brend səhifəsi).
- Şrift funksional və mehribandır: iri x-hündürlüyü və aşağı kontrast var.
- Profil şaquli lentdir: foto, sonra "prompt" kartı, sonra ikonlu fakt həbləri (boy, iş, təhsil, vərdişlər), yenə foto. Fakt həblərində emoji yox, xətti ikon işlədilir. Simo-nun profil faktları bu prinsiplə yenidən quruldu.
- Boş vəziyyət mətnləri isti və həvəsləndirici tonda yazılır. Boş ekran "nə etməli"ni izah edir.

### Badoo / Azar
- Azar: 1:1 video uyğunlaşma əsas axındır. Axtarış ekranı tünd fonda pulsasiya edən halqalar və öz avatarından ibarətdir. Uyğunluq kartı tam ekran fotodur, aşağıda "Keç" və "Zəng" düymələri var. Simo-nun `match.tsx` ekranı bu naxışa uyğundur.
- Badoo: bənövşəyi-mavi brend, böyük dairəvi hərəkət düymələri, "Kim bəyənib" şəbəkəsi bulanıq şəkillərlə VIP-ə yönləndirir. Simo-da `LockedGrid` var, ona qızılı premium banner əlavə edildi.

### Bigo Live / Tango / Chamet (canlı yayım + hədiyyə iqtisadiyyatı)
- Pul kisəsi və yükləmə səhifəsi: yuxarıda tünd və ya qradiyentli balans kartı, iri rəqəm və sikkə ikonu. Altda 2–3 sütunlu paket şəbəkəsi var, "Populyar" və "+bonus" etiketləri, ilk yükləmə bonusu üçün parlaq banner. Yol: Me → Wallet → Recharge.
- VIP/Noble səhifələri səviyyələri bürünc, bənövşəyi və qızılı-qara kimi fərqli qradiyentli kartlarla göstərir. Kartlarda tac, parıltı və işıq zolağı effektləri olur. Hər səviyyənin üstünlükləri ikonlu həblərlə verilir.
- Liderlər: 1–3-cü yer podiumda qradiyent fonda, ortada tacla göstərilir. Sonrakılar sıra nömrəsi, avatar, ad və xal ilə siyahıdadır. Gün/Həftə/Ay tabları var.
- Mikro-hərəkətlər: hədiyyə animasiyaları, giriş effektləri, düymələrdə sıçrayış və canlı nöqtələrin pulsasiyası.

### TikTok (lent və naviqasiya)
- Tam ekran video lent, tünd interfeys, sağda şaquli ikon sütunu.
- Tab paneli minimaldır. Aktiv ikon dolu, passiv ikon konturludur. Mərkəzdə "+" yaratma düyməsi var.
- Spinner az işlədilir. Lent skeleton və ya keçid animasiyası ilə yüklənir.

## Ümumi naxışlar → Simo üçün qaydalar

| Sahə | Naxış | Simo-da tətbiq |
|---|---|---|
| Rəng | Neytral fon, brend rəngi və qradiyent yalnız "dəyər" anlarında | `gradients` tokenləri: nar, gold, diamond, night, violet, bronze, celebrate. Adi kartlar ağ qalır. |
| Tipoqrafiya | 1 display + 1 mətn şrifti, iri və sıx başlıqlar | Geologica (display) + Onest (mətn). Başlıqlarda mənfi hərf aralığı. |
| Radius | Foto kartlar 16–28, həblər tam yumru | `radius` tokenləri dəyişmədi: 10/14/20/26/34/pill |
| Boşluq | 4 pt şəbəkə, ekran kənarı 16 | `spacing` tokenləri (xxs…huge) |
| Kölgə | Yumşaq və aşağı istiqamətli. Premium kartlarda rəngli kölgə | `elev()` və kartın qradiyent rəngi ilə kölgə |
| İkonlar | Bir ailə: dolu = aktiv, kontur = passiv | Yalnız Ionicons. Çatışmayan qliflər (tac, sikkə) eyni üslubda SVG ilə əl ilə çəkildi. |
| Boş vəziyyət | İllüstrasiya + başlıq + izah + bir düymə | Əl ilə çəkilmiş 18 qradiyentli SVG spot illüstrasiya (`Illustration.tsx`) |
| Yükləmə | Spinner yox, skeleton (shimmer) | `Skeleton`, `SkeletonList`, `SkeletonGrid`. Tam ekranda nəbz vuran loqo. |
| Hərəkət | Yaylı toxunuş (0.96), pilləli giriş (40–60 ms), bayram anlarında sıçrayış | `Pressable3`, `Appear`, `PopIn`, `Pulse`, `Shine`, `MatchCelebration` |
| Emoji | Əsas interfeysdə emoji yoxdur, yalnız istifadəçi məzmununda və maraq çiplərində olur | Tablarda, başlıqlarda, profil faktlarında emoji ikonlarla əvəz olundu |

## Mənbələr
- Tinder brend rəngləri (üçüncü tərəf): https://www.oppadu.com/tools/design-systems-site/brand/tinder.html, https://colorfyi.com/tr/brands/tinder, https://brandpalettes.com/tinder-color-codes/, https://www.colorpickercode.com/color-palette/brand-palettes/tinder/
- Tinder loqo yenilənməsi (qradiyent alov): https://www.dezeen.com/2017/08/16/tinder-replaces-wordmark-with-pink-orange-flame-logo-graphic-design/amp/, https://creativebloq.com/news/tinder-reveals-new-app-logo
- Tinder brend təlimatı analizi: https://madegooddesigns.com/tinder-brand-guidelines/
- Hinge brend resursları və dəyərləri: https://hinge.co/brand-resources, https://hinge.co/brand
- Hinge brend təlimatı analizi (boş vəziyyət tonu): https://madegooddesigns.com/hinge-brand-guidelines/
- Hinge dizayn tənqidi: https://medium.com/storm-brain-the-best-app-critiquing-team-ever/design-critique-6-hinge-ios-de1c85a61070, https://medium.com/8px-magazine/digital-dating-and-design-analysis-of-hinge-7bf2e9faa087
- Bumble dizayn analizi: https://gregorydocherty.substack.com/p/shag-marry-kill-part-2-bumble-design
- Hinge dizayn analizi: https://gregorydocherty.substack.com/p/shag-marry-kill-part-1-hinge-design
- Bumble mobil dizayn dərsləri: https://buttondown.com/gram/archive/rethinking-mobile-design-lessons-from-the-bumble
- Bigo Live pul kisəsi və VIP axını: https://eneba.com/support/article/how-to-top-up-bigo-live, https://news.bittopup.com/news/bigo-live-diamonds-top-up-2025-save-60-unlock-vip-levels-fast
- Azar (App Store təsviri, 1:1 video uyğunlaşma): https://apps.apple.com/th/app/id972558973
- Skeleton və qavranılan sürət: https://dev.to/sachinkasana/i-replaced-my-spinner-with-a-skeleton-and-my-ux-skyrocketed-4o9f, https://hackernoon.com/how-to-improve-perceived-performance-in-mobile-apps-5ed3268
- Rebrend ilə dizayn sistemi fərqi (hərəkət vəziyyət dəyişikliyini izah etməlidir): https://www.designsystemscollective.com/a-rebrand-is-not-a-design-system-update-09aa3472b079
- Glassmorphism (şüşə səthlər): https://www.designstudiouiux.com/blog/what-is-glassmorphism-ui-trend
