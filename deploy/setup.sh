#!/usr/bin/env bash
# Simo — Ubuntu 24.04 VPS quraşdırması (təkrar işlətmək olar: kodu yeniləyir, .env və bazaya toxunmur).
#   bash setup.sh /root/simo.tgz [domen]
# Domen verilməsə API http://<IP>, sayt http://<IP>:8080 ünvanında açılır.
# Domen verilsə (DNS A qeydləri: domen, api.domen, www.domen → server IP) HTTPS avtomatik qurulur.
#
# Yeniləmə axını (demək olar fasiləsiz): yeni kod ayrıca qovluqda qurulur (köhnə versiya işləməyə davam edir) →
# miqrasiyalar → qovluqlar dəyişdirilir → zərif yenidən başlatma (Caddy bu 2-3 saniyədə sorğuları gözlədir) →
# /ready yoxlaması → alınmasa avtomatik köhnə versiyaya qayıdış.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

ARCHIVE="${1:-/root/simo.tgz}"
DOMAIN="${2:-}"
APP=/opt/simo
DATA=/var/lib/simo
IP="$(curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"

step() { echo; echo "==> $*"; }

step "Sistem paketləri"
apt-get update -y -q
apt-get install -y -q curl ca-certificates gnupg ufw fail2ban postgresql postgresql-contrib debian-keyring debian-archive-keyring apt-transport-https openssl rsync unattended-upgrades logrotate

# Təhlükəsizlik yeniləmələri avtomatik
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT

if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 22 ]; then
  step "Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi

if ! command -v caddy >/dev/null; then
  step "Caddy (veb server + avtomatik HTTPS)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y -q && apt-get install -y -q caddy
fi

step "Təhlükəsizlik divarı"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw limit 22/tcp >/dev/null   # SSH: brute-force qarşısı (30 saniyədə 6+ cəhd bloklanır)
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
if [ -n "$DOMAIN" ]; then
  ufw delete allow 8080/tcp >/dev/null 2>&1 || true   # domenlə sayt 443-dədir
else
  ufw allow 8080/tcp >/dev/null
fi
# API (4000) və PostgreSQL (5432) xaricə açılmır: API yalnız 127.0.0.1-də dinləyir, Caddy vasitəsilə
ufw delete allow 4000/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null 2>&1 || true

id simo >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin simo
mkdir -p "$DATA/uploads" "$DATA/private-uploads" "$DATA/safety-evidence" "$DATA/backups/db" "$DATA/backups/files"
chmod 700 "$DATA/private-uploads" "$DATA/safety-evidence"

step "Verilənlər bazası (PostgreSQL)"
systemctl enable --now postgresql >/dev/null
if [ ! -f "$DATA/db.pass" ]; then openssl rand -hex 24 > "$DATA/db.pass"; chmod 600 "$DATA/db.pass"; fi
DBPASS="$(cat "$DATA/db.pass")"
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname='simo'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE ROLE simo LOGIN PASSWORD '$DBPASS'"
sudo -u postgres psql -qc "ALTER ROLE simo PASSWORD '$DBPASS'" >/dev/null
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_database WHERE datname='simo'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE DATABASE simo OWNER simo ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8' TEMPLATE template0"

step "Kod: $ARCHIVE → $APP/backend.new (köhnə versiya işləməyə davam edir)"
mkdir -p "$APP"
TMP="$(mktemp -d)"
tar -xzf "$ARCHIVE" -C "$TMP"
rm -rf "$APP/backend.new" && cp -a "$TMP/backend" "$APP/backend.new"
[ -f "$APP/backend/.env" ] && cp "$APP/backend/.env" "$APP/backend.new/.env"
cp -a "$TMP/deploy" "$APP/" 2>/dev/null || true
WEB_NEW="$TMP/web"

if [ -n "$DOMAIN" ]; then API_URL="https://api.$DOMAIN"; WEB_URL="https://$DOMAIN"; else API_URL="http://$IP"; WEB_URL="http://$IP:8080"; fi

ENV="$APP/backend.new/.env"
FIRST_INSTALL=0
if [ ! -f "$ENV" ]; then
  FIRST_INSTALL=1
  step "backend/.env yaradılır"
  cp "$APP/backend.new/.env.example" "$ENV"
  sed -i "s#^JWT_SECRET=.*#JWT_SECRET=$(openssl rand -hex 48)#" "$ENV"
  # Test mərhələsi: OTP kodu tətbiqdə görünür, test ödənişi aktivdir. Real istifadəçidən əvvəl: docs/PRODUCTION.md
  sed -i "s#^DEV_MODE=.*#DEV_MODE=true#" "$ENV"
