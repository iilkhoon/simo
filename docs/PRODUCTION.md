# Simo — canlıya çıxış (go-live) yoxlama siyahısı

Bu sənəd real istifadəçilər və real pul qəbul etməzdən əvvəl görülməli olan hər şeyi sadalayır.
Hər bənddə qeyd var:

- ✅ **KODDA HAZIRDIR** — proqramda edilib, sizdən heç nə tələb olunmur (yalnız bilmək üçün).
- 🟧 **SİZ ETMƏLİSİNİZ** — açar, hesab, mağaza ayarı və ya serverdə əmr.

---

## 0. Ən vacib 10 addım (qısa)

| # | Nə | Kim |
|---|----|-----|
| 1 | `DEV_MODE=false` yazın və `SIMO_STAGING` sətrini silin | 🟧 siz |
| 2 | SMS provayderi: `SMS_API_URL`, `SMS_API_TOKEN` | 🟧 siz |
| 3 | Agora: `AGORA_APP_ID` + **`AGORA_APP_CERTIFICATE`** (sertifikatsız hər kəs kanala qoşula bilər) | 🟧 siz |
| 4 | Apple / Google / Epoint ödəniş açarları | 🟧 siz |
| 5 | Domen + HTTPS (`SERVER-QURASDIR.bat` domenlə) | 🟧 siz |
| 6 | Admin hesabı: `npm run admin -- grant <email>` | 🟧 siz |
| 7 | Ehtiyat nüsxəni serverdən kənara köçürmək (`/etc/simo-backup.conf`) | 🟧 siz |
| 8 | Bərpanı bir dəfə sınamaq (`simo-restore`) | 🟧 siz |
| 9 | Monitorinq: uptime yoxlaması `/ready` + istəyə görə Sentry | 🟧 siz |
| 10 | Test hesablarını (990000001/2) söndürmək | ✅ `DEV_MODE=false` olanda avtomatik |

Server **istehsal rejimində (NODE_ENV=production) təhlükəli parametrlərlə başlamır** ✅:
zəif `JWT_SECRET`, `DEV_MODE=true`, aktiv test nömrələri, asan test kodu (111111), SMS provayderi yoxdur,
`APPLE_ALLOW_SANDBOX=true` — bunlardan biri varsa, server `journalctl -u simo-api` loguna səbəbi yazır və dayanır
(çıxış kodu 78, systemd onu sonsuz yenidən başlatmır).
Test mərhələsində bu bilərəkdən açıq saxlanılır: `.env`-də `SIMO_STAGING=true` (setup.sh köhnə quraşdırmada bunu özü yazır).
**Zəif JWT_SECRET staging-də də keçmir.**

---

## 1. Canlıya keçid — `.env` (serverdə `/opt/simo/backend/.env`)

```bash
nano /opt/simo/backend/.env      # dəyişin, sonra:
systemctl restart simo-api && journalctl -u simo-api -n 30 --no-pager
```

### Məcburi

| Dəyişən | Dəyər | Qeyd |
|---|---|---|
| `NODE_ENV` | `production` | ✅ setup.sh yazır |
| `DEV_MODE` | `false` | 🟧 OTP kodu cavabda qaytarılmasın, test ödənişi bağlansın |
| `SIMO_STAGING` | **sətri silin** | 🟧 test rejiminin "icazəsi" |
| `JWT_SECRET` | 96 simvol təsadüfi | ✅ setup.sh yaradır (`openssl rand -hex 48`); zəifdirsə yenisini yazır |
| `PUBLIC_URL` | `https://api.<domen>` | ✅ setup.sh (domenlə) |
| `WEB_URL` | `https://<domen>` | ✅ setup.sh — həm də CORS üçün icazəli mənbədir |
| `SMS_API_URL`, `SMS_API_TOKEN`, `SMS_SENDER` | provayderdən | 🟧 LSIM / Azercell Business / Twilio. `services/sms.ts` `{to,text,sender}` JSON göndərir — provayderin formatı fərqlidirsə bizə yazın |
| `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | console.agora.io | 🟧 layihədə **"Secured mode: APP ID + Token"** seçin |
| `REVIEW_OTP_CODE` | 6 rəqəm | ✅ setup.sh yaradır (asan kodlar qadağandır) |

### Ödənişlər (real pul)

| Dəyişən | Haradan | Qeyd |
|---|---|---|
| `APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY(_FILE)` | App Store Connect → Users and Access → Integrations → In-App Purchase | 🟧 `APPLE-ACARLAR.bat` yazır |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Play Console → API access → service account (Financial data icazəsi) | 🟧 bir sətirdə JSON |
| `EPOINT_PUBLIC_KEY`, `EPOINT_PRIVATE_KEY` | Epoint merchant kabineti | 🟧 kabinetdə callback ünvanı: `https://api.<domen>/payments/epoint/callback` |
| `APPLE_ALLOW_SANDBOX` | `false` | ✅ standart. TestFlight/sandbox alışları yalnız test və App Review hesablarına coin yazır |

