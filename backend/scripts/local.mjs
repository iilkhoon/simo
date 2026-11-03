/**
 * Heç nə quraşdırmadan lokal test: PostgreSQL npm paketinin içindən (embedded-postgres) işə düşür,
 * cədvəllər yaradılır, ilk dəfə demo məlumatlar yazılır və API başlayır.
 *   node scripts/local.mjs          — başlat
 *   node scripts/local.mjs --reset  — bazanı təmizlə, demo məlumatlarla yenidən yarat
 * Baza faylları: backend/.localdb (yol qeyri-latın hərf/boşluq daşıyırsa C:\SimoDB). Port 5433.
 * Xəta olsa hər şey backend/xeta.log faylına yazılır.
 */
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = path.join(root, 'xeta.log');
const PORT = 5433;
const API_PORT = 4000;
const reset = process.argv.includes('--reset');
const win = process.platform === 'win32';
const pgLog = [];

writeFileSync(LOG, `Simo lokal başlatma ${new Date().toISOString()}\nOS: ${os.platform()} ${os.release()} ${os.arch()} · Node ${process.version}\nQovluq: ${root}\n\n`);
const log = (m) => { try { appendFileSync(LOG, m + '\n'); } catch { /* */ } };
const say = (m) => { console.log(m); log(m); };

function fail(title, hint, err) {
  console.error(`\n[XƏTA] ${title}`);
  if (hint) console.error(`\n${hint}`);
  log(`\n[XƏTA] ${title}\n${hint ?? ''}\n${err ? (err.stack ?? String(err)) : ''}\n--- PostgreSQL log ---\n${pgLog.join('')}`);
  if (pgLog.length) console.error(`\nPostgreSQL:\n${pgLog.join('').split('\n').slice(-15).join('\n')}`);
  if (err) console.error(`\n${err.message ?? err}`);
  console.error(`\nƏtraflı: ${LOG}  (bu faylı göndərin)`);
  process.exit(1);
}

const portBusy = (port) => new Promise((res) => {
  const s = net.connect({ port, host: '127.0.0.1' });
  s.once('connect', () => { s.destroy(); res(true); });
  s.once('error', () => res(false));
  s.setTimeout(1000, () => { s.destroy(); res(false); });
});

// Windows-da PostgreSQL qeyri-latın hərfli (ə, ş, ı...) və ya boşluqlu yollarda çökə bilir
const asciiSafe = (p) => /^[\x21-\x7e]+$/.test(p);
let dataDir = path.join(root, '.localdb');
if (win && !asciiSafe(dataDir)) {
  const base = 'C:\\SimoDB';
  mkdirSync(path.join(base, 'tmp'), { recursive: true });
  dataDir = path.join(base, 'db');
  process.env.TEMP = process.env.TMP = path.join(base, 'tmp');
  say(`Qovluq yolunda xüsusi hərf/boşluq var — baza ${dataDir} qovluğunda saxlanılır.`);
}

if (!existsSync(path.join(root, '.env'))) copyFileSync(path.join(root, '.env.example'), path.join(root, '.env'));

if (await portBusy(API_PORT)) {
  const ok = await fetch(`http://127.0.0.1:${API_PORT}/health`).then((r) => r.ok).catch(() => false);
  if (ok && !reset) { say('Backend artıq işləyir (başqa pəncərədə). Yenidən başlatmaq lazım deyil.'); process.exit(0); }
  fail(`${API_PORT} portu başqa proqram tərəfindən tutulub.`, ok ? 'Əvvəlcə açıq "Simo Backend" pəncərəsini bağlayın.' : 'Kompüteri yenidən başladın və ya 4000 portunu işlədən proqramı bağlayın.');
}

const { lanIp } = await import('../../scripts/lan-ip.mjs');
let EmbeddedPostgres, pg;
try {
  EmbeddedPostgres = (await import('embedded-postgres')).default;
  pg = (await import('pg')).default;
} catch (e) {
  fail('Paketlər tam yüklənməyib.', 'backend\\node_modules qovluğunu silib BASLAT.bat-ı yenidən işlədin.', e);
}

// PostgreSQL proqramı bu kompüterdə işləyə bilirmi? (Visual C++ runtime yoxdursa Windows onu açmır)
if (win) {
  let bin;
  try { bin = await import(`@embedded-postgres/windows-${os.arch()}`); } catch (e) {
    fail(`Bu prosessor (${os.arch()}) üçün PostgreSQL yoxdur.`, 'Portativ x64 Node ilə işlədin: .tools qovluğunu silin və BASLAT.bat-ı yenidən açın.', e);
  }
  const check = () => spawnSync(bin.postgres, ['-V'], { encoding: 'utf8' });
  let r = check();
  log(`postgres -V → status ${r.status} ${r.stdout ?? ''} ${r.stderr ?? ''} ${r.error ?? ''}`);
  if (r.status !== 0) {
    say('PostgreSQL üçün Microsoft Visual C++ komponenti çatışmır — avtomatik quraşdırılır (Windows icazə soruşacaq, "Bəli" deyin)...');
    const exe = path.join(os.tmpdir(), 'vc_redist.x64.exe');
    const dl = spawnSync('powershell', ['-NoProfile', '-Command', `$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile '${exe}'`], { stdio: 'inherit' });
    if (dl.status === 0) spawnSync('powershell', ['-NoProfile', '-Command', `Start-Process -FilePath '${exe}' -ArgumentList '/install','/quiet','/norestart' -Verb RunAs -Wait`], { stdio: 'inherit' });
    r = check();
    if (r.status !== 0) fail('PostgreSQL bu kompüterdə açılmır.', 'Bu linkdən Visual C++ paketini quraşdırın: https://aka.ms/vs/17/release/vc_redist.x64.exe və BASLAT.bat-ı yenidən açın.', r.error ?? new Error(`status ${r.status}`));
  }
}

