import { buildApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';
import { createSocketServer } from './realtime/socket.js';
import { startCallBilling } from './services/calls.js';
import { sweepStaleLives } from './services/live.js';

async function main() {
  const app = await buildApp();
  await app.ready();
  createSocketServer(app.server);
  // Server yenidən başladıqda hamı offline sayılır
  await prisma.user.updateMany({ where: { online: true }, data: { online: false } });
  startCallBilling();
  setInterval(() => void sweepStaleLives().catch(() => {}), 60_000).unref();
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`Simo API: ${config.publicUrl} (port ${config.port})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