### İstəyə bağlı (standartlar yaxşıdır)

| Dəyişən | Standart | Nə üçün |
|---|---|---|
| `OTP_ALLOWED_PREFIXES` | `+994` | Yalnız AZ nömrələrinə SMS (SMS pumping qarşısı). Rusiya/Türkiyə lazımdırsa: `+994,+7,+90` |
| `OTP_PER_PHONE_HOUR` / `_DAY` | 5 / 10 | Bir nömrəyə SMS limiti |
| `OTP_GLOBAL_HOUR` | 500 | Bütün sistem üzrə saatlıq SMS "qəza açarı" — hücumda SMS balansı boşalmasın. Böyüdükcə artırın |
| `CORS_ORIGINS` | boş (= `WEB_URL`) | Başqa veb ünvandan API çağırılırsa əlavə edin |
| `MEDIA_HOSTS` | boş | CDN (məs. `cdn.simo.az`) istifadə etsəniz — media linkləri yalnız öz serverdən və bu hostlardan qəbul olunur |
| `ACCESS_TTL_SEC` | 86400 | Giriş tokeni müddəti |
| `DB_POOL_MAX` | 20 | Baza bağlantı hovuzu |
| `LOG_LEVEL` | `info` | `warn` — daha az log |
| `LOG_REQUESTS` | `false` | `true` — hər sorğu log-lanır (adətən yalnız yavaş və 5xx) |
| `SENTRY_DSN` | boş | Bax §6 |

---

## 2. Mağaza ayarları 🟧

**App Store Connect**
- In-App Purchase məhsulları (consumable): `az.simo.coins.*` — `docs/ECONOMY.md` qiymətləri ilə.
- **App Store Server Notifications V2** URL: hazırda backend-də qəbul edən endpoint YOXDUR (geri qaytarılan — refund — alışlar avtomatik silinmir). Refund-ları həftədə bir App Store Connect → Sales → Refunds-dan yoxlayın; çox olarsa bizə bildirin, endpoint əlavə edək.
- App Review hesabı: `+994 990000009`, kod `.env`-dəki `REVIEW_OTP_CODE` (bax `docs/APP_REVIEW.md`).

**Google Play Console**
- Eyni ID-li məhsullar; **License testing** siyahısına yalnız öz test hesablarınızı yazın (onların alışı pulsuzdur — backend onlara yalnız test hesabında coin yazır).
- **Voided Purchases** (geri qaytarılan alışlar) — eyni qeyd: avtomatik emal yoxdur, əl ilə yoxlayın.

**Epoint** — callback URL (yuxarıda), test rejimindən real rejimə keçid.

---

## 3. Server və şəbəkə

