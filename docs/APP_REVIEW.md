# App Store-a göndərmə: yoxlama siyahısı

## Kodda edilənlər (hazırdır)
| Apple qaydası | Simo-da |
|---|---|
| 1.2 UGC: şikayət | Profil, çat (mesajı basılı saxla + yuxarıda ⋯), post, video lent, şərh, hekayə, canlı yayın (🚩), canlı şərh (basılı saxla). Şikayətdən sonra bloklama təklif olunur. Admin panelində növbə. |
| 1.2 UGC: bloklama | Profildə, şikayətdən sonra. Bloklanan şəxs görmür, yaza və zəng edə bilmir. |
| 1.2 UGC: filtr | Söyüş/təhqir (AZ/RU/EN) avtomatik `***` ilə gizlədilir: mesaj, şərh, post, bio, canlı yayın adı və şərhləri. Qeyri-münasib ad qəbul olunmur. |
| 1.2 EULA | Giriş ekranında "18 yaşım tamamdır və Şərtlərlə razıyam" işarəsi olmadan davam etmək olmur. Şərtlərdə "sıfır tolerantlıq" bəndi (AZ/RU/EN). |
| 2.1 Yoxlayıcı girişi | Sabit kodlu hesab: **+994 990000009**, kod serverdə `REVIEW_OTP_CODE` (setup.sh yaradır və sonda göstərir). Adi hesabdır, alışlar Apple sandbox ilə. |
| 3.1.1 IAP | iOS-da Nar və Almaz yalnız Apple IAP ilə. Veb ödəniş linki iOS-da görünmür. |
| 5.1.1 Hesab silmə | Ayarlar → Hesabı sil. |
| İcazə mətnləri | Kamera, mikrofon, qalereya, yer: EN (əsas), AZ, RU. |
| Privacy manifest | UserDefaults, FileTimestamp, SystemBootTime, DiskSpace + toplanan məlumat növləri. İzləmə (tracking) yoxdur. |

## Sənin edəcəklərin (App Store Connect)
1. **Serveri yenilə:** `SERVER-QURASDIR.bat`. Sonda review kodu göstəriləcək.
2. **Serverdə istehsal rejimi** (TestFlight/göndərmədən əvvəl):
   ```
   sed -i "s#^DEV_MODE=.*#DEV_MODE=false#; s#^APNS_PRODUCTION=.*#APNS_PRODUCTION=true#" /opt/simo/backend/.env && systemctl restart simo-api
   ```
   DEV_MODE=false olanda test hesabları (990000001/2) bağlanır, review hesabı işləyir.
3. **Demo profilləri sil** (saxta profil = rədd səbəbi):
   ```
   cd /opt/simo/backend && sudo -u simo npx tsx prisma/remove-demo.ts
   ```
4. **Age Rating:** anketdə "Frequent/Intense Mature/Suggestive Themes" yox, amma **User-Generated Content = Yes**, **Messaging & Chat = Yes**, **Unrestricted Web Access = No** → nəticə **18+**.
5. **Pricing & Availability:** Çin (China mainland) regionunu çıxar.
6. **App Privacy:** Name, Phone Number, Email, Photos/Videos, Audio, Coarse Location, User Content, User ID, Purchase History — hamısı "Linked to user", "App Functionality", Tracking = **No**.
7. **IAP məhsulları:** hər birinə Review screenshot (pul kisəsi ekranı) əlavə et və tətbiq versiyası ilə birlikdə göndər.
8. **Review Notes** — aşağıdakı mətni olduğu kimi yapışdır (kodu öz kodunla əvəz et).

## Review Notes (EN — kopyala)
```
DEMO ACCOUNT
Phone: +994 990000009 (enter 990000009 after the +994 prefix)
Verification code: <REVIEW_OTP_CODE>
No SMS is sent to this number; the code above always works.

ABOUT SIMO
Simo is an 18+ social app for Azerbaijan: profiles, chat, short posts, live streams and 1-to-1 voice/video calls.

VIRTUAL CURRENCY (Guideline 3.1.1)
- "Nar" coins are consumable In-App Purchases and are used only inside the app: sending virtual gifts, paid messages/calls to verified hosts, VIP.
- "Almaz" (Diamond) packs are consumable IAPs used only for premium gifts. Purchased Diamonds can never be withdrawn.
- On iOS all purchases go through Apple In-App Purchase; no external payment links are shown.

CREATOR REWARDS
Verified hosts (ID + selfie verification, 18+) receive Diamond rewards when other users send them gifts. Hosts may request a payout of earned Diamonds to their bank card after KYC. This is a creator-tipping model (similar to live-streaming apps); the purchased digital goods are fully consumed when the gift is sent.

SAFETY (Guideline 1.2)
- EULA with zero tolerance for objectionable content must be accepted (18+ checkbox) before sign-up.
- Automatic profanity filter for messages, comments, posts, bios and live titles.
- Report button on profiles, chat messages (long-press), posts, comments, stories and live streams.
- Users can block abusive users. Reports are reviewed by our moderation team within 24 hours; violating content is removed and the user is banned.
- Nudity and sexual content are prohibited everywhere, including calls and live streams.

ACCOUNT DELETION: Settings → Delete account.
CALLS use CallKit/PushKit (VoIP push) only for incoming Simo calls.
```
