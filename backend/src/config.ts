import 'dotenv/config';

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env ${name}`);
  return v;
}

const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(env('PORT', '4000')),
  publicUrl: env('PUBLIC_URL', 'http://localhost:4000'),
  webUrl: env('WEB_URL', 'http://localhost:8080'),
  databaseUrl: env('DATABASE_URL', 'postgresql://simo:simo@localhost:5432/simo'),
  jwtSecret: env('JWT_SECRET', isProd ? undefined : 'dev-secret-change-me'),
  accessTtlSec: 60 * 60 * 24,
  refreshTtlSec: 60 * 60 * 24 * 90,
  uploadDir: env('UPLOAD_DIR', './uploads'),
  /** Dev rejimində OTP kodu cavabda qaytarılır və DEV ödənişi aktivdir */
  devMode: env('DEV_MODE', isProd ? 'false' : 'true') === 'true',
  agora: {
    appId: env('AGORA_APP_ID', ''),
    appCertificate: env('AGORA_APP_CERTIFICATE', ''),
  },
  sms: {
    url: env('SMS_API_URL', ''),
    token: env('SMS_API_TOKEN', ''),
    sender: env('SMS_SENDER', 'Simo'),
  },
  apple: {
    bundleId: env('APPLE_BUNDLE_ID', 'az.simo.app'),
    issuerId: env('APPLE_ISSUER_ID', ''),
    keyId: env('APPLE_KEY_ID', ''),
    privateKey: env('APPLE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
  },
  google: {
    packageName: env('GOOGLE_PACKAGE_NAME', 'az.simo.app'),
    serviceAccountJson: env('GOOGLE_SERVICE_ACCOUNT_JSON', ''),
  },
  epoint: {
    publicKey: env('EPOINT_PUBLIC_KEY', ''),
    privateKey: env('EPOINT_PRIVATE_KEY', ''),
    apiUrl: env('EPOINT_API_URL', 'https://epoint.az/api/1'),
  },
  adminEmails: env('ADMIN_EMAILS', '').split(',').map((s) => s.trim()).filter(Boolean),
};