| Nə | Vəziyyət |
|---|---|
| Firewall (ufw): yalnız 22 (limitli), 80, 443 (+8080 domensiz) | ✅ setup.sh |
| API yalnız `127.0.0.1:4000`-də — xaricdən birbaşa çatmaq olmur, yalnız Caddy vasitəsilə | ✅ `HOST=127.0.0.1` |
| Real IP: yalnız yerli proksiyə etibar (`TRUST_PROXY=loopback`) — IP saxtalaşdırıb rate-limit keçmək olmur | ✅ |
| PostgreSQL xaricə açıq deyil, parol təsadüfi (`/var/lib/simo/db.pass`) | ✅ |
| HTTPS (Let's Encrypt, avtomatik yenilənir), HSTS, təhlükəsizlik başlıqları | ✅ Caddy — **domen lazımdır** 🟧 |
| fail2ban (SSH), avtomatik təhlükəsizlik yeniləmələri (unattended-upgrades) | ✅ |
| systemd: çökəndə 3 s sonra yenidən başlayır, root olmadan, fayl sistemi yalnız `/var/lib/simo`-ya yazıla bilən | ✅ |
| Zərif dayanma: SIGTERM → yeni sorğu yoxdur, açıq sorğular bitir, baza bağlanır (≤15 s) | ✅ |
| Yeniləmə: yeni versiya ayrıca qurulur, köhnəsi işləyir; keçid ~2-3 s (Caddy bu müddətdə sorğuları gözlədir); `/ready` uğursuzdursa **avtomatik geri qayıdış** | ✅ setup.sh |
| Miqrasiyalar hər yeniləmədə (`prisma migrate deploy`) | ✅ |
| Log həcmi: journald ≤1 GB / 30 gün, Caddy access log 50 MB × 10 | ✅ |
| **SSH parolla girişi bağlamaq** (yalnız açar) | 🟧 tövsiyə: `ssh-copy-id root@IP`, sonra `/etc/ssh/sshd_config`: `PasswordAuthentication no` |
| VPS provayderində snapshot/backup xidməti | 🟧 tövsiyə (aylıq bir neçə AZN) |

---

## 4. Ehtiyat nüsxələr və bərpa

✅ **Avtomatik** (cron, hər gün 03:30, `/usr/local/bin/simo-backup`, log: `/var/log/simo-backup.log`):
- Baza: `pg_dump` → `/var/lib/simo/backups/db/simo-YYYY-MM-DD.dump` — son 14 gün + bazar günləri 8 həftəlik. Hər nüsxə `pg_restore -l` ilə yoxlanır.
- Fayllar: `uploads` (şəkil/video), `private-uploads` (KYC sənədləri), `safety-evidence` → `/var/lib/simo/backups/files/<tarix>/` — 7 gündəlik snapshot (dəyişməyən fayllar hard link, yer az tutur).

🟧 **Siz etməlisiniz — serverdən kənar nüsxə** (server silinərsə nüsxələr də gedir!):
```bash
nano /etc/simo-backup.conf
# BACKUP_RSYNC_TARGET="backup@<ikinci-server>:/backups/simo"
ssh-keygen -t ed25519 && ssh-copy-id backup@<ikinci-server>   # parolsuz giriş
simo-backup                                                    # sınaq
```
Alternativ: Hetzner Storage Box / Backblaze B2 (rclone) — bizə yazın, skriptə əlavə edək.

🟧 **Bərpanı bir dəfə sınayın** (canlıya çıxmazdan əvvəl, test serverində):
```bash
ls -lt /var/lib/simo/backups/db/
simo-restore /var/lib/simo/backups/db/simo-2026-11-07.dump               # yalnız baza
simo-restore /var/lib/simo/backups/db/simo-2026-11-07.dump --files 2026-11-07   # baza + fayllar
```
`simo-restore` əvvəlcə cari bazanın nüsxəsini (`pre-restore-*.dump`) alır, API-ni dayandırır, bazanı bərpa edir, miqrasiyaları işlədir və API-ni başladır.

---

## 5. Hesablar və admin

- ✅ İstehsalda `ADMIN_EMAILS` qeydiyyatda **avtomatik admin vermir** (e-poçt təsdiqlənmir — həmin ünvanla birinci qeydiyyatdan keçən hər kəs admin olardı).
- 🟧 Admin vermək (serverdə):
  ```bash
  cd /opt/simo/backend
  sudo -u simo npm run admin -- grant admin@simo.az     # əvvəlcə admin.html-də həmin e-poçtla qeydiyyatdan keçin
  sudo -u simo npm run admin -- list
  sudo -u simo npm run admin -- revoke kohne@simo.az
  ```
- 🟧 Admin parolu: ən azı 14 simvol, yalnız öz kompüterinizdə.
- ✅ Blok (admin paneli / moderasiya) → bütün sessiyalar və soket bağlantıları dərhal kəsilir.

---

## 6. Monitorinq və xəbərdarlıq 🟧

1. **Uptime yoxlaması** (pulsuz: UptimeRobot, Better Stack): `https://api.<domen>/ready` hər 1 dəqiqə — 200 deyilsə SMS/e-poçt.
   - `/health` — proses işləyir; `/ready` — baza da əlçatandır (yeniləmə zamanı qısa 503 normaldır).
2. **Sentry** (istəyə bağlı): sentry.io-da Node layihəsi → DSN:
   ```bash
   cd /opt/simo/backend && npm i @sentry/node
   echo "SENTRY_DSN=https://...@sentry.io/..." >> .env && systemctl restart simo-api
   ```
   Qeyd: `npm i` növbəti `SERVER-QURASDIR.bat`-da itir — daimi etmək üçün bizə deyin, `package.json`-a əlavə edək. Telefon nömrələri və tokenlər Sentry-yə göndərilmir ✅.
3. **Loglar**: `journalctl -u simo-api -f` — strukturlaşdırılmış JSON, hər cavabda `X-Request-Id`; istifadəçi xəta bildirəndə həmin ID ilə axtarın: `journalctl -u simo-api | grep <id>`. Tokenlər, parollar, telefon nömrələri log-da maskalanır ✅.
4. Diqqət ediləcək log hadisələri: `otp_global_cap` (SMS hücumu), `refresh_reuse` (oğurlanmış token), `epoint_bad_signature` / `epoint_amount_mismatch` (ödəniş saxtakarlığı cəhdi), `Yavaş sorğu`.
5. Disk: `df -h` — 80%-dən çox olarsa video yükləmələri üçün disk artırın (və ya S3/R2-yə keçid).

---

## 7. Hadisə (incident) zamanı

| Vəziyyət | Nə etmək |
|---|---|
| API açılmır | `systemctl status simo-api`, `journalctl -u simo-api -n 100 --no-pager`. Çıxış kodu 78 = konfiqurasiya xətası (log səbəbi yazır) |
| Yeniləmədən sonra problem | setup.sh avtomatik geri qayıdır. Əl ilə: `systemctl stop simo-api; mv /opt/simo/backend /opt/simo/backend.bad; mv /opt/simo/backend.prev /opt/simo/backend; systemctl start simo-api` |
| Baza zədələnib / səhvən silinib | §4 — `simo-restore` |
| SMS hücumu (log: `otp_global_cap`, provayder balansı sürətlə azalır) | `.env`: `OTP_GLOBAL_HOUR=50`, restart; provayder kabinetində limit; hücum edən IP-ləri `ufw deny from <IP>` |
| Hesab oğurlanıb | admin panelində bloklayın (bütün sessiyalar bağlanır), sonra blokdan çıxarın — istifadəçi yenidən OTP ilə daxil olur |
| `JWT_SECRET` sızıb | yenisini yazın (`openssl rand -hex 48`), restart — hamı yenidən daxil olur; refresh tokenləri silin: `sudo -u postgres psql simo -c 'DELETE FROM "RefreshToken"'` |
| Ödəniş açarı (Epoint/Apple/Google) sızıb | provayder kabinetində dərhal yeni açar, `.env`-ə yazın, restart; `admin.html → Ödənişlər` siyahısını yoxlayın |
| Azyaşlı / qanunsuz məzmun | `docs/legal` və moderasiya paneli (`/admin/safety`) — sübutlar `safety-evidence`-də saxlanılır |
| Server tamamilə itib | yeni VPS → `SERVER-QURASDIR.bat` → kənar nüsxədən `.dump` və faylları `/var/lib/simo/backups`-a köçürün → `simo-restore ... --files <tarix>`. `.env` və `db.pass` nüsxəsini ayrıca, təhlükəsiz yerdə saxlayın 🟧 |

---

## 8. Kodda edilən təhlükəsizlik tədbirləri ✅ (məlumat üçün)

- **Giriş / tokenlər**: JWT yalnız HS256 (alg=none qəbul olunmur), rol hər sorğuda bazadan oxunur; refresh token rotasiyası, təkrar istifadə aşkarlananda bütün sessiyalar bağlanır; bloklanmış/silinmiş hesab REST və soketə girə bilmir.
- **OTP**: 6 rəqəm, 5 dəqiqə, kod başına 5 cəhd, nömrəyə 60 s-də 1 / saatda 5 / gündə 10, IP üzrə limit, sistem üzrə saatlıq limit, yalnız +994; kod bir dəfə istifadə olunur.
- **IDOR**: söhbət, mesaj, zəng, ödəniş statusu, sifariş, KYC faylları — yalnız iştirakçı/sahib (testlərlə yoxlanılır: `backend/test/security.ts`).
- **Fayllar**: tip faylın məzmununa görə yoxlanır (saxta Content-Type rədd), şəkillər yenidən kodlanır — **EXIF/GPS silinir**; KYC sənədləri ictimai `/files/` altında deyil, yalnız sahibinə və adminə (15 dəqiqəlik imzalı link); yol keçidi (`../`) bağlıdır; media linkləri yalnız `http(s)` (admin panelində `javascript:` XSS bağlı).
- **Ödənişlər**: Epoint imzası yoxlanır (açar yoxdursa callback rədd), məbləğ və valyuta məcburi uyğun, idempotent (təkrar bildiriş ikinci dəfə coin yazmır), başqa provayderin sifarişi qəbul olunmur; Apple/Google qəbzi istifadəçiyə bağlı olmalıdır (appAccountToken / obfuscatedAccountId), sandbox/test alışları yalnız test hesablarına.
- **Real-time (Socket.IO)**: qoşulanda blok yoxlanır, "typing" yalnız söhbət iştirakçısına, host tərəfindən bloklanan yayına girə bilmir, şərh/like yalnız otaqdakılar, hadisə həcmi və tezliyi limitli.
- **Zənglər**: bitmiş zəngə yeni Agora tokeni verilmir; hədiyyə başqasının zənginə/yayınına "yazıla" bilmir.
- **Başlıqlar**: helmet (HSTS, nosniff, frame), CORS istehsalda yalnız `WEB_URL`/`CORS_ORIGINS`.
- **Robustluq**: zərif dayanma, `unhandledRejection` log/Sentry, baza hovuzu + `statement_timeout`, `/health` + `/ready`, sorğu ID-ləri, PII maskalanması.

## 9. Hələ açıq qalan məsələlər (bilinən məhdudiyyətlər) 🟧

1. **Video metadata (məkan)**: şəkillərdən EXIF silinir, amma videolardan (iPhone `.mov` GPS saxlaya bilər) silinmir — `ffmpeg` lazımdır. Tövsiyə: serverə `apt install ffmpeg` və bizə deyin, yükləmədə `-map_metadata -1` əlavə edək.
2. **Refund bildirişləri** (Apple/Google/Epoint) avtomatik emal olunmur — §2.
3. **Ödənişli (private) postlar**: fayl linkləri təxmin edilə bilməz (təsadüfi ad), amma abunəçi linki başqasına göndərsə açılır. Tam qoruma üçün imzalı linklər/CDN tokenləri lazımdır.
4. **Agora tokeni** 1 saat etibarlıdır — yayından çıxarılan qonaq tokenin müddəti bitənə qədər kanala qayıda bilər (Agora tərəfdə "kick" safety modulunda var).
5. **Bir server**: rate-limit sayğacları və canlı otaq vəziyyəti yaddaşdadır. 2+ server üçün Redis lazımdır.
6. **HEIC şəkillər** server tərəfindən qəbul olunmur (tətbiq JPEG göndərir — problem yoxdur; köhnə veb müştərilər üçün qeyd).
