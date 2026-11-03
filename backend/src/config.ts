import 'dotenv/config';
import fs from 'node:fs';

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
    // In-App Purchase .p8 açarı: mətn (APPLE_PRIVATE_KEY) və ya fayl yolu (APPLE_PRIVATE_KEY_FILE)
    privateKey: (process.env.APPLE_PRIVATE_KEY_FILE && fs.existsSync(process.env.APPLE_PRIVATE_KEY_FILE)
      ? fs.readFileSync(process.env.APPLE_PRIVATE_KEY_FILE, 'utf8')
      : env('APPLE_PRIVATE_KEY', '')).replace(/\\n/g, '\n'),
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
  /**
   * Test hesabları: sabit kodla giriş (SMS getmir), limitsiz promo Nar, reytinqdən kənar, alış demo.
   * TEST_PHONES=+994990000001,+994990000002  TEST_OTP_CODE=111111
   * DEV_MODE=true olduqda bu standart dəyərlər avtomatik işləyir; istehsalda env ilə verilməlidir.
   */
  testPhones: env('TEST_PHONES', process.env.DEV_MODE === 'true' || !isProd ? '+994990000001,+994990000002' : '').split(',').map((s) => s.trim()).filter(Boolean),
  testOtpCode: env('TEST_OTP_CODE', process.env.DEV_MODE === 'true' || !isProd ? '111111' : ''),
  adminEmails: env('ADMIN_EMAILS', '').split(',').map((s) => s.trim()).filter(Boolean),
};
