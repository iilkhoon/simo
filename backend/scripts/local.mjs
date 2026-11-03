/**
 * Heç nə quraşdırmadan lokal test: PostgreSQL npm paketinin içindən (embedded-postgres) işə düşür,
 * cədvəllər yaradılır, ilk dəfə demo məlumatlar yazılır və API başlayır.
 *   node scripts/local.mjs          — başlat
 *   node scripts/local.mjs --reset  — bazanı təmizlə, demo məlumatlarla yenidən yarat
 * Baza faylları: backend/.localdb (gitignore-dadır). Port 5433 (kompüterdəki başqa PostgreSQL-ə mane olmasın).
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { lanIp } from '../../scripts/lan-ip.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, '.localdb');
const PORT = 5433;
const reset = process.argv.includes('--reset');
const win = process.platform === 'win32';

if (!existsSync(path.join(root, '.env'))) copyFileSync(path.join(root, '.env.example'), path.join(root, '.env'));

const DATABASE_URL = `postgresql://simo:simo@localhost:${PORT}/simo`;
// Pəncərə birdən bağlanıbsa PostgreSQL arxa planda qala bilər — onda yenidən başlatmırıq, elə onu işlədirik
async function alreadyRunning() {
  const c = new pg.Client({ connectionString: DATABASE_URL, connectionTimeoutMillis: 1500 });
  try { await c.connect(); await c.end(); return true; } catch { return false; }
}
const reuse = await alreadyRunning();
const db = new EmbeddedPostgres({ databaseDir: dataDir, user: 'simo', password: 'simo', port: PORT, persistent: true, onLog: () => {}, onError: () => {} });
const fresh = !existsSync(path.join(dataDir, 'PG_VERSION'));
if (!reuse) {
  if (fresh) { console.log('Verilənlər bazası ilk dəfə yaradılır...'); await db.initialise(); }
  await db.start();
  if (fresh) await db.createDatabase('simo').catch(() => {});
}
const stopDb = () => (reuse ? Promise.resolve() : db.stop().catch(() => {}));

const ip = lanIp();
const env = {
  ...process.env,
  DATABASE_URL,
  PUBLIC_URL: `http://${ip}:4000`, // yüklənən şəkillərin linki telefonda açılsın
  NPM_CONFIG_UPDATE_NOTIFIER: 'false',
};
const npx = (args, extra = {}) => spawnSync(win ? 'npx.cmd' : 'npx', args, { cwd: root, env: { ...env, ...extra }, stdio: 'inherit', shell: win });

if (reset) {
  console.log('Baza silinir...');
  const c = new pg.Client({ connectionString: DATABASE_URL });
  await c.connect();
  await c.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await c.end();
}
console.log('Cədvəllər yoxlanılır...');
if (npx(['prisma', 'migrate', 'deploy']).status !== 0) { await stopDb(); process.exit(1); }

const client = new pg.Client({ connectionString: env.DATABASE_URL });
await client.connect();
const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM "Gift"');
await client.end();
if (rows[0].n === 0) {
  console.log('Hədiyyələr, paketlər və demo profillər yazılır...');
  npx(['tsx', 'prisma/seed.ts'], { SEED_DEMO: 'true' });
}

console.log(`\n  Backend: http://${ip}:4000   (telefonda yoxlamaq: http://${ip}:4000/health)\n  Dayandırmaq: Ctrl+C\n`);
const api = spawn(win ? 'npx.cmd' : 'npx', ['tsx', 'watch', 'src/index.ts'], { cwd: root, env, stdio: 'inherit', shell: win });

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  await stopDb();
  process.exit(code);
}
process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));
api.on('exit', (c) => void shutdown(c ?? 0));
