#!/usr/bin/env bash
# Simo — Ubuntu 24.04 VPS quraşdırması (təkrar işlətmək olar: kodu yeniləyir, .env və bazaya toxunmur).
#   bash setup.sh /root/simo.tgz [domen]
# Domen verilməsə API http://<IP>, sayt http://<IP>:8080 ünvanında açılır.
# Domen verilsə (DNS A qeydləri: domen, api.domen, www.domen → server IP) HTTPS avtomatik qurulur.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

ARCHIVE="${1:-/root/simo.tgz}"
DOMAIN="${2:-}"
APP=/opt/simo
DATA=/var/lib/simo
IP="$(curl -4 -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"

step() { echo; echo "==> $*"; }

step "Sistem paketləri"
apt-get update -y -q
apt-get install -y -q curl ca-certificates gnupg ufw fail2ban postgresql postgresql-contrib debian-keyring debian-archive-keyring apt-transport-https openssl

if ! command -v node >/dev/null || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 22 ]; then
  step "Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi

if ! command -v caddy >/dev/null; then
  step "Caddy (veb server + avtomatik HTTPS)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y -q && apt-get install -y -q caddy
fi

step "Təhlükəsizlik divarı (22, 80, 443, 8080)"
ufw allow 22/tcp >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 8080/tcp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null 2>&1 || true

id simo >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin simo
mkdir -p "$DATA/uploads" "$DATA/backups"

step "Verilənlər bazası (PostgreSQL)"
systemctl enable --now postgresql >/dev/null
if [ ! -f "$DATA/db.pass" ]; then openssl rand -hex 24 > "$DATA/db.pass"; chmod 600 "$DATA/db.pass"; fi
DBPASS="$(cat "$DATA/db.pass")"
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_roles WHERE rolname='simo'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE ROLE simo LOGIN PASSWORD '$DBPASS'"
sudo -u postgres psql -qc "ALTER ROLE simo PASSWORD '$DBPASS'" >/dev/null
sudo -u postgres psql -qtAc "SELECT 1 FROM pg_database WHERE datname='simo'" | grep -q 1 \
  || sudo -u postgres psql -qc "CREATE DATABASE simo OWNER simo ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8' TEMPLATE template0"

step "Kod: $ARCHIVE → $APP"
mkdir -p "$APP"
TMP="$(mktemp -d)"
tar -xzf "$ARCHIVE" -C "$TMP"
# .env və yüklənmiş fayllar saxlanılır, qalan hər şey təzələnir
rm -rf "$APP/backend.new" && cp -a "$TMP/backend" "$APP/backend.new"
[ -f "$APP/backend/.env" ] && cp "$APP/backend/.env" "$APP/backend.new/.env"
rm -rf "$APP/backend" && mv "$APP/backend.new" "$APP/backend"
rm -rf "$APP/web" && cp -a "$TMP/web" "$APP/web"
cp -a "$TMP/deploy" "$APP/" 2>/dev/null || true
rm -rf "$TMP"

if [ -n "$DOMAIN" ]; then API_URL="https://api.$DOMAIN"; WEB_URL="https://$DOMAIN"; else API_URL="http://$IP"; WEB_URL="http://$IP:8080"; fi

ENV="$APP/backend/.env"
if [ ! -f "$ENV" ]; then
  step "backend/.env yaradılır"
  cp "$APP/backend/.env.example" "$ENV"
  sed -i "s#^JWT_SECRET=.*#JWT_SECRET=$(openssl rand -hex 48)#" "$ENV"
  # Test mərhələsi: OTP kodu tətbiqdə görünür, test ödənişi aktivdir. Real istifadəçidən əvvəl false edin!
  sed -i "s#^DEV_MODE=.*#DEV_MODE=true#" "$ENV"
