/**
 * Admin hüququnun verilməsi / alınması (yalnız serverdə, shell girişi olan şəxs).
 *   npm run admin -- grant  admin@simo.az      (e-poçt və ya qısa ID)
 *   npm run admin -- revoke admin@simo.az
 *   npm run admin -- list
 * İstehsalda ADMIN_EMAILS qeydiyyatda avtomatik admin VERMİR: e-poçt təsdiqlənmədiyi üçün
 * həmin ünvanla birinci qeydiyyatdan keçən hər kəs admin olardı.
 */
import { prisma } from '../src/db.js';

async function main() {
  const [cmd, who] = process.argv.slice(2);
  if (cmd === 'list') {
    const rows = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { shortId: true, email: true, name: true } });
    for (const r of rows) console.log(`${r.shortId}\t${r.email ?? '-'}\t${r.name}`);
    return;
  }
  if ((cmd !== 'grant' && cmd !== 'revoke') || !who) {
    console.log('İstifadə: npm run admin -- grant|revoke <email|shortId>  |  npm run admin -- list');
    process.exitCode = 1;
    return;
  }
  const where = /^\d+$/.test(who) ? { shortId: Number(who) } : { email: who.toLowerCase().trim() };
  const user = await prisma.user.findFirst({ where: { ...where, deletedAt: null } });
  if (!user) {
    console.error('İstifadəçi tapılmadı (əvvəlcə admin panelindən qeydiyyatdan keçin)');
    process.exitCode = 1;
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: cmd === 'grant' ? 'ADMIN' : 'USER' } });
  // Rol dəyişəndə köhnə sessiyalar bağlanır
  await prisma.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true, revokedAt: new Date() } });
  console.log(`${cmd === 'grant' ? 'ADMIN verildi' : 'ADMIN alındı'}: ${user.email ?? user.shortId}`);
}

main().finally(() => prisma.$disconnect());