fi
sed -i 's/\r$//' "$ENV"  # Windows-dan gələn CRLF sətir sonları
set_env() { if grep -q "^$1=" "$ENV"; then sed -i "s#^$1=.*#$1=$2#" "$ENV"; else echo "$1=$2" >> "$ENV"; fi; }
get_env() { grep "^$1=" "$ENV" | tail -1 | cut -d= -f2-; }
set_env NODE_ENV production
set_env PORT 4000
set_env HOST 127.0.0.1
set_env TRUST_PROXY loopback
set_env DATABASE_URL "postgresql://simo:$DBPASS@127.0.0.1:5432/simo"
set_env UPLOAD_DIR "$DATA/uploads"
set_env PRIVATE_UPLOAD_DIR "$DATA/private-uploads"
set_env SAFETY_EVIDENCE_DIR "$DATA/safety-evidence"
set_env PUBLIC_URL "$API_URL"
set_env WEB_URL "$WEB_URL"
# Zəif və ya standart JWT sirri — yenisi (bütün istifadəçilər bir dəfə yenidən daxil olur)
JWT="$(get_env JWT_SECRET)"
if [ "${#JWT}" -lt 32 ] || [ "$JWT" = "change-me-to-a-long-random-string" ]; then set_env JWT_SECRET "$(openssl rand -hex 48)"; fi
# Köhnə quraşdırma DEV_MODE=true ilə işləyirdisə — bu, şüurlu test mərhələsidir (SIMO_STAGING).
# Server istehsalda DEV_MODE ilə SIMO_STAGING olmadan başlamır. Canlıya keçid: DEV_MODE=false və SIMO_STAGING sətrini silin.
if [ "$(get_env DEV_MODE)" = "true" ] && ! grep -q "^SIMO_STAGING=" "$ENV"; then
  set_env SIMO_STAGING true
fi
# Apple App Review hesabı (+994 990000009): sabit 6 rəqəmli kod bir dəfə yaradılır (asan kodlar istisna)
RC="$(get_env REVIEW_OTP_CODE || true)"
if ! echo "$RC" | grep -qE '^[0-9]{6}$' || echo "$RC" | grep -qE '^(000000|111111|123456|654321|121212|999999)$'; then
  set_env REVIEW_OTP_CODE "$(shuf -i 200000-899999 -n 1)"
fi
grep -q "^REVIEW_PHONES=" "$ENV" || set_env REVIEW_PHONES "+994990000009"
chmod 600 "$ENV"

step "Backend paketləri və build (yeni qovluqda)"
cd "$APP/backend.new"
npm ci --no-fund --no-audit
npm run build
step "Miqrasiyalar"
# Miqrasiyalar yalnız əlavə edən (geri uyğun) olmalıdır — köhnə versiya bir neçə saniyə yeni sxemlə işləyir
npx prisma migrate deploy
if [ "$(sudo -u postgres psql -d simo -qtAc 'SELECT COUNT(*) FROM "Gift"')" = "0" ]; then
  step "Hədiyyələr və paketlər"
  # Demo profillər yalnız test mərhələsində (SIMO_STAGING=true)
  if [ "$(get_env SIMO_STAGING)" = "true" ]; then SEED_DEMO=true; else SEED_DEMO=false; fi
  NODE_ENV=development SEED_DEMO=$SEED_DEMO npx tsx prisma/seed.ts
fi

step "Xidmət (systemd: avtomatik başlama, çökəndə yenidən açılma, məhdud hüquqlar)"
cat > /etc/systemd/system/simo-api.service <<UNIT
[Unit]
Description=Simo API
After=network.target postgresql.service
Requires=postgresql.service
StartLimitIntervalSec=300
StartLimitBurst=10

[Service]
User=simo
Group=simo
WorkingDirectory=$APP/backend
ExecStart=/usr/bin/node dist/src/index.js
Restart=always
RestartSec=3
# 78 = konfiqurasiya xətası (məs. istehsalda DEV_MODE) — sonsuz yenidən başlatma əvəzinə dayanır, log aydındır
RestartPreventExitStatus=78
KillSignal=SIGTERM
TimeoutStopSec=20
LimitNOFILE=65536
Environment=NODE_OPTIONS=--max-old-space-size=1536
# Hüquqların məhdudlaşdırılması
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DATA
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable simo-api >/dev/null

step "Yeni versiyaya keçid"
rm -rf "$APP/backend.prev"
[ -d "$APP/backend" ] && mv "$APP/backend" "$APP/backend.prev"
mv "$APP/backend.new" "$APP/backend"
rm -rf "$APP/web.prev"; [ -d "$APP/web" ] && mv "$APP/web" "$APP/web.prev"
cp -a "$WEB_NEW" "$APP/web"
rm -rf "$TMP"
cat > "$APP/web/config.js" <<JS
window.SIMO_API = '$API_URL';
JS
chown -R simo:simo "$APP" "$DATA"
chown -R postgres:postgres "$DATA/backups/db"
chmod 600 "$DATA/db.pass" "$APP/backend/.env"
systemctl restart simo-api

