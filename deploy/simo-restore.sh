#!/usr/bin/env bash
# Simo bazasının ehtiyat nüsxədən bərpası.
#   sudo simo-restore /var/lib/simo/backups/db/simo-2026-11-07.dump
#   sudo simo-restore <fayl.dump> --files 2026-11-07    (həmçinin yüklənmiş faylları həmin günün snapshot-undan)
# Diqqət: cari baza SİLİNİR (əvvəlcə avtomatik təhlükəsizlik nüsxəsi alınır).
set -euo pipefail
DUMP="${1:-}"
FILES_DAY=""
[ "${2:-}" = "--files" ] && FILES_DAY="${3:-}"
DATA="${SIMO_DATA:-/var/lib/simo}"
DB="${SIMO_DB:-simo}"
if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
  echo "İstifadə: simo-restore <fayl.dump> [--files YYYY-MM-DD]"
  echo "Mövcud nüsxələr:"; ls -1t "$DATA/backups/db/" 2>/dev/null | head -20
  exit 1
fi
# postgres istifadəçisi faylı oxuya bilsin deyə müvəqqəti nüsxə
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
cp "$DUMP" "$WORK/restore.dump"; chown -R postgres:postgres "$WORK"; chmod 700 "$WORK"
DUMP_SRC="$DUMP"; DUMP="$WORK/restore.dump"
sudo -u postgres pg_restore -l "$DUMP" >/dev/null || { echo "Fayl oxunmur: $DUMP_SRC"; exit 1; }
read -r -p "Cari '$DB' bazası '$DUMP_SRC' ilə ƏVƏZ OLUNACAQ. Davam? (yes yazın): " ok
[ "$ok" = "yes" ] || { echo "Ləğv edildi"; exit 1; }

SAFE="$DATA/backups/db/pre-restore-$(date +%F-%H%M%S).dump"
echo "==> Cari bazanın təhlükəsizlik nüsxəsi: $SAFE"
sudo -u postgres pg_dump -Fc --no-owner "$DB" > "$SAFE"
chown postgres:postgres "$SAFE"; chmod 600 "$SAFE"

echo "==> API dayandırılır"
systemctl stop simo-api
echo "==> Baza yenidən yaradılır və bərpa olunur"
sudo -u postgres psql -qc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB' AND pid <> pg_backend_pid()" >/dev/null
sudo -u postgres dropdb "$DB"
sudo -u postgres createdb -O simo -E UTF8 -l C.UTF-8 -T template0 "$DB"
sudo -u postgres pg_restore --no-owner --role=simo -d "$DB" "$DUMP"
sudo -u postgres psql -d "$DB" -qc "GRANT ALL ON SCHEMA public TO simo; ALTER SCHEMA public OWNER TO simo;" >/dev/null || true

if [ -n "$FILES_DAY" ]; then
  SNAP="$DATA/backups/files/$FILES_DAY"
  [ -d "$SNAP" ] || { echo "Snapshot yoxdur: $SNAP"; exit 1; }
  echo "==> Fayllar bərpa olunur: $SNAP"
  for d in uploads private-uploads safety-evidence; do
    if [ -d "$SNAP/$d" ]; then rsync -a --delete "$SNAP/$d/" "$DATA/$d/"; fi
  done
  chown -R simo:simo "$DATA/uploads" "$DATA/private-uploads" "$DATA/safety-evidence"
fi

echo "==> Miqrasiyalar (nüsxə köhnədirsə sxem yenilənir) və başlatma"
cd /opt/simo/backend && npx prisma migrate deploy
systemctl start simo-api
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:4000/ready >/dev/null 2>&1 && { echo "Bərpa tamamlandı ✅"; exit 0; }; sleep 1; done
echo "API açılmadı: journalctl -u simo-api -n 50"; exit 1
