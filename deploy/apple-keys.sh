#!/usr/bin/env bash
# Apple açarlarını serverə yazır (APPLE-ACARLAR.bat çağırır).
#   bash apple-keys.sh <apns.p8|-> <APNS_KEY_ID> <TEAM_ID> <iap.p8|-> <IAP_KEY_ID> <ISSUER_ID>
set -euo pipefail
ENV=/opt/simo/backend/.env
KEYS=/opt/simo/keys
mkdir -p "$KEYS"
python3 - "$ENV" "$KEYS" "$@" <<'PY'
import os, re, shutil, sys
env, keys, apns, apns_id, team, iap, iap_id, issuer = sys.argv[1:9]
lines = [l for l in open(env).read().replace('\r', '').split('\n') if l.strip()]
def put(k, v):
    global lines
    row = f'{k}={v}'
    for i, l in enumerate(lines):
        if l.startswith(k + '='):
            lines[i] = row; return
    lines.append(row)
def load(src, dst):
    shutil.move(src, dst); os.chmod(dst, 0o600)
    return open(dst).read().strip().replace('\n', '\\n')
if apns not in ('', '-') and os.path.exists(apns):
    txt = load(apns, f'{keys}/apns.p8')
    put('APNS_KEY', txt); put('APNS_KEY_FILE', f'{keys}/apns.p8')
    put('APNS_KEY_ID', apns_id); put('APNS_TEAM_ID', team)
    put('APNS_BUNDLE_ID', 'az.simo.app')
    put('APNS_PRODUCTION', 'true')  # TestFlight və App Store istehsal APNs-dən istifadə edir
    print(f'✓ APNs açarı yazıldı (Key ID {apns_id}, Team {team})')
if iap not in ('', '-') and os.path.exists(iap):
    txt = load(iap, f'{keys}/iap.p8')
    put('APPLE_PRIVATE_KEY', txt); put('APPLE_PRIVATE_KEY_FILE', f'{keys}/iap.p8')
    put('APPLE_KEY_ID', iap_id); put('APPLE_ISSUER_ID', issuer)
    put('APPLE_BUNDLE_ID', 'az.simo.app')
    print(f'✓ In-App Purchase açarı yazıldı (Key ID {iap_id})')
open(env, 'w').write('\n'.join(lines).rstrip('\n') + '\n')
PY
chown -R simo:simo "$KEYS" "$ENV"; chmod 700 "$KEYS"; chmod 600 "$ENV"
systemctl restart simo-api
sleep 3
systemctl is-active --quiet simo-api && echo "✓ Backend yenidən başladı" || { journalctl -u simo-api -n 30 --no-pager; exit 1; }
grep -E '^(APNS_KEY_ID|APNS_TEAM_ID|APNS_PRODUCTION|APPLE_KEY_ID|APPLE_ISSUER_ID)=' "$ENV"
