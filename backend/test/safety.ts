/**
 * Təhlükəsizlik testləri: kadr moderasiyası (saxta provayder), bulanıqlaşdırma, strike → dayandırma,
 * zəngin bitirilməsi və ödəyənə qaytarma, kadrlı şikayət, admin növbəsi, yaş yoxlaması, saxlama müddəti.
 *   DATABASE_URL=... npx tsx test/safety.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { io as ioc, type Socket } from 'socket.io-client';

// Sübut qovluğu test üçün müvəqqəti; açarsız rejimdə hər kadr saxlanılsın
process.env.SAFETY_EVIDENCE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'simo-evidence-'));
process.env.SAFETY_QUEUE_SAMPLE = '1';

const { buildApp } = await import('../src/app.js');
const { prisma } = await import('../src/db.js');
const { createSocketServer } = await import('../src/realtime/socket.js');
const { stopCallBilling } = await import('../src/services/calls.js');
const { frameVerdict, strikeAction } = await import('../src/lib/moderation.js');
const { setModerationProvider, queueProvider, sightengineScores, rekognitionScores, signAws } = await import('../src/services/safetyProviders.js');
const safety = await import('../src/services/safety.js');

const PORT = 4556;
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;

async function api<T = any>(method: string, p: string, token?: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(BASE + p, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function upload(p: string, token: string, image: Buffer) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(image)], { type: 'image/jpeg' }), 'frame.jpg');
  const res = await fetch(BASE + p, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: res.status, data: (await res.json()) as any };
}

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

function waitFor<T = any>(s: Socket, event: string, ms = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), ms);
    s.once(event, (p: T) => { clearTimeout(t); resolve(p); });
  });
}

async function registerPhone(phone: string) {
  const r1 = await api('POST', '/auth/otp/request', undefined, { phone });
  const r2 = await api('POST', '/auth/otp/verify', undefined, { phone, code: r1.data.devCode });
  assert.equal(r2.status, 200, JSON.stringify(r2.data));
  return r2.data.accessToken as string;
}

/** Saxta provayder: növbəti kadr üçün balı test özü təyin edir */
let nextScore = 0;
setModerationProvider({ name: 'fake', moderate: async () => ({ provider: 'fake', scores: { sexual: nextScore, suggestive: 0 } }) });