ready() { for i in $(seq 1 30); do curl -fsS http://127.0.0.1:4000/ready >/dev/null 2>&1 && return 0; sleep 1; done; return 1; }
if ! ready; then
  echo "[XƏTA] Yeni versiya açılmadı. Son loglar:"
  journalctl -u simo-api -n 40 --no-pager || true
  if [ -d "$APP/backend.prev" ]; then
    echo "==> Köhnə versiyaya qayıdılır"
    rm -rf "$APP/backend.failed" && mv "$APP/backend" "$APP/backend.failed" && mv "$APP/backend.prev" "$APP/backend"
    [ -d "$APP/web.prev" ] && rm -rf "$APP/web" && mv "$APP/web.prev" "$APP/web"
    systemctl restart simo-api
    ready && echo "Köhnə versiya işləyir. Uğursuz versiya: $APP/backend.failed"
  fi
  exit 1
fi

step "Veb server (Caddy): HTTPS, təhlükəsizlik başlıqları, log rotasiyası"
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy 2>/dev/null || true
SEC_HEADERS='header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
    -Server
  }'
WEB_HEADERS='header {
    X-Frame-Options DENY
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
    Permissions-Policy "camera=(), microphone=(), geolocation=()"
    -Server
  }'
# lb_try_duration: API yenidən başlayanda (2-3 s) sorğular xəta əvəzinə gözləyir
API_PROXY='reverse_proxy 127.0.0.1:4000 {
    lb_try_duration 15s
    lb_try_interval 250ms
  }
  request_body {
    max_size 160MB
  }
  log {
    output file /var/log/caddy/simo-api.log {
      roll_size 50MiB
      roll_keep 10
      roll_keep_for 720h
    }
  }'
if [ -n "$DOMAIN" ]; then
cat > /etc/caddy/Caddyfile.new <<CADDY
api.$DOMAIN {
  encode gzip
  $SEC_HEADERS
  $API_PROXY
}
$DOMAIN, www.$DOMAIN {
  encode gzip
  $WEB_HEADERS
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
  root * $APP/web
  file_server
}
CADDY
else
cat > /etc/caddy/Caddyfile.new <<CADDY
:80 {
  encode gzip
  $API_PROXY
}
:8080 {
  encode gzip
  $WEB_HEADERS
  root * $APP/web
  file_server
}
CADDY
fi
# Yalnız düzgün konfiqurasiya tətbiq olunur (səhv Caddyfile saytı söndürməsin)
if caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile >/dev/null 2>&1; then
  mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
  systemctl reload caddy || systemctl restart caddy
else
  echo "[XƏBƏRDARLIQ] Yeni Caddyfile səhvdir, köhnəsi saxlanılır:"; caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile || true
fi

step "Log həcmi (journald: ən çox 1 GB, 30 gün)"
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/simo.conf <<'JRN'
[Journal]
SystemMaxUse=1G
MaxRetentionSec=30day
JRN
systemctl restart systemd-journald || true
cat > /etc/logrotate.d/simo <<'LR'
/var/log/simo-backup.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
}
LR

step "Ehtiyat nüsxələr: baza hər gün 03:30 (14 gün + 8 həftəlik), fayllar hər gün (7 snapshot)"
install -m 750 "$APP/deploy/simo-backup.sh" /usr/local/bin/simo-backup
install -m 750 "$APP/deploy/simo-restore.sh" /usr/local/bin/simo-restore
[ -f /etc/simo-backup.conf ] || cat > /etc/simo-backup.conf <<'CONF'
# Ehtiyat nüsxələrin serverdən KƏNARA köçürülməsi (məsləhətdir — server itərsə nüsxələr də itməsin):
#   BACKUP_RSYNC_TARGET="backup@10.0.0.5:/backups/simo"   (SSH açarı ilə, parolsuz)
BACKUP_RSYNC_TARGET=""
DB_KEEP_DAYS=14
DB_KEEP_WEEKS=8
FILES_KEEP=7
CONF
chmod 600 /etc/simo-backup.conf
cat > /etc/cron.d/simo-backup <<CRON
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
30 3 * * * root /usr/local/bin/simo-backup >> /var/log/simo-backup.log 2>&1
CRON

echo
echo "=============================================="
echo "  HAZIRDIR"
echo "  API:   $API_URL/health  (hazırlıq: $API_URL/ready)"
echo "  Sayt:  $WEB_URL"
echo "  Admin: $WEB_URL/admin.html   (admin hüququ: cd $APP/backend && sudo -u simo npm run admin -- grant <email>)"
echo "  Loglar: journalctl -u simo-api -f"
echo "  Ehtiyat nüsxə: simo-backup (əl ilə), bərpa: simo-restore <fayl.dump>"
echo "  App Review: +994 990000009 / kod: $(grep '^REVIEW_OTP_CODE=' "$APP/backend/.env" | cut -d= -f2)"
if grep -q "^SIMO_STAGING=true" "$APP/backend/.env"; then
  echo
  echo "  !!! TEST REJİMİ (SIMO_STAGING=true, DEV_MODE=true): OTP kodu tətbiqdə görünür, test ödənişləri açıqdır."
  echo "  !!! Real istifadəçilərdən əvvəl: docs/PRODUCTION.md — 'Canlıya keçid' bölməsi."
fi
echo "=============================================="
