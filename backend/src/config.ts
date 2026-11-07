import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env ${name}`);
  return v;
}

/** Boş dəyər (KEY=) da "təyin olunmayıb" sayılır — yollar və ünvanlar üçün (boş yol = cari qovluq olardı) */
function envNonEmpty(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v.trim() === '' ? fallback : v;
}

const isProd = process.env.NODE_ENV === 'production';
const list = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
const num = (name: string, fallback: number) => {
  const n = Number(process.env[name] ?? fallback);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  isProd,
  port: Number(env('PORT', '4000')),
  /** Dinləmə ünvanı. VPS-də 127.0.0.1 (yalnız Caddy vasitəsilə), Docker-də 0.0.0.0 */
  host: envNonEmpty('HOST', '0.0.0.0'),
  /**
   * Hansı proksiyə etibar edilir (X-Forwarded-For → real IP, rate-limit üçün vacibdir).
   * Standart: yalnız eyni maşındakı proksi (Caddy). Docker / bulud LB üçün: TRUST_PROXY=true və ya IP/CIDR siyahısı.
   */
  trustProxy: ((v: string): boolean | string => (v === 'true' ? true : v === 'false' ? false : v))(envNonEmpty('TRUST_PROXY', 'loopback')),
  /** Brauzerdən API-yə icazə verilən mənbələr (vergüllə). Boşdursa: istehsalda yalnız WEB_URL, inkişafda hamısı */
  corsOrigins: list(env('CORS_ORIGINS', '')),
  /** pino log səviyyəsi */
  logLevel: envNonEmpty('LOG_LEVEL', isProd ? 'info' : 'warn'),
  /** İstəyə bağlı: Sentry DSN (paket quraşdırılıbsa istifadə olunur, yoxdursa sadəcə log) */
  sentryDsn: env('SENTRY_DSN', ''),
  /**
   * Staging: NODE_ENV=production, amma test rejimi (DEV_MODE, test nömrələri) şüurlu şəkildə açıqdır.
   * Real istifadəçilərdən əvvəl SİLİN — bu olmadan server dev parametrləri ilə istehsalda başlamır.
   */
  staging: env('SIMO_STAGING', 'false') === 'true',
  dbPool: {
    max: num('DB_POOL_MAX', 20),
    idleTimeoutMillis: num('DB_POOL_IDLE_MS', 30_000),
    connectionTimeoutMillis: num('DB_POOL_CONNECT_MS', 10_000),
    /** Bir sorğunun maksimum müddəti (ms) — ilişib qalan sorğu bütün hovuzu tutmasın */
    statementTimeoutMs: num('DB_STATEMENT_TIMEOUT_MS', 30_000),
  },
  publicUrl: env('PUBLIC_URL', 'http://localhost:4000'),
  webUrl: env('WEB_URL', 'http://localhost:8080'),
  databaseUrl: env('DATABASE_URL', 'postgresql://simo:simo@localhost:5432/simo'),
  jwtSecret: env('JWT_SECRET', isProd ? undefined : 'dev-secret-change-me'),
  accessTtlSec: num('ACCESS_TTL_SEC', 60 * 60 * 24),
  refreshTtlSec: num('REFRESH_TTL_SEC', 60 * 60 * 24 * 90),
  uploadDir: envNonEmpty('UPLOAD_DIR', './uploads'),
  /** Şəxsi fayllar (KYC sənədləri): /files/ altında DEYİL, yalnız imzalı müvəqqəti link ilə açılır */
  privateUploadDir: path.resolve(envNonEmpty('PRIVATE_UPLOAD_DIR', path.join(envNonEmpty('UPLOAD_DIR', './uploads'), '..', 'private-uploads'))),
  /** İstifadəçinin göndərdiyi media linkləri üçün əlavə icazəli hostlar (CDN). Öz PUBLIC_URL hostu həmişə icazəlidir */
  mediaHosts: list(env('MEDIA_HOSTS', '')),
  otp: {
    /** SMS yalnız bu prefikslərə (SMS pumping / beynəlxalq fırıldaqçılıq qarşısı). Məs.: +994 */
    allowedPrefixes: list(env('OTP_ALLOWED_PREFIXES', '+994')),
    perPhoneHour: num('OTP_PER_PHONE_HOUR', 5),
    perPhoneDay: num('OTP_PER_PHONE_DAY', 10),
    /** Bütün sistem üzrə saatlıq SMS limiti (qəza açarı — provayder hesabını boşaltmağa qarşı) */
    globalHour: num('OTP_GLOBAL_HOUR', 500),
  },
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
  /**
   * Apple App Review hesabı: sabit kodla giriş (SMS göndərilmir), amma ADİ hesabdır — alışlar real Apple (sandbox) ilə.
   * REVIEW_PHONES=+994990000009  REVIEW_OTP_CODE=<6 rəqəm>  (kod boşdursa söndürülüb). setup.sh avtomatik yaradır.
   */
  reviewPhones: env('REVIEW_PHONES', '+994990000009').split(',').map((s) => s.trim()).filter(Boolean),
  reviewOtpCode: env('REVIEW_OTP_CODE', ''),
  adminEmails: env('ADMIN_EMAILS', '').split(',').map((s) => s.trim()).filter(Boolean),
  /**
   * Apple sandbox qəbzləri (TestFlight / App Review) istehsalda yalnız test və review hesablarına coin yazır.
   * APPLE_ALLOW_SANDBOX=true — hamıya (yalnız qapalı test dövründə!).
   */
  appleAllowSandbox: env('APPLE_ALLOW_SANDBOX', 'false') === 'true',
};

const WEAK_SECRETS = new Set(['dev-secret-change-me', 'change-me-to-a-long-random-string', 'secret', 'changeme', 'simo']);
const WEAK_OTPS = new Set(['000000', '111111', '123456', '654321', '121212', '999999']);

/**
 * İstehsal konfiqurasiyasının yoxlanması. Problemlər siyahısı qaytarılır; `fatal` olanlarla server başlamır.
 * SIMO_STAGING=true yalnız test rejimi xəbərdarlıqlarını yumşaldır — zəif JWT sirri heç vaxt keçmir.
 */
export function configProblems(c: typeof config = config): { fatal: string[]; warn: string[] } {
  const fatal: string[] = [];
  const warn: string[] = [];
  if (!c.isProd) return { fatal, warn };
  const testish = (msg: string) => (c.staging ? warn : fatal).push(msg);
  if (!c.jwtSecret || c.jwtSecret.length < 32 || WEAK_SECRETS.has(c.jwtSecret)) fatal.push('JWT_SECRET zəifdir: ən azı 32 simvol təsadüfi dəyər lazımdır (openssl rand -hex 48)');
  if (c.devMode) testish('DEV_MODE=true: OTP kodu cavabda qaytarılır və pulsuz test ödənişi açıqdır');
  if (c.testPhones.length && c.testOtpCode) testish(`TEST_PHONES aktivdir (${c.testPhones.length} nömrə sabit kodla daxil olur, limitsiz promo balans)`);
  if (c.testOtpCode && WEAK_OTPS.has(c.testOtpCode) && c.testPhones.length) testish('TEST_OTP_CODE asan təxmin edilən koddur');
  if (c.reviewOtpCode && WEAK_OTPS.has(c.reviewOtpCode)) fatal.push('REVIEW_OTP_CODE asan təxmin edilən koddur');
  if (!c.sms.url) testish('SMS_API_URL boşdur: OTP SMS göndərilmir');
  if (c.appleAllowSandbox) testish('APPLE_ALLOW_SANDBOX=true: Apple sandbox (pulsuz) alışları hamıya coin yazır');
  if (!/^https:\/\//.test(c.publicUrl)) warn.push('PUBLIC_URL https deyil');
  if (c.trustProxy === true) warn.push('TRUST_PROXY=true: API yalnız proksi arxasında olmalıdır, yoxsa IP saxtalaşdırıla bilər');
  if (c.epoint.publicKey && c.epoint.privateKey.length < 16) fatal.push('EPOINT_PRIVATE_KEY çox qısadır');
  if (!c.agora.appCertificate && c.agora.appId) warn.push('AGORA_APP_CERTIFICATE yoxdur: zəng/yayın kanalları tokensizdir (hər kəs qoşula bilər)');
  return { fatal, warn };
}
