#!/usr/bin/env bash
# Simo ehtiyat nüsxəsi (cron hər gün 03:30 işlədir; əl ilə: sudo simo-backup).
#  - Baza: pg_dump -Fc → /var/lib/simo/backups/db/simo-YYYY-MM-DD.dump (DB_KEEP_DAYS gün),
#          bazar günləri həftəlik nüsxə weekly-YYYY-MM-DD.dump (DB_KEEP_WEEKS həftə)
#  - Fayllar: uploads, private-uploads (KYC), safety-evidence → rsync snapshot (hard link ilə, yer az tutur)
#  - İstəyə bağlı: BACKUP_RSYNC_TARGET (/etc/simo-backup.conf) — serverdən kənara köçürmə
set -euo pipefail
DATA="${SIMO_DATA:-/var/lib/simo}"
DB="${SIMO_DB:-simo}"
B="$DATA/backups"
DB_KEEP_DAYS=14
DB_KEEP_WEEKS=8
FILES_KEEP=7
BACKUP_RSYNC_TARGET=""
[ -f /etc/simo-backup.conf ] && . /etc/simo-backup.conf

TODAY="$(date +%F)"
log() { echo "[$(date '+%F %T')] $*"; }
mkdir -p "$B/db" "$B/files"
chown postgres:postgres "$B/db"
chmod 700 "$B" "$B/db" "$B/files"

# 1) Baza
DUMP="$B/db/simo-$TODAY.dump"
sudo -u postgres pg_dump -Fc --no-owner "$DB" > "$DUMP.tmp"
# Nüsxə oxuna bilirmi (boş və ya korlanmış fayl "uğurlu" sayılmasın)
chown postgres:postgres "$DUMP.tmp"
if ! sudo -u postgres pg_restore -l "$DUMP.tmp" >/dev/null 2>&1 || [ ! -s "$DUMP.tmp" ]; then
  log "XƏTA: pg_dump nüsxəsi yoxlamadan keçmədi"; rm -f "$DUMP.tmp"; exit 1
fi
mv "$DUMP.tmp" "$DUMP"
chmod 600 "$DUMP"   # sahibi postgres; root və postgres oxuyur
if [ "$(date +%u)" = "7" ]; then cp -p "$DUMP" "$B/db/weekly-$TODAY.dump"; fi
find "$B/db" -name 'simo-*.dump' -mtime +"$DB_KEEP_DAYS" -delete
find "$B/db" -name 'weekly-*.dump' -mtime +"$((DB_KEEP_WEEKS * 7))" -delete
log "Baza: $DUMP ($(du -h "$DUMP" | cut -f1))"

# 2) Fayllar — gündəlik snapshot; dəyişməyən fayllar əvvəlki snapshot-a hard link olur
SNAP="$B/files/$TODAY"
PREV="$(ls -1d "$B"/files/20* 2>/dev/null | grep -v "$TODAY" | tail -1 || true)"
mkdir -p "$SNAP"
for d in uploads private-uploads safety-evidence; do
  [ -d "$DATA/$d" ] || continue
  rsync -a --delete ${PREV:+--link-dest="$PREV/$d"} "$DATA/$d/" "$SNAP/$d/"
done
ls -1d "$B"/files/20* 2>/dev/null | head -n -"$FILES_KEEP" | xargs -r rm -rf
log "Fayllar: $SNAP"

# 3) Kənar nüsxə (konfiqurasiya edilibsə)
if [ -n "$BACKUP_RSYNC_TARGET" ]; then
  rsync -a --delete -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" "$B/" "$BACKUP_RSYNC_TARGET/" \
    && log "Kənar nüsxə: $BACKUP_RSYNC_TARGET" || { log "XƏTA: kənar nüsxə alınmadı"; exit 1; }
fi
log "Hazırdır"