fi
sed -i 's/\r$//' "$ENV"  # Windows-dan gələn CRLF sətir sonları
set_env() { if grep -q "^$1=" "$ENV"; then sed -i "s#^$1=.*#$1=$2#" "$ENV"; else echo "$1=$2" >> "$ENV"; fi; }
set_env NODE_ENV production
set_env PORT 4000
set_env DATABASE_URL "postgresql://simo:$DBPASS@127.0.0.1:5432/simo"
set_env UPLOAD_DIR "$DATA/uploads"
set_env PUBLIC_URL "$API_URL"
set_env WEB_URL "$WEB_URL"
# Apple App Review hesabı (+994 990000009): sabit 6 rəqəmli kod bir dəfə yaradılır
grep -q "^REVIEW_OTP_CODE=[0-9]\{6\}$" "$ENV" || set_env REVIEW_OTP_CODE "$(shuf -i 100000-999999 -n 1)"
grep -q "^REVIEW_PHONES=" "$ENV" || set_env REVIEW_PHONES "+994990000009"
chmod 600 "$ENV"

step "Backend paketləri və build"
cd "$APP/backend"
npm ci --no-fund --no-audit
npm run build
npx prisma migrate deploy
if [ "$(sudo -u postgres psql -d simo -qtAc 'SELECT COUNT(*) FROM "Gift"')" = "0" ]; then
  step "Hədiyyələr, paketlər və demo profillər"
  NODE_ENV=development SEED_DEMO=true npx tsx prisma/seed.ts
fi
chown -R simo:simo "$APP" "$DATA"
chmod 600 "$DATA/db.pass"

step "Xidmət (avtomatik başlama və çökəndə yenidən açılma)"
cat > /etc/systemd/system/simo-api.service <<UNIT
[Unit]
Description=Simo API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
User=simo
WorkingDirectory=$APP/backend
ExecStart=/usr/bin/node dist/src/index.js
Restart=always
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable simo-api >/dev/null
systemctl restart simo-api

step "Sayt və admin paneli"
cat > "$APP/web/config.js" <<JS
window.SIMO_API = '$API_URL';
JS

if [ -n "$DOMAIN" ]; then
cat > /etc/caddy/Caddyfile <<CADDY
api.$DOMAIN {
  encode gzip
  reverse_proxy 127.0.0.1:4000
}
$DOMAIN, www.$DOMAIN {
  encode gzip
  root * $APP/web
  file_server
}
CADDY
else
cat > /etc/caddy/Caddyfile <<CADDY
:80 {
  encode gzip
  reverse_proxy 127.0.0.1:4000
}
:8080 {
  encode gzip
  root * $APP/web
  file_server
}
CADDY
fi
systemctl reload caddy || systemctl restart caddy

step "Gündəlik baza ehtiyat nüsxəsi (03:30, son 14 gün)"
cat > /etc/cron.d/simo-backup <<CRON
30 3 * * * postgres pg_dump -Fc simo > $DATA/backups/simo-\$(date +\%F).dump && find $DATA/backups -name '*.dump' -mtime +14 -delete
CRON
chown postgres:postgres "$DATA/backups"

step "Yoxlama"
for i in $(seq 1 20); do curl -fsS http://127.0.0.1:4000/health >/dev/null 2>&1 && break; sleep 1; done
if curl -fsS http://127.0.0.1:4000/health >/dev/null 2>&1; then
  echo
  echo "=============================================="
  echo "  HAZIRDIR"
  echo "  API:   $API_URL/health"
  echo "  Sayt:  $WEB_URL"
  echo "  Admin: $WEB_URL/admin.html"
  echo "  Loglar: journalctl -u simo-api -f"
  echo "  App Review: +994 990000009 / kod: $(grep '^REVIEW_OTP_CODE=' "$ENV" | cut -d= -f2)"
  echo "=============================================="
else
  echo "[XƏTA] API açılmadı. Son loglar:"
  journalctl -u simo-api -n 40 --no-pager
  exit 1
fi
