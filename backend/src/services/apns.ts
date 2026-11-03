/**
 * Apple Push (APNs) — VoIP push birbaşa Apple-a (Expo Push VoIP dəstəkləmir).
 * Mühit: APNS_KEY (.p8 məzmunu, \n ilə), APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID (az.simo.app), APNS_PRODUCTION=true|false
 * Konfiqurasiya yoxdursa — false qaytarır və çağıran adi push-a keçir.
 */
import http2 from 'node:http2';
import crypto from 'node:crypto';
import fs from 'node:fs';

let cached: { token: string; at: number } | null = null;

function cfg() {
  // .p8 açarı: ya mətn kimi (APNS_KEY, \n ilə), ya da fayl yolu (APNS_KEY_FILE)
  const file = process.env.APNS_KEY_FILE;
  const key = file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : process.env.APNS_KEY?.replace(/\\n/g, '\n');
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundle = process.env.APNS_BUNDLE_ID ?? 'az.simo.app';
  if (!key || !keyId || !teamId) return null;
  return { key, keyId, teamId, bundle, host: process.env.APNS_PRODUCTION === 'true' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com' };
}

/** ES256 JWT (Apple 20–60 dəqiqədə bir yeniləməyi tövsiyə edir) */
function jwt(c: NonNullable<ReturnType<typeof cfg>>) {
  if (cached && Date.now() - cached.at < 40 * 60_000) return cached.token;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'ES256', kid: c.keyId })}.${b64({ iss: c.teamId, iat: Math.floor(Date.now() / 1000) })}`;
  const sig = crypto.sign('sha256', Buffer.from(unsigned), { key: c.key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  cached = { token: `${unsigned}.${sig}`, at: Date.now() };
  return cached.token;
}

export async function sendVoip(deviceToken: string, payload: Record<string, unknown>): Promise<boolean> {
  const c = cfg();
  if (!c) return false;
  return new Promise((resolve) => {
    const client = http2.connect(c.host);
    client.on('error', () => resolve(false));
    const req = client.request({
      ':method': 'POST', ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt(c)}`, 'apns-topic': `${c.bundle}.voip`, 'apns-push-type': 'voip', 'apns-priority': '10', 'apns-expiration': '0',
    });
    req.setEncoding('utf8');
    let status = 0;
    req.on('response', (h) => { status = Number(h[':status']); });
    req.on('end', () => { client.close(); resolve(status === 200); });
    req.on('error', () => { client.close(); resolve(false); });
    req.end(JSON.stringify({ aps: {}, ...payload }));
    setTimeout(() => { try { client.close(); } catch { /* */ } resolve(false); }, 8000).unref();
  });
}
