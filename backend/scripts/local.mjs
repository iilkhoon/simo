/**
 * Heç nə quraşdırmadan lokal test: PostgreSQL npm paketinin içindən (embedded-postgres) işə düşür,
 * cədvəllər yaradılır, ilk dəfə demo məlumatlar yazılır və API başlayır.
 *   node scripts/local.mjs          — başlat
 *   node scripts/local.mjs --reset  — bazanı təmizlə, demo məlumatlarla yenidən yarat
 * Baza faylları: backend/.localdb (yol qeyri-latın hərf/boşluq daşıyırsa C:\SimoDB). Port 5433.
 * Xəta olsa hər şey backend/xeta.log faylına yazılır.
 */
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = path.join(root, 'xeta.log');
let PORT = 5433;
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
// Cari baza qovluğu (ilişib qalan köhnə qovluqdan təzəsinə keçəndə dəyişir)
const pointer = path.join(root, '.localdb.json');
let dbName = '.localdb';
try { dbName = JSON.parse(readFileSync(pointer, 'utf8')).dir || dbName; } catch { /* */ }
let dataDir = path.join(root, dbName);
if (win && !asciiSafe(dataDir)) {
  const base = 'C:\\SimoDB';
  mkdirSync(path.join(base, 'tmp'), { recursive: true });
  dataDir = path.join(base, dbName === '.localdb' ? 'db' : dbName);
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

const dbUrl = (port, name = 'simo') => `postgresql://simo:simo@127.0.0.1:${port}/${name}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function canConnect(port, tries = 1) {
  for (let i = 0; i < tries; i++) {
    const c = new pg.Client({ connectionString: dbUrl(port, 'postgres'), connectionTimeoutMillis: 3000 });
    try { await c.connect(); await c.end(); return true; } catch (e) { log(`qoşulma cəhdi ${port}: ${e.message}`); }
    if (i < tries - 1) await sleep(1000);
  }
  return false;
}
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
function killTree(pid) {
  if (win) spawnSync('taskkill', ['/PID', String(pid), '/F', '/T'], { stdio: 'ignore' });
  else try { process.kill(pid, 'SIGKILL'); } catch { /* */ }
}

// Əvvəlki açılışdan qalan PostgreSQL (pəncərə birdən bağlananda arxa planda qalır)
let reuse = false;
const pidFile = path.join(dataDir, 'postmaster.pid');
if (existsSync(pidFile)) {
  const [pidLine, , , portLine] = readFileSync(pidFile, 'utf8').split(/\r?\n/);
  const oldPid = Number(pidLine), oldPort = Number(portLine) || PORT;
  if (oldPid && alive(oldPid)) {
    if (await canConnect(oldPort, 10)) { PORT = oldPort; reuse = true; say('Verilənlər bazası artıq işləyir — ondan istifadə olunur.'); }
    else {
      say('Əvvəlki açılışdan ilişib qalmış verilənlər bazası bağlanır...');
      killTree(oldPid);
      for (let i = 0; i < 10 && alive(oldPid); i++) await sleep(500);
    }
  }
  if (!reuse && existsSync(pidFile)) rmSync(pidFile, { force: true });
}
/**
 * Bizim PostgreSQL-in bütün qalıq prosesləri (Windows-da postmaster öləndə köməkçi postgres.exe-lər
 * qala bilir və paylaşılan yaddaşı tutur: "pre-existing shared memory block is still in use").
 * Yalnız bu layihənin node_modules-dakı postgres-ə aid proseslər bağlanır.
 */
async function killLeftovers() {
  if (win) {
    const ps = `$ErrorActionPreference='SilentlyContinue'
$own = @(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 5433 -and $_.LocalPort -le 5463 } | ForEach-Object { @{ port = $_.LocalPort; pid = $_.OwningProcess } })
$procs = @(Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | ForEach-Object { @{ pid = $_.ProcessId; ppid = $_.ParentProcessId; path = "$($_.ExecutablePath)"; cmd = "$($_.CommandLine)" } })
@{ ports = $own; procs = $procs } | ConvertTo-Json -Depth 4 -Compress`;
    const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')], { encoding: 'utf8' });
    log(`postgres prosesləri (PowerShell status ${r.status}): ${r.stdout ?? ''} ${r.stderr ?? ''}`);
    let info = { ports: [], procs: [] };
    try { info = JSON.parse(r.stdout || '{}'); } catch { /* */ }
    const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
    const procs = arr(info.procs);
    const lc = (x) => String(x ?? '').toLowerCase();
    // Bizimkilər: embedded-postgres binarı (istənilən simo qovluğundan) və ya bizim baza qovluğumuz
    const ours = procs.filter((p) => lc(p.path).includes('@embedded-postgres') || lc(p.cmd).includes(lc(dataDir)) || lc(p.path).includes(lc(root)));
    const ids = new Set(ours.map((p) => p.pid));
    // Onların uşaq prosesləri (Windows-da --forkchild)
    for (const p of procs) if (ids.has(p.ppid)) ids.add(p.pid);
    for (const id of ids) spawnSync('taskkill', ['/PID', String(id), '/F', '/T'], { stdio: 'ignore' });
    log(`bağlanan postgres prosesləri: ${[...ids].join(', ') || 'yoxdur'} · portlar: ${JSON.stringify(arr(info.ports))}`);
    if (ids.size) { say(`Əvvəlki açılışdan qalan ${ids.size} baza prosesi bağlandı.`); await sleep(2000); }
  } else {
    const r = spawnSync('pkill', ['-9', '-f', `@embedded-postgres.*postgres -D ${dataDir}`]);
    if (r.status === 0) await sleep(1500);
  }
  if (existsSync(path.join(dataDir, 'postmaster.pid'))) rmSync(path.join(dataDir, 'postmaster.pid'), { force: true });
}
if (!reuse) await killLeftovers();

// Port başqa proqramdadırsa (məs. kompüterdə ayrıca PostgreSQL) — növbəti boş portu götürürük
if (!reuse) {
  const first = PORT;
  while (await portBusy(PORT)) {
    if (++PORT > first + 30) fail('Verilənlər bazası üçün boş port tapılmadı.', 'Kompüteri yenidən başladın.');
  }
  if (PORT !== first) say(`${first} portu məşğuldur — baza ${PORT} portunda açılır.`);
}
let DATABASE_URL = dbUrl(PORT);
const makeDb = () => new EmbeddedPostgres({
  databaseDir: dataDir, user: 'simo', password: 'simo', port: PORT, persistent: true,
  // Windows sistemin kodlaşdırmasını (WIN1252 və s.) götürür — "ə, ş" yazıla bilmir. Həmişə UTF-8.
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (m) => { pgLog.push(m); if (pgLog.length > 300) pgLog.shift(); },
  onError: (m) => { pgLog.push(`[ERR] ${m instanceof Error ? m.message : m}\n`); },
});
let db = makeDb();
let fresh = !existsSync(path.join(dataDir, 'PG_VERSION'));
if (!reuse) {
  try {
    if (fresh) { say('Verilənlər bazası ilk dəfə yaradılır...'); await db.initialise(); }
    say('Verilənlər bazası açılır...');
    try {
      await db.start();
    } catch (e) {
      // Qalıq proses yaddaşı hələ buraxmayıbsa — bir dəfə təmizləyib yenidən cəhd
      if (!/shared memory|postmaster\.pid|lock file/i.test(pgLog.join(''))) throw e;
      say('Köhnə baza prosesləri təmizlənir və yenidən cəhd edilir...');
      await killLeftovers();
      await sleep(2000);
      pgLog.length = 0;
      try {
        await db.start();
      } catch (e2) {
        if (!/shared memory|postmaster\.pid|lock file/i.test(pgLog.join(''))) throw e2;
        // Köhnə qovluq Windows tərəfindən hələ də tutulub — test bazasını təzə qovluqda qururuq
        const next = `.localdb-${Date.now().toString(36)}`;
        say(`Köhnə baza qovluğu kilidlidir — təzə baza yaradılır (${next}). Demo məlumatlar yenidən yazılacaq.`);
        dataDir = path.join(path.dirname(dataDir), next);
        writeFileSync(pointer, JSON.stringify({ dir: next }));
        while (await portBusy(PORT)) PORT++;
        DATABASE_URL = dbUrl(PORT);
        pgLog.length = 0;
        db = makeDb();
        fresh = true;
        await db.initialise();
        await db.start();
      }
    }
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
  if (!(await canConnect(PORT, 5))) fail('Verilənlər bazasına qoşulmaq olmadı.', 'Kompüteri yenidən başladın və təkrar cəhd edin.');
}
const stopDb = () => (reuse ? Promise.resolve() : db.stop().catch(() => {}));

/** "simo" bazası UTF-8 olmalıdır; köhnə (səhv kodlaşdırmalı) baza varsa yenidən yaradılır */
async function ensureDatabase() {
  const admin = new pg.Client({ connectionString: dbUrl(PORT, 'postgres') });
  await admin.connect();
  try {
    const { rows } = await admin.query("SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = 'simo'");
    if (rows[0] && rows[0].enc !== 'UTF8') {
      say(`Köhnə baza səhv kodlaşdırmadadır (${rows[0].enc}) — UTF-8 ilə yenidən yaradılır...`);
      await admin.query('DROP DATABASE simo WITH (FORCE)');
    }
    if (!rows[0] || rows[0].enc !== 'UTF8') {
      await admin.query("CREATE DATABASE simo OWNER simo ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0");
    }
  } finally { await admin.end(); }
  // Yarımçıq qalmış miqrasiya (əvvəlki uğursuz cəhd) — test bazasıdır, təmizləyib yenidən qururuq
  const c = new pg.Client({ connectionString: DATABASE_URL });
  await c.connect();
  try {
    const { rows } = await c.query("SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS has");
    if (rows[0].has) {
      const f = await c.query('SELECT COUNT(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL');
      if (f.rows[0].n > 0) {
        say('Əvvəlki uğursuz cəhddən yarımçıq cədvəllər qalıb — təmizlənir...');
        await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      }
    }
  } finally { await c.end(); }
}

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
  await ensureDatabase();
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