async function main() {
  const stamp = Date.now().toString().slice(-7);
  const app = await buildApp();
  await app.ready();
  createSocketServer(app.server);
  await app.listen({ port: PORT, host: '127.0.0.1' });
  const sockets: Socket[] = [];
  const img = await sharp({ create: { width: 320, height: 240, channels: 3, background: { r: 200, g: 120, b: 90 } } }).jpeg().toBuffer();

  try {
    await step('Saf funksiyalar: qərar hədləri, strike pilləsi, provayder ballarının normallaşdırılması', async () => {
      const t = { block: 0.8, review: 0.5 };
      assert.equal(frameVerdict(null, t), 'UNSCANNED');
      assert.equal(frameVerdict({ sexual: 0.1, suggestive: 0.3 }, t), 'SAFE');
      assert.equal(frameVerdict({ sexual: 0.6, suggestive: 0 }, t), 'SUSPECT');
      assert.equal(frameVerdict({ sexual: 0.1, suggestive: 0.95 }, t), 'SUSPECT');
      assert.equal(frameVerdict({ sexual: 0.85, suggestive: 0 }, t), 'VIOLATION');
      assert.equal(frameVerdict({ sexual: 0.2, suggestive: 0.6, minor: 0.9 }, t), 'VIOLATION', 'azyaşlı + cinsi siqnal');
      assert.deepEqual([1, 2, 3, 5, 6].map((n) => strikeAction(n, 3)), ['WARN', 'WARN', 'SUSPEND', 'SUSPEND', 'BAN']);
      assert.deepEqual(sightengineScores({ nudity: { sexual_activity: 0.01, sexual_display: 0.92, erotica: 0.2, very_suggestive: 0.3, suggestive: 0.5 } }), { sexual: 0.92, suggestive: 0.4 });
      const aws = rekognitionScores({ ModerationLabels: [{ Name: 'Explicit Nudity', Confidence: 97 }, { Name: 'Exposed Female Genitalia', ParentName: 'Explicit Nudity', Confidence: 91 }, { Name: 'Swimwear or Underwear', Confidence: 88 }] });
      assert.equal(aws.sexual, 0.97);
      assert.equal(aws.suggestive, 0.88);
      const h = signAws({ region: 'eu-central-1', service: 'rekognition', host: 'rekognition.eu-central-1.amazonaws.com', target: 'RekognitionService.DetectModerationLabels', body: '{}', accessKeyId: 'AKID', secretAccessKey: 'SECRET', now: new Date('2026-01-01T00:00:00Z') });
      assert.match(h.authorization, /^AWS4-HMAC-SHA256 Credential=AKID\/20260101\/eu-central-1\/rekognition\/aws4_request, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=[0-9a-f]{64}$/);
    });

    // Hazırlıq: ödəyən kişi, agentlikdə host qız, admin
    const man = await registerPhone(`051${stamp}`);
    const manOb = await api('PUT', '/me/onboarding', man, { name: 'Murad', gender: 'MALE', birthDate: '1994-04-04', avatarUrl: 'https://x.az/m.jpg' });
    const manId = manOb.data.id as string;
    const gr = await api('POST', '/auth/email/register', undefined, { email: `safe_g${stamp}@test.az`, password: 'secret123' });
    const girl = gr.data.accessToken as string;
    const girlId = (await api('PUT', '/me/onboarding', girl, { name: 'Nigar', gender: 'FEMALE', birthDate: '1998-08-08', avatarUrl: 'https://x.az/n.jpg' })).data.id as string;
    const owner = await prisma.user.create({ data: { name: 'Safe Agency', email: `safe_o${stamp}@test.az` } });
    const ag = await prisma.agency.create({ data: { name: `Safe ${stamp}`, code: `SF${stamp}`.slice(0, 8), ownerId: owner.id, status: 'ACTIVE' } });
    await prisma.user.update({ where: { id: girlId }, data: { hostStatus: 'APPROVED', agencyId: ag.id, agencyJoinedAt: new Date() } });
    await prisma.user.update({ where: { id: manId }, data: { coins: 5000, promoCoins: 0 } });
    const ar = await api('POST', '/auth/email/register', undefined, { email: `safe_a${stamp}@test.az`, password: 'secret123' });
    await prisma.user.update({ where: { id: (await api('GET', '/me', ar.data.accessToken)).data.id }, data: { role: 'ADMIN' } });
    const admin = (await api('POST', '/auth/refresh', undefined, { refreshToken: ar.data.refreshToken })).data.accessToken as string;

    const sMan = ioc(BASE, { auth: { token: man }, transports: ['websocket'] });
    const sGirl = ioc(BASE, { auth: { token: girl }, transports: ['websocket'] });
    sockets.push(sMan, sGirl);
    await Promise.all([waitFor(sMan, 'connect'), waitFor(sGirl, 'connect')]);

    await step('Monitorinq bildirişinin qəbulu (versiya ilə) və /safety/me', async () => {
      const me = await api('GET', '/safety/me', man);
      assert.equal(me.data.videoNoticeAccepted, false);
      assert.equal(me.data.monitoring.enabled, true);
      assert.ok(me.data.monitoring.minSec >= 5 && me.data.monitoring.maxSec >= me.data.monitoring.minSec);
      const bad = await api('POST', '/safety/consent', man, { kind: 'VIDEO_MONITORING', version: '1999-01-01' });
      assert.equal(bad.data.error, 'DOC_VERSION');
      const ok = await api('POST', '/safety/consent', man, { kind: 'VIDEO_MONITORING', version: me.data.versions.VIDEO_MONITORING });
      assert.equal(ok.data.videoNoticeAccepted, true);
    });

    let callId = '';
    await step('Kadr yalnız aktiv görüntülü zəngin iştirakçısından qəbul olunur', async () => {
      const c = await api('POST', '/calls', man, { calleeId: girlId, type: 'VIDEO' });
      assert.equal(c.status, 200, JSON.stringify(c.data));
      callId = c.data.call.id;
      const early = await upload(`/safety/frames?contextType=CALL&contextId=${callId}`, girl, img);
      assert.equal(early.data.error, 'CALL_NOT_ACTIVE', 'zəng hələ qəbul edilməyib');
      assert.equal((await api('POST', `/calls/${callId}/accept`, girl)).status, 200);
      const stranger = await registerPhone(`053${stamp}`);
      const x = await upload(`/safety/frames?contextType=CALL&contextId=${callId}`, stranger, img);
      assert.equal(x.status, 404);
      const notImage = await upload(`/safety/frames?contextType=CALL&contextId=${callId}`, girl, Buffer.from('not an image at all'));
      assert.equal(notImage.data.error, 'BAD_IMAGE');
    });

    await step('Təmiz kadr: heç nə saxlanılmır (məlumatın minimallaşdırılması)', async () => {
      nextScore = 0.05;
      const r = await upload(`/safety/frames?contextType=CALL&contextId=${callId}`, girl, img);
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.verdict, 'SAFE');
      assert.equal(await prisma.safetyEvidence.count({ where: { contextId: callId } }), 0);
    });

    await step('Çılpaqlıq: qarşı tərəfdə dərhal bulanıqlaşma, göndərənə xəbərdarlıq, 1 strike', async () => {
      nextScore = 0.97;
      const blur = waitFor(sMan, 'safety:blur');
      const warn = waitFor(sGirl, 'safety:warning');
      const r = await upload(`/safety/frames?contextType=CALL&contextId=${callId}`, girl, img);
      assert.equal(r.data.verdict, 'VIOLATION');
      assert.equal(r.data.action, 'WARNED');
      const b = await blur;
      assert.equal(b.offenderId, girlId);
      assert.equal(b.ended, false);
      assert.equal((await warn).count, 1);
      assert.equal((await prisma.safetyProfile.findUniqueOrThrow({ where: { userId: girlId } })).strikes, 1);
      const ev = await prisma.safetyEvidence.findFirstOrThrow({ where: { contextId: callId } });
      assert.ok(ev.filePath && fs.existsSync(path.join(process.env.SAFETY_EVIDENCE_DIR!, ev.filePath)), 'sübut faylı ictimai olmayan qovluqda');
      assert.ok(ev.expiresAt.getTime() > Date.now() + 100 * 86400_000, 'pozuntu sübutu ~180 gün saxlanılır');
      assert.equal(ev.sha256?.length, 64);
    });

    await step('Təkrar aşkarlama: zəng bitir, strike təkrarlanmır, ödəyənə qaytarılır, hostdan geri alınır', async () => {
      const coinsBefore = (await prisma.user.findUniqueOrThrow({ where: { id: manId } })).coins;
      const ended = waitFor(sMan, 'call:ended');
      const r = await upload(`/safety/frames?contextType=CALL&contextId=${callId}`, girl, img);
      assert.equal(r.data.action, 'ENDED');
      const e = await ended;
      assert.equal(e.reason, 'SAFETY_VIOLATION');
      assert.equal((await prisma.call.findUniqueOrThrow({ where: { id: callId } })).status, 'ENDED');
      assert.equal((await prisma.safetyProfile.findUniqueOrThrow({ where: { userId: girlId } })).strikes, 1, 'bir zəng = bir strike');
      const refund = await prisma.walletTransaction.findFirstOrThrow({ where: { userId: manId, type: 'SAFETY_REFUND', refId: callId } });
      assert.equal(refund.amount, 80, 'ilk dəqiqə qaytarıldı');
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: manId } })).coins, coinsBefore + 80);
      const claw = await prisma.walletTransaction.findFirst({ where: { userId: girlId, type: 'SAFETY_CLAWBACK', refId: callId } });
      assert.ok(claw && claw.amount < 0, 'host qazancı geri alındı');
      // İdempotent: təkrar çağırış ikinci dəfə qaytarmır
      const again = await safety.refundViolatingSegment(callId, girlId, new Date(Date.now() - 120_000));
      assert.equal(again.refunded, 0);
      const late = await upload(`/safety/frames?contextType=CALL&contextId=${callId}`, girl, img);
      assert.equal(late.data.error, 'CALL_NOT_ACTIVE', 'bitmiş zəngə kadr qəbul olunmur');
    });

    await step('Pozucu ödəyəndirsə — qaytarılma yoxdur', async () => {
      const c = await api('POST', '/calls', man, { calleeId: girlId, type: 'VIDEO' });
      await api('POST', `/calls/${c.data.call.id}/accept`, girl);
      nextScore = 0.99;
      await upload(`/safety/frames?contextType=CALL&contextId=${c.data.call.id}`, man, img);
      const r = await upload(`/safety/frames?contextType=CALL&contextId=${c.data.call.id}`, man, img);
      assert.equal(r.data.action, 'ENDED');
      assert.equal(await prisma.walletTransaction.count({ where: { type: 'SAFETY_REFUND', refId: c.data.call.id } }), 0);
      assert.equal((await prisma.safetyProfile.findUniqueOrThrow({ where: { userId: manId } })).strikes, 1);
    });

    await step('N strike → avtomatik dayandırma (giriş bağlanır), müddət bitəndə avtomatik açılır', async () => {
      await safety.addStrike(girlId, 'TEST', { contextType: 'CALL', contextId: `t1_${stamp}` });
      const logout = waitFor(sGirl, 'force-logout');
      const r = await safety.addStrike(girlId, 'TEST', { contextType: 'CALL', contextId: `t2_${stamp}` });
      assert.equal(r.strikes, 3);
      assert.equal(r.action, 'SUSPEND');
      assert.equal((await logout).reason, 'SUSPENDED');
      assert.equal((await api('GET', '/me', girl)).data.error, 'BANNED');
      await prisma.safetyProfile.update({ where: { userId: girlId }, data: { suspendedUntil: new Date(Date.now() - 1000) } });
      assert.ok((await safety.liftExpiredSuspensions()) >= 1);
      assert.equal((await api('GET', '/me', girl)).status, 200, 'dayandırma bitdi');
    });

    await step('Admin növbəsi: şəkil yalnız admin üçün, DISMISS strike-ı ləğv edir, CONFIRM strike yazır', async () => {
      assert.equal((await api('GET', '/admin/safety/queue', man)).status, 403);
      const q = await api('GET', `/admin/safety/queue?userId=${girlId}`, admin);
      assert.ok(q.data.items.length >= 2);
      const item = q.data.items.find((i: any) => i.contextId === callId);
      assert.equal(item.subject.id, girlId);
      assert.equal(item.filePath, undefined, 'fayl yolu açıqlanmır');
      const imgRes = await fetch(`${BASE}/admin/safety/evidence/${item.id}/image`, { headers: { Authorization: `Bearer ${admin}` } });
      assert.equal(imgRes.status, 200);
      assert.equal(imgRes.headers.get('content-type'), 'image/jpeg');
      assert.equal((await fetch(`${BASE}/admin/safety/evidence/${item.id}/image`, { headers: { Authorization: `Bearer ${girl}` } })).status, 403);
      assert.equal((await fetch(`${BASE}/files/../safety-evidence/x.jpg`)).status >= 400, true);
      const before = (await prisma.safetyProfile.findUniqueOrThrow({ where: { userId: girlId } })).strikes;
      const d = await api('POST', `/admin/safety/evidence/${item.id}`, admin, { action: 'DISMISS', note: 'yanlış pozitiv' });
      assert.equal(d.status, 200, JSON.stringify(d.data));
      assert.equal((await prisma.safetyProfile.findUniqueOrThrow({ where: { userId: girlId } })).strikes, before - 1);
      const c = await api('POST', `/admin/safety/evidence/${item.id}`, admin, { action: 'CONFIRM' });
      assert.equal(c.status, 200, JSON.stringify(c.data));
      assert.equal((await prisma.safetyEvidence.findUniqueOrThrow({ where: { id: item.id } })).reviewStatus, 'CONFIRMED');
      const stats = await api('GET', '/admin/safety/stats', admin);
      assert.equal(stats.data.provider, 'fake');
    });

    await step('Zəng daxilində kadrlı şikayət: azyaşlı şübhəsi — legalHold, növbədə birinci', async () => {
      await prisma.safetyProfile.update({ where: { userId: girlId }, data: { suspensionActive: false } });
      await prisma.user.update({ where: { id: girlId }, data: { banned: false } });
      const c = await api('POST', '/calls', man, { calleeId: girlId, type: 'VIDEO' });
      assert.equal(c.status, 200, JSON.stringify(c.data));
      await api('POST', `/calls/${c.data.call.id}/accept`, girl);
      nextScore = 0.1;
      const r = await upload(`/safety/reports?contextType=CALL&contextId=${c.data.call.id}&targetUserId=${girlId}&reason=UNDERAGE`, man, img);
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.urgent, true);
      const ev = await prisma.safetyEvidence.findUniqueOrThrow({ where: { id: r.data.evidenceId } });
      assert.equal(ev.legalHold, true);
      assert.equal(ev.kind, 'REPORT_FRAME');
      const rep = await prisma.report.findUniqueOrThrow({ where: { id: r.data.reportId } });
      assert.equal(rep.targetType, 'CALL');
      const q = await api('GET', '/admin/safety/queue', admin);
      assert.equal(q.data.items[0].legalHold, true, 'legalHold birinci');
      const self = await api('POST', '/safety/reports', man, { contextType: 'CALL', contextId: c.data.call.id, targetUserId: manId, reason: 'SPAM' });
      assert.equal(self.data.error, 'SELF_REPORT');
      const json = await api('POST', '/safety/reports', man, { contextType: 'CALL', contextId: c.data.call.id, targetUserId: girlId, reason: 'SCAM', details: 'kart nömrəsi istədi' });
      assert.equal(json.status, 200);
      assert.equal(json.data.evidenceId, null);
      await api('POST', `/calls/${c.data.call.id}/end`, man);
    });

    await step('Açarsız rejim (none): kadr yoxlanılmadan insan baxışı növbəsinə düşür', async () => {
      setModerationProvider(queueProvider);
      const l = await api('POST', '/live', girl, { type: 'VIDEO', title: 'Safety test' });
      assert.equal(l.status, 200, JSON.stringify(l.data));
      const roomId = l.data.room.id;
      const viewer = await upload(`/safety/frames?contextType=LIVE&contextId=${roomId}`, man, img);
      assert.equal(viewer.data.error, 'LIVE_NOT_ACTIVE', 'izləyici öz kadrını göndərmir');
      const r = await upload(`/safety/frames?contextType=LIVE&contextId=${roomId}`, girl, img);
      assert.equal(r.data.verdict, 'UNSCANNED');
      assert.equal(r.data.action, 'QUEUED');
      const q = await api('GET', '/admin/safety/queue?verdict=UNSCANNED', admin);
      assert.ok(q.data.items.some((i: any) => i.contextId === roomId));
      await api('POST', `/live/${roomId}/end`, girl);
      setModerationProvider({ name: 'fake', moderate: async () => ({ provider: 'fake', scores: { sexual: nextScore, suggestive: 0 } }) });
    });

    await step('Host təsdiqi: sənəddə 18-dən kiçik doğum tarixi → rədd, AgeCheck yazılır', async () => {
      const t = await registerPhone(`054${stamp}`);
      const tid = (await api('PUT', '/me/onboarding', t, { name: 'Lalə', gender: 'FEMALE', birthDate: '2000-01-01', avatarUrl: 'https://x.az/l.jpg' })).data.id as string;
      await prisma.verification.create({ data: { userId: tid, firstName: 'Lalə', lastName: 'X', birthDate: new Date('2011-05-05'), docFrontUrl: 'https://x.az/i.jpg', selfieUrl: 'https://x.az/s.jpg' } });
      const r = await api('POST', `/admin/users/${tid}`, admin, { hostStatus: 'APPROVED' });
      assert.equal(r.data.error, 'UNDERAGE');
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: tid } })).hostStatus, 'NONE');
      const chk = await prisma.ageCheck.findFirstOrThrow({ where: { userId: tid, source: 'HOST_APPROVAL' } });
      assert.equal(chk.passed, false);
      assert.equal(chk.note, 'DOB_MISMATCH');
      const v = await prisma.verification.findFirstOrThrow({ where: { userId: tid } });
      assert.equal((await api('POST', `/admin/kyc/${v.id}`, admin, { status: 'APPROVED' })).data.error, 'UNDERAGE', 'KYC təsdiqi də rədd olunur');
    });

    await step('Hüquq-mühafizə ixracı: jurnal, sübut metadata-sı, legalHold', async () => {
      const r = await api('GET', `/admin/safety/users/${girlId}/export?ref=DIN-2026-001`, admin);
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.ok(r.data.strikes.length >= 3);
      assert.ok(r.data.evidence.every((e: any) => e.filePath === undefined && typeof e.hasFile === 'boolean'));
      assert.equal(await prisma.safetyEvidence.count({ where: { subjectId: girlId, legalHold: false } }), 0);
      assert.ok(await prisma.safetyAuditLog.findFirst({ where: { action: 'LE_EXPORT', targetUserId: girlId } }));
    });

    await step('Saxlama siyasəti: müddəti bitən fayl silinir (legalHold istisna), metadata qalır', async () => {
      const ev = await prisma.safetyEvidence.findFirstOrThrow({ where: { subjectId: manId, filePath: { not: null } } });
      await prisma.safetyEvidence.update({ where: { id: ev.id }, data: { expiresAt: new Date(Date.now() - 1000), legalHold: false } });
      const held = await prisma.safetyEvidence.findFirstOrThrow({ where: { subjectId: girlId, legalHold: true, filePath: { not: null } } });
      await prisma.safetyEvidence.update({ where: { id: held.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      await safety.sweepEvidence();
      const after = await prisma.safetyEvidence.findUniqueOrThrow({ where: { id: ev.id } });
      assert.equal(after.filePath, null);
      assert.equal(after.verdict, 'VIOLATION', 'qərar və ballar jurnal kimi qalır');
      assert.ok(!fs.existsSync(path.join(process.env.SAFETY_EVIDENCE_DIR!, ev.filePath!)));
      assert.ok((await prisma.safetyEvidence.findUniqueOrThrow({ where: { id: held.id } })).filePath, 'legalHold silinmədi');
    });

    console.log(`\n${passed} təhlükəsizlik testi keçdi ✅`);
  } finally {
    sockets.forEach((s) => s.close());
    stopCallBilling();
    setModerationProvider(null);
    await app.close();
    await prisma.$disconnect();
    fs.rmSync(process.env.SAFETY_EVIDENCE_DIR!, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
