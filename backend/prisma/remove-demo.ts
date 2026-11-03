/**
 * App Store-a göndərməzdən əvvəl: demo (saxta) profilləri silir — "(demo)" adlı, @demo.simo.az e-poçtlu hesablar.
 * Serverdə: cd /opt/simo/backend && sudo -u simo npx tsx prisma/remove-demo.ts
 */
import { prisma } from '../src/db.js';

const r = await prisma.user.updateMany({
  where: { email: { endsWith: '@demo.simo.az' }, deletedAt: null },
  data: { deletedAt: new Date(), online: false, hostStatus: 'NONE', avatarUrl: null, name: 'Deleted', bio: '' },
});
await prisma.video.updateMany({ where: { user: { email: { endsWith: '@demo.simo.az' } } }, data: { status: 'REMOVED' } });
await prisma.liveRoom.updateMany({ where: { host: { email: { endsWith: '@demo.simo.az' } }, status: 'LIVE' }, data: { status: 'ENDED', endedAt: new Date() } });
console.log(`✓ ${r.count} demo hesab gizlədildi`);
await prisma.$disconnect();