const DATABASE_URL = `postgresql://simo:simo@127.0.0.1:${PORT}/simo`;
// Pəncərə birdən bağlanıbsa PostgreSQL arxa planda qala bilər — onda onu işlədirik
async function canConnect() {
  const c = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 2000 });
  try { await c.connect(); await c.end(); return true; } catch { return false; }
}
const reuse = await canConnect();
const db = new EmbeddedPostgres({
  databaseDir: dataDir, user: 'simo', password: 'simo', port: PORT, persistent: true,
  onLog: (m) => { pgLog.push(m); if (pgLog.length > 300) pgLog.shift(); },
  onError: (m) => { pgLog.push(`[ERR] ${m instanceof Error ? m.message : m}\n`); },
});
const fresh = !existsSync(path.join(dataDir, 'PG_VERSION'));
if (!reuse) {
  if (await portBusy(PORT)) fail(`${PORT} portu başqa proqram tərəfindən tutulub.`, 'Kompüteri yenidən başladın.');
  try {
    if (fresh) { say('Verilənlər bazası ilk dəfə yaradılır...'); await db.initialise(); }
    say('Verilənlər bazası açılır...');
    await db.start();
    if (fresh) await db.createDatabase('simo').catch(() => {});
  } catch (e) {
    const out = pgLog.join('');
    const hint = /administrative permissions|administrator/i.test(out)
      ? 'BASLAT.bat-ı "Run as administrator" ilə YOX, adi iki kliklə açın.'
      : /lock file|postmaster\.pid|already in use/i.test(out)
        ? 'Kompüteri yenidən başladın və təkrar cəhd edin.'
        : fresh
          ? `Baza yaradıla bilmədi. "${dataDir}" qovluğunu silib yenidən cəhd edin.`
          : 'DB-SIFIRLA.bat ilə bazanı yenidən yaradın.';
    fail('Verilənlər bazası (PostgreSQL) açılmadı.', hint, e ?? new Error('postgres prosesi dayandı'));
  }
  if (!(await canConnect())) fail('Verilənlər bazasına qoşulmaq olmadı.', 'Kompüteri yenidən başladın və təkrar cəhd edin.');
}
const stopDb = () => (reuse ? Promise.resolve() : db.stop().catch(() => {}));

const ip = lanIp();
const env = {
  ...process.env,
  DATABASE_URL,
  PUBLIC_URL: `http://${ip}:${API_PORT}`, // yüklənən şəkillərin linki telefonda açılsın
  NPM_CONFIG_UPDATE_NOTIFIER: 'false',
};
const npx = (args, extra = {}) => {
  const r = spawnSync(win ? 'npx.cmd' : 'npx', args, { cwd: root, env: { ...env, ...extra }, encoding: 'utf8', shell: win });
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  log(`$ npx ${args.join(' ')} → ${r.status}\n${r.stdout ?? ''}${r.stderr ?? ''}${r.error ?? ''}`);
  return r;
};

try {
  if (reset) {
    say('Baza təmizlənir...');
    const c = new pg.Client({ connectionString: DATABASE_URL });
    await c.connect();
    await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await c.end();
  }
  say('Cədvəllər yoxlanılır...');
  if (npx(['prisma', 'migrate', 'deploy']).status !== 0) { await stopDb(); fail('Cədvəllər yaradıla bilmədi (prisma migrate).', 'DB-SIFIRLA.bat ilə yenidən cəhd edin.'); }
  if (npx(['prisma', 'generate']).status !== 0) { await stopDb(); fail('Prisma client yaradıla bilmədi.', 'backend\\node_modules qovluğunu silib BASLAT.bat-ı yenidən açın.'); }

  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM "Gift"');
  await client.end();
  if (rows[0].n === 0) {
    say('Hədiyyələr, paketlər və demo profillər yazılır...');
    if (npx(['tsx', 'prisma/seed.ts'], { SEED_DEMO: 'true' }).status !== 0) say('[XƏBƏRDARLIQ] Demo məlumatlar yazılmadı — xeta.log-a baxın.');
  }
} catch (e) {
  await stopDb();
  fail('Baza hazırlanarkən xəta.', 'DB-SIFIRLA.bat ilə yenidən cəhd edin.', e);
}

say(`\n  Backend işləyir: http://${ip}:${API_PORT}\n  Telefonun brauzerində yoxlamaq: http://${ip}:${API_PORT}/health\n  Bu pəncərəni bağlamayın. Dayandırmaq: Ctrl+C\n`);
const api = spawn(win ? 'npx.cmd' : 'npx', ['tsx', 'watch', 'src/index.ts'], { cwd: root, env, stdio: ['inherit', 'inherit', 'pipe'], shell: win });
api.stderr.on('data', (d) => { process.stderr.write(d); log(String(d)); });

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  await stopDb();
  if (code) console.error(`\nAPI xəta ilə dayandı. Ətraflı: ${LOG}`);
  process.exit(code);
}
process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));
api.on('exit', (c) => void shutdown(c ?? 0));
