import { buildApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { createSocketServer } from './realtime/socket.js';
import { startCallBilling } from './services/calls.js';
import { sweepStaleLives } from './services/live.js';
import { smartTick } from './services/smart.js';
import { publishScheduled } from './routes/videos.js';
import { expireOrders } from './routes/services.js';
import { ensureTesterUsers } from './services/tester.js';
import { startHostStats } from './services/hostStats.js';

async function main() {
  const app = await buildApp();
  await app.ready();
  createSocketServer(app.server);
  // Server yenidən başladıqda hamı offline sayılır
  await prisma.user.updateMany({ where: { online: true }, data: { online: false } });
  // Test hesabları (TEST_PHONES): hazır profil + limitsiz balans
  await ensureTesterUsers().catch((e) => console.error('Test hesabları:', e));
  startCallBilling();
  // Host onlayn vaxtı (hədəflər, agentlik paneli)
  startHostStats();
  setInterval(() => void sweepStaleLives().catch(() => {}), 60_000).unref();
  // Planlanmış postlar (hər dəqiqə) və ağıllı bildirişlər/təkliflər (hər 15 dəqiqə)
  setInterval(() => void publishScheduled().catch(() => {}), 60_000).unref();
  setInterval(() => void smartTick().catch(() => {}), 15 * 60_000).unref();
  setInterval(() => void expireOrders().catch(() => {}), 30 * 60_000).unref();
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`Simo API: ${config.publicUrl} (port ${config.port})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
