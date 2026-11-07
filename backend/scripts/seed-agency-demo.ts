/**
 * YALNIZ inkişaf: agentlik panelinin ekran görüntüsü üçün demo məlumat.
 * Test Elvin (+994990000002) — agentlik sahibi, Test Aysel (+994990000001) — host, + 5 demo host.
 *   DATABASE_URL=... npx tsx scripts/seed-agency-demo.ts
 */
import { prisma } from '../src/db.js';

const DAY = 86400_000;
const names = ['Nigar', 'Leyla', 'Günay', 'Aytac', 'Səbinə'];

async function main() {
  const elvin = await prisma.user.findUniqueOrThrow({ where: { phone: '+994990000002' } });
  const aysel = await prisma.user.findUniqueOrThrow({ where: { phone: '+994990000001' } });
  await prisma.user.update({ where: { id: elvin.id }, data: { kycStatus: 'APPROVED', hostStatus: 'APPROVED' } });
  let agency = await prisma.agency.findUnique({ where: { ownerId: elvin.id } });
  if (!agency) {
    agency = await prisma.agency.create({ data: { name: 'Bakı Stars', code: 'BKSTAR', ownerId: elvin.id, status: 'ACTIVE', city: 'Bakı', description: 'Bakının ən aktiv host komandası' } });
  }
  await prisma.user.update({ where: { id: elvin.id }, data: { agencyId: agency.id, agencyJoinedAt: new Date(Date.now() - 40 * DAY) } });
  await prisma.user.update({ where: { id: aysel.id }, data: { agencyId: agency.id, agencyJoinedAt: new Date(Date.now() - 20 * DAY), hostStatus: 'APPROVED', online: true } });
  const hosts = [aysel.id];
  for (const [i, n] of names.entries()) {
    const email = `demo_host_${i}@simo.test`;
    const u = await prisma.user.upsert({
      where: { email },
      update: { agencyId: agency.id },
      create: { email, name: n, gender: 'FEMALE', onboarded: true, hostStatus: 'APPROVED', agencyId: agency.id, agencyJoinedAt: new Date(Date.now() - (5 + i * 6) * DAY), avatarUrl: `https://i.pravatar.cc/200?img=${20 + i}`, online: i % 2 === 0 },
    });
    hosts.push(u.id);
  }
  // Gözləyən müraciətlər
  for (const [i, n] of ['Fidan', 'Ülviyyə'].entries()) {
    const email = `demo_applicant_${i}@simo.test`;
    const u = await prisma.user.upsert({ where: { email }, update: {}, create: { email, name: n, gender: 'FEMALE', onboarded: true, avatarUrl: `https://i.pravatar.cc/200?img=${40 + i}` } });
    const ex = await prisma.agencyJoinRequest.findFirst({ where: { userId: u.id, status: 'PENDING' } });
    if (!ex) await prisma.agencyJoinRequest.create({ data: { agencyId: agency.id, userId: u.id, source: i ? 'APPLY' : 'CODE', message: i ? '' : 'Salam! Axşamlar aktivəm 🙂' } });
  }
  // 14 günlük qazanc
  await prisma.hostEarning.deleteMany({ where: { agencyId: agency.id } });
  const sources = ['GIFT', 'CALL', 'MESSAGE', 'GIFT', 'CALL', 'SUBSCRIPTION'];
  const rows = [];
  for (let d = 0; d < 14; d++) {
    for (const [hi, h] of hosts.entries()) {
      const k = 1 + ((d * 7 + hi * 3) % 5);
      for (let j = 0; j < k; j++) {
        const paid = 200 + ((d * 131 + hi * 71 + j * 37) % 1800);
        rows.push({ hostId: h, agencyId: agency.id, source: sources[(d + hi + j) % sources.length], paidCoins: paid, hostAmount: Math.floor(paid * 0.15), agencyAmount: Math.floor(paid * 0.15), createdAt: new Date(Date.now() - d * DAY - j * 3600_000) });
      }
    }
  }
  await prisma.hostEarning.createMany({ data: rows });
  // Onlayn vaxt
  for (const [hi, h] of hosts.entries()) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(Date.now() + 4 * 3600_000 - d * DAY).toISOString().slice(0, 10);
      const sec = (40 + ((hi * 23 + d * 17) % 140)) * 60;
      await prisma.hostDailyStat.upsert({ where: { userId_day: { userId: h, day } }, update: { onlineSec: sec }, create: { userId: h, day, onlineSec: sec } });
    }
  }
  // Zənglər (host Aysel üçün bu gün 18 dəqiqə)
  const caller = await prisma.user.upsert({ where: { email: 'demo_caller@simo.test' }, update: {}, create: { email: 'demo_caller@simo.test', name: 'Rauf', gender: 'MALE', onboarded: true } });
  for (const [hi, h] of hosts.entries()) {
    for (let c = 0; c < 3; c++) {
      const startedAt = new Date(Date.now() - c * 5 * 3600_000 - hi * 600_000);
      await prisma.call.create({ data: { callerId: caller.id, calleeId: h, type: c % 2 ? 'VOICE' : 'VIDEO', status: 'ENDED', pricePerMin: 80, channel: `demo_${h}_${c}_${Date.now()}`, startedAt, endedAt: new Date(startedAt.getTime() + (4 + hi + c * 2) * 60_000), billedMinutes: 5, coinsSpent: 400 } });
    }
  }
  console.log('demo agency', agency.code, rows.length, 'earnings');
}

main().finally(() => prisma.$disconnect());
