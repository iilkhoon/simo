import { buildApp, markShuttingDown } from './app.js';
import { config, configProblems } from './config.js';
import { prisma } from './db.js';
import { createSocketServer } from './realtime/socket.js';
import { startCallBilling, stopCallBilling } from './services/calls.js';
import { sweepStaleLives } from './services/live.js';
import { smartTick } from './services/smart.js';
import { publishScheduled } from './routes/videos.js';
import { expireOrders } from './routes/services.js';
import { cleanupAuthTables } from './routes/auth.js';
import { ensureTesterUsers } from './services/tester.js';
import { startHostStats } from './services/hostStats.js';
import { campaignTick } from './services/growth.js';
import { captureError, flushMonitoring, initMonitoring } from './lib/monitoring.js';

async function main() {
  // İstehsalda təhlükəli parametrlərlə (DEV_MODE, test nömrələri, zəif JWT sirri) server başlamır
  const problems = configProblems();
  for (const w of problems.warn) console.warn(`[CONFIG] XƏBƏRDARLIQ: ${w}`);
  if (problems.fatal.length) {
    for (const f of problems.fatal) console.error(`[CONFIG] XƏTA: ${f}`);
    console.error('[CONFIG] Server istehsal rejimində bu parametrlərlə başlamır. Test mərhələsidirsə: SIMO_STAGING=true (docs/PRODUCTION.md)');
    process.exit(78); // EX_CONFIG — systemd bunu "konfiqurasiya xətası" kimi göstərir
  }
  if (config.staging) console.warn('[CONFIG] SIMO_STAGING=true — TEST REJİMİ. Real istifadəçilərdən əvvəl söndürün!');

  const app = await buildApp();
  await initMonitoring({ info: (m) => app.log.info(m), warn: (m) => app.log.warn(m) });
  await app.ready();
  const io = createSocketServer(app.server);
  // Server yenidən başladıqda hamı offline sayılır
  await prisma.user.updateMany({ where: { online: true }, data: { online: false } });
  // Test hesabları (TEST_PHONES): hazır profil + limitsiz balans
  await ensureTesterUsers().catch((e) => app.log.error({ err: e }, 'Test hesabları'));
  startCallBilling();
  // Host onlayn vaxtı (hədəflər, agentlik paneli)
  startHostStats();
  const timers = [
    setInterval(() => void sweepStaleLives().catch((e) => app.log.error({ err: e }, 'sweepStaleLives')), 60_000),
    // Planlanmış postlar (hər dəqiqə) və ağıllı bildirişlər/təkliflər (hər 15 dəqiqə)
    setInterval(() => void publishScheduled().catch((e) => app.log.error({ err: e }, 'publishScheduled')), 60_000),
    setInterval(() => void smartTick().catch((e) => app.log.error({ err: e }, 'smartTick')), 15 * 60_000),
    setInterval(() => void expireOrders().catch((e) => app.log.error({ err: e }, 'expireOrders')), 30 * 60_000),
    // Köhnə OTP kodları və vaxtı keçmiş refresh tokenlər
    // Mövsümi kampaniya başlayanda bir dəfəlik push (hər 5 dəqiqə)
    setInterval(() => void campaignTick().catch((e) => app.log.error({ err: e }, 'campaignTick')), 5 * 60_000),
    setInterval(() => void cleanupAuthTables().catch((e) => app.log.error({ err: e }, 'cleanupAuthTables')), 60 * 60_000),
  ];
  timers.forEach((t) => t.unref());

  /**
   * Zərif dayanma (systemd stop/restart, deploy): yeni sorğu qəbul edilmir, /ready 503 olur,
   * açıq sorğular bitirilir, soketlər bağlanır (müştərilər avtomatik yenidən qoşulur), baza hovuzu bağlanır.
   * Aktiv zənglər bazada qalır — yeni proses billing tick ilə davam etdirir.
   */
  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    markShuttingDown();
    app.log.info({ signal }, 'Server dayanır…');
    const force = setTimeout(() => {
      app.log.error('Zərif dayanma 15 saniyədə bitmədi — məcburi çıxış');
      process.exit(1);
    }, 15_000);
    force.unref();
    try {
      timers.forEach((t) => clearInterval(t));
      stopCallBilling();
      io.close();
      await app.close();
      await prisma.$disconnect();
      await flushMonitoring();
    } catch (e) {
      app.log.error({ err: e }, 'Dayanma xətası');
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    // Tutulmamış Promise xətası prosesi öldürmür, amma mütləq log-a və monitorinqə düşür
    app.log.error({ err: reason }, 'unhandledRejection');
    captureError(reason, { kind: 'unhandledRejection' });
  });
  process.on('uncaughtException', (e) => {
    // Vəziyyət naməlumdur — log yaz və çıx; systemd (Restart=always) prosesi yenidən başladır
    app.log.fatal({ err: e }, 'uncaughtException');
    captureError(e, { kind: 'uncaughtException' });
    void flushMonitoring().finally(() => process.exit(1));
  });

  await app.listen({ port: config.port, host: config.host });
  console.log(`Simo API: ${config.publicUrl} (${config.host}:${config.port})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
