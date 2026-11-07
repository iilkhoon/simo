/**
 * Zəng / canlı yayın / PK vəziyyət maşınlarının yarış (race) testləri — real PostgreSQL ilə.
 *   DATABASE_URL=... npx tsx test/calls-live.ts
 * Vaxt asılı hissələr (dəqiqə ödənişi, oflayn güzəşti, host yoxluğu, PK dəvətinin vaxtı)
 * sweeper funksiyalarına `now` ötürməklə və DB-də vaxt damğalarını geri çəkməklə yoxlanılır.
 */
import assert from 'node:assert/strict';
import { io as ioc, type Socket } from 'socket.io-client';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/db.js';
import { createSocketServer } from '../src/realtime/socket.js';
import { OFFLINE_GRACE_MS, billingTick, chargeMinute, finishCall, stopCallBilling } from '../src/services/calls.js';
import { HOST_ABSENT_MS, sweepStaleLives } from '../src/services/live.js';
import { endPk } from '../src/services/pk.js';
import { getRoom } from '../src/realtime/liveState.js';

const PORT = Number(process.env.TEST_PORT_CALLS ?? 4556);
const BASE = `http://127.0.0.1:${PORT}`;
let passed = 0;

async function api<T = any>(method: string, path: string, token?: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
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

function waitFor<T = any>(s: Socket, event: string, ms = 4000, pred: (p: T) => boolean = () => true): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { s.off(event, h); reject(new Error(`timeout ${event}`)); }, ms);
    const h = (p: T) => {
      if (!pred(p)) return;
      clearTimeout(t);
      s.off(event, h);
      resolve(p);
    };
    s.on(event, h);
  });
}

/** Hadisələri saymaq üçün */
function counter(s: Socket, event: string, pred: (p: any) => boolean = () => true) {
  const box = { n: 0, last: null as any };
  s.on(event, (p) => { if (pred(p)) { box.n++; box.last = p; } });
  return box;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function user(phone: string, name: string, gender: 'MALE' | 'FEMALE') {
  const r1 = await api('POST', '/auth/otp/request', undefined, { phone });
  const r2 = await api('POST', '/auth/otp/verify', undefined, { phone, code: r1.data.devCode });
  const token = r2.data.accessToken as string;
  const ob = await api('PUT', '/me/onboarding', token, { name, gender, birthDate: '1996-04-04', avatarUrl: 'https://x.az/a.jpg' });
  assert.equal(ob.status, 200, JSON.stringify(ob.data));
  return { token, id: ob.data.id as string };
}

const connect = async (token: string) => {
  const s = ioc(BASE, { auth: { token }, transports: ['websocket'], forceNew: true });
  await waitFor(s, 'connect');
  return s;
};
const emitAck = (s: Socket, ev: string, p: unknown) => new Promise<any>((r) => s.emit(ev, p, r));

async function main() {
  const stamp = Date.now().toString().slice(-7);
  const app = await buildApp();
  await app.ready();
  createSocketServer(app.server);
  await app.listen({ port: PORT, host: '127.0.0.1' });
  const sockets: Socket[] = [];

  try {
    const man = await user(`051${stamp}`, 'Kamran', 'MALE');
    const man2 = await user(`055${stamp}`, 'Tural', 'MALE');
    const girl = await user(`077${stamp}`, 'Leyla', 'FEMALE');
    const girl2 = await user(`099${stamp}`, 'Nigar', 'FEMALE');
    const owner = await prisma.user.create({ data: { name: 'Fx Agency', email: `fxc${stamp}@test.az` } });
    const ag = await prisma.agency.create({ data: { name: `FxC ${stamp}`, code: `FC${stamp}`.slice(0, 8), ownerId: owner.id, status: 'ACTIVE' } });
    for (const g of [girl, girl2]) {
      await prisma.user.update({ where: { id: g.id }, data: { hostStatus: 'APPROVED', videoCallPrice: 80, voiceCallPrice: 50, agencyId: ag.id, agencyJoinedAt: new Date() } });
    }
    await prisma.user.update({ where: { id: man.id }, data: { coins: 1000 } });
    await prisma.user.update({ where: { id: man2.id }, data: { coins: 1000 } });

    const sMan = await connect(man.token);
    const sMan2 = await connect(man2.token);
    const sGirl = await connect(girl.token);
    const sGirl2 = await connect(girl2.token);
    sockets.push(sMan, sMan2, sGirl, sGirl2);

    await step('Zəngdən əvvəl qiymət təsdiqi: dəqiqəlik qiymət, balans, neçə dəqiqə', async () => {
      const q = await api('GET', `/calls/quote/${girl.id}?type=VIDEO`, man.token);
      assert.equal(q.status, 200);
      assert.equal(q.data.price, 80);
      assert.equal(q.data.coins, 1000);
      assert.equal(q.data.minutes, 12);
      assert.equal(q.data.enough, true);
      assert.equal(q.data.available, true);
      await prisma.user.update({ where: { id: girl.id }, data: { acceptVoice: false } });
      const v = await api('GET', `/calls/quote/${girl.id}?type=VOICE`, man.token);
      assert.equal(v.data.available, false);
      assert.equal(v.data.reason, 'VOICE_CALLS_OFF');
      await prisma.user.update({ where: { id: girl.id }, data: { acceptVoice: true } });
      // Adi istifadəçilər arasında uyğunluq yoxdursa
      const n = await api('GET', `/calls/quote/${man2.id}?type=VIDEO`, man.token);
      assert.equal(n.data.available, false);
      assert.equal(n.data.reason, 'MATCH_REQUIRED');
    });

    let callId = '';
    await step('Qəbul: ilk dəqiqə ödənir, hər iki tərəfə call:tick (Nar sayğacı / Almaz qazancı)', async () => {
      const c = await api('POST', '/calls', man.token, { calleeId: girl.id, type: 'VIDEO' });
      assert.equal(c.status, 200, JSON.stringify(c.data));
      callId = c.data.call.id;
      const tickMan = waitFor(sMan, 'call:tick');
      const tickGirl = waitFor(sGirl, 'call:tick');
      const acceptedOnGirl = waitFor(sGirl, 'call:accepted');
      const a = await api('POST', `/calls/${callId}/accept`, girl.token);
      assert.equal(a.status, 200, JSON.stringify(a.data));
      const tm = await tickMan;
      assert.equal(tm.coinsSpent, 80);
      assert.equal(tm.coins, 920);
      assert.equal(tm.minutesLeft, 11);
      const tg = await tickGirl;
      assert.ok(tg.earned > 0, 'host qazancı sayılır');
      assert.equal(tg.coins, undefined, 'hosta zəng edənin balansı göstərilmir');
      await acceptedOnGirl; // hostun digər cihazlarında gələn zəng ekranı bağlanır
      // Təkrar qəbul (sistem ekranı + tətbiq) — xəta yox, ikinci ödəniş yox
      const again = await api('POST', `/calls/${callId}/accept`, girl.token);
      assert.equal(again.status, 200);
      assert.equal((await prisma.call.findUniqueOrThrow({ where: { id: callId } })).billedMinutes, 1);
      const g = await api('GET', `/calls/${callId}`, man.token);
      assert.ok(g.data.nextChargeAt, 'növbəti ödəniş vaxtı');
      assert.ok(g.data.serverNow);
    });

    await step('Dəqiqə ödənişi: paralel iki tik eyni dəqiqəni iki dəfə ödəmir', async () => {
      const c = await prisma.call.findUniqueOrThrow({ where: { id: callId } });
      await prisma.call.update({ where: { id: callId }, data: { startedAt: new Date(c.startedAt!.getTime() - 61_000) } });
      await Promise.all([billingTick(Date.now(), () => true), billingTick(Date.now(), () => true), chargeMinute(callId)]);
      const after = await prisma.call.findUniqueOrThrow({ where: { id: callId } });
      assert.equal(after.billedMinutes, 2);
      assert.equal(after.coinsSpent, 160);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: man.id } })).coins, 840);
    });

    await step('Hər iki tərəf eyni anda bitirir: bir "call:ended", bir zəng mesajı, ödəniş dayanır', async () => {
      const endedMan = counter(sMan, 'call:ended', (p) => p.callId === callId);
      const msgs = counter(sMan, 'message:new', (m) => m.type === 'CALL');
      const [r1, r2] = await Promise.all([
        api('POST', `/calls/${callId}/end`, man.token),
        api('POST', `/calls/${callId}/end`, girl.token),
      ]);
      assert.equal(r1.status, 200);
      assert.equal(r2.status, 200);
      await sleep(400);
      assert.equal(endedMan.n, 1, 'call:ended bir dəfə');
      assert.equal(msgs.n, 1, 'bir zəng qeydi');
      assert.equal(endedMan.last.billedMinutes, 2);
      // Bitmiş zəngə ödəniş yazılmır
      await chargeMinute(callId);
      await billingTick(Date.now() + 10 * 60_000, () => true);
      const after = await prisma.call.findUniqueOrThrow({ where: { id: callId } });
      assert.equal(after.billedMinutes, 2);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: man.id } })).coins, 840);
    });

    await step('Zəngdən sonra xülasə və qiymətləndirmə', async () => {
      const s = await api('GET', `/calls/${callId}/summary`, man.token);
      assert.equal(s.status, 200);
      assert.equal(s.data.coinsSpent, 160);
      assert.equal(s.data.role, 'caller');
      assert.ok(s.data.durationSec >= 60);
      assert.equal(s.data.peer.id, girl.id);
      const h = await api('GET', `/calls/${callId}/summary`, girl.token);
      assert.equal(h.data.coinsSpent, 0, 'host xərcləmir');
      assert.ok(h.data.earned > 0);
      assert.equal((await api('POST', `/calls/${callId}/rate`, man.token, { stars: 5 })).status, 200);
      assert.equal((await api('POST', `/calls/${callId}/rate`, man.token, { stars: 9 })).status, 400);
      assert.equal((await api('GET', `/calls/${callId}/summary`, man.token)).data.myRating, 5);
    });

    await step('Zəng qeydi "ilk pulsuz salam" hüququnu yandırmır', async () => {
      const conv = await api('POST', `/conversations/with/${girl.id}`, man.token);
      const m = await api('POST', `/conversations/${conv.data.id}/messages`, man.token, { text: 'Salam!' });
      assert.equal(m.status, 200, JSON.stringify(m.data));
      assert.equal(m.data.message.coinsCost, 0);
    });

    await step('Eyni hosta eyni anda iki zəng: yalnız biri keçir (USER_BUSY)', async () => {
      const [a, b] = await Promise.all([
        api('POST', '/calls', man.token, { calleeId: girl2.id, type: 'VIDEO' }),
        api('POST', '/calls', man2.token, { calleeId: girl2.id, type: 'VIDEO' }),
      ]);
      const ok = [a, b].filter((r) => r.status === 200);
      const busy = [a, b].filter((r) => r.data?.error === 'USER_BUSY');
      assert.equal(ok.length, 1, JSON.stringify([a.data, b.data]));
      assert.equal(busy.length, 1);
      // Host cavab vermədən "bitir" basır → imtina (REJECTED), zəng edən "rədd edildi" görür
      const ended = waitFor(ok[0] === a ? sMan : sMan2, 'call:ended');
      await api('POST', `/calls/${ok[0].data.call.id}/end`, girl2.token);
      assert.equal((await ended).status, 'REJECTED');
    });

    await step('Vaxtı keçmiş zəngi qəbul etmək olmur (server restartından sonra da MISSED olur)', async () => {
      const c = await api('POST', '/calls', man.token, { calleeId: girl.id, type: 'VOICE' });
      await prisma.call.update({ where: { id: c.data.call.id }, data: { createdAt: new Date(Date.now() - 60_000) } });
      await billingTick(Date.now(), () => true);
      assert.equal((await prisma.call.findUniqueOrThrow({ where: { id: c.data.call.id } })).status, 'MISSED');
      const a = await api('POST', `/calls/${c.data.call.id}/accept`, girl.token);
      assert.equal(a.data.error, 'CALL_NOT_RINGING');
    });

    await step('Tərəf oflayn qalırsa (şəbəkə/restart) aktiv zəng güzəştdən sonra bitir, qayıdarsa davam edir', async () => {
      const c = await api('POST', '/calls', man.token, { calleeId: girl.id, type: 'VOICE' });
      const id = c.data.call.id;
      await api('POST', `/calls/${id}/accept`, girl.token);
      const t0 = Date.now();
      const offline = (u: string) => u !== girl.id;
      await billingTick(t0, offline);
      await billingTick(t0 + 20_000, () => true); // qayıtdı — sayğac sıfırlanır
      await billingTick(t0 + 30_000, offline);
      await billingTick(t0 + 30_000 + OFFLINE_GRACE_MS - 1000, offline);
      assert.equal((await prisma.call.findUniqueOrThrow({ where: { id } })).status, 'ACTIVE', 'güzəşt bitməyib');
      const ended = waitFor(sMan, 'call:ended', 4000, (p) => p.callId === id);
      await billingTick(t0 + 30_000 + OFFLINE_GRACE_MS, offline);
      const e = await ended;
      assert.equal(e.reason, 'DISCONNECTED');
      assert.equal(e.status, 'ENDED');
    });

    await step('Balans bitəndə zəng avtomatik bitir (INSUFFICIENT_COINS), az balans xəbərdarlığı gəlir', async () => {
      await prisma.user.update({ where: { id: man.id }, data: { coins: 130 } });
      const c = await api('POST', '/calls', man.token, { calleeId: girl.id, type: 'VIDEO' });
      const id = c.data.call.id;
      const low = waitFor(sMan, 'call:low-balance');
      await api('POST', `/calls/${id}/accept`, girl.token);
      const l = await low;
      assert.equal(l.minutesLeft, 0);
      assert.equal(l.coins, 50);
      const st = (await prisma.call.findUniqueOrThrow({ where: { id } })).startedAt!;
      await prisma.call.update({ where: { id }, data: { startedAt: new Date(st.getTime() - 61_000) } });
      const ended = waitFor(sMan, 'call:ended', 4000, (p) => p.callId === id);
      await billingTick(Date.now(), () => true);
      assert.equal((await ended).reason, 'INSUFFICIENT_COINS');
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: man.id } })).coins, 50, 'mənfiyə düşmür');
      await prisma.user.update({ where: { id: man.id }, data: { coins: 1000 } });
    });

    await step('finishCall idempotentdir: təkrar çağırış null qaytarır', async () => {
      const c = await api('POST', '/calls', man.token, { calleeId: girl.id, type: 'VIDEO' });
      const [x, y] = await Promise.all([finishCall(c.data.call.id, 'CANCELLED', 'CANCELLED'), finishCall(c.data.call.id, 'MISSED', 'NO_ANSWER')]);
      assert.equal([x, y].filter(Boolean).length, 1);
    });

    let roomId = '';
    await step('Canlı: eyni soketdən təkrar join sayılmır; ikinci cihaz çıxanda izləyici qalır', async () => {
      const l = await api('POST', '/live', girl.token, { type: 'VIDEO', title: 'Test' });
      roomId = l.data.room.id;
      assert.equal((await emitAck(sGirl, 'live:join', { roomId })).ok, true);
      await emitAck(sMan, 'live:join', { roomId });
      const again = await emitAck(sMan, 'live:join', { roomId });
      assert.equal(again.viewers, 1, 'təkrar join sayılmadı');
      const sMan2nd = await connect(man.token);
      sockets.push(sMan2nd);
      await emitAck(sMan2nd, 'live:join', { roomId });
      sMan2nd.emit('live:leave', { roomId });
      sMan2nd.emit('live:leave', { roomId });
      await sleep(250);
      sMan2nd.close();
      await sleep(300);
      assert.equal(getRoom(roomId)?.viewers.has(man.id), true, 'birinci cihaz hələ otaqdadır');
      const v = await api('GET', `/live/${roomId}/viewers`, girl.token);
      assert.equal(v.data.total, 1);
      assert.equal(v.data.items[0].user.id, man.id);
      sMan.emit('live:leave', { roomId });
      await sleep(250);
      assert.equal((await api('GET', `/live/${roomId}/viewers`, girl.token)).data.total, 0);
    });

    await step('Host otaqda deyilsə (restartdan sonra qayıtmadı) yayın sweeper ilə bağlanır', async () => {
      const l = await api('POST', '/live', girl2.token, { type: 'VIDEO', title: 'Yox' });
      const rid = l.data.room.id;
      await emitAck(sMan2, 'live:join', { roomId: rid });
      const ended = waitFor(sMan2, 'live:ended', 4000, (p) => p.roomId === rid);
      const t0 = Date.now();
      await sweepStaleLives(t0);
      await sweepStaleLives(t0 + HOST_ABSENT_MS - 1000);
      assert.equal((await prisma.liveRoom.findUniqueOrThrow({ where: { id: rid } })).status, 'LIVE');
      await sweepStaleLives(t0 + HOST_ABSENT_MS);
      assert.equal((await ended).reason, 'HOST_LEFT');
    });

    await step('PK: köhnə dəvət qəbul olunmur; paralel bitirmədə qalib bonusu bir dəfə yazılır', async () => {
      const l2 = await api('POST', '/live', girl2.token, { type: 'VIDEO', title: 'PK' });
      const room2 = l2.data.room.id;
      await emitAck(sGirl2, 'live:join', { roomId: room2 });
      await emitAck(sGirl, 'live:join', { roomId });
      const inv = await api('POST', `/live/${roomId}/pk/invite`, girl.token, { targetRoomId: room2 });
      assert.equal(inv.status, 200, JSON.stringify(inv.data));
      await prisma.pkBattle.update({ where: { id: inv.data.battle.id }, data: { createdAt: new Date(Date.now() - 120_000) } });
      assert.equal((await api('POST', `/pk/${inv.data.battle.id}/accept`, girl2.token)).data.error, 'PK_EXPIRED');
      const inv2 = await api('POST', `/live/${roomId}/pk/invite`, girl.token, { targetRoomId: room2 });
      const started = waitFor(sGirl, 'pk:start');
      assert.equal((await api('POST', `/pk/${inv2.data.battle.id}/accept`, girl2.token)).status, 200);
      await started;
      assert.equal((await api('POST', `/pk/${inv2.data.battle.id}/accept`, girl2.token)).status, 403, 'ikinci qəbul yoxdur');
      await prisma.pkBattle.update({ where: { id: inv2.data.battle.id }, data: { scoreA: 500 } });
      await Promise.all([endPk(inv2.data.battle.id), endPk(inv2.data.battle.id), api('POST', `/pk/${inv2.data.battle.id}/end`, girl2.token)]);
      const wins = await prisma.walletTransaction.count({ where: { refId: inv2.data.battle.id, type: 'PK_WIN' } });
      assert.equal(wins, 1);
      const b = await prisma.pkBattle.findUniqueOrThrow({ where: { id: inv2.data.battle.id } });
      assert.equal(b.winnerId, girl.id);
      assert.equal(getRoom(roomId)?.pk, undefined);
      // Yayın bitəndə gedən PK da bitir
      const inv3 = await api('POST', `/live/${roomId}/pk/invite`, girl.token, { targetRoomId: room2 });
      await api('POST', `/pk/${inv3.data.battle.id}/accept`, girl2.token);
      await api('POST', `/live/${room2}/end`, girl2.token);
      assert.equal((await prisma.pkBattle.findUniqueOrThrow({ where: { id: inv3.data.battle.id } })).status, 'ENDED');
      assert.equal(getRoom(roomId)?.pk, undefined, 'rəqib otaqda PK zolağı qalmır');
      await api('POST', `/live/${roomId}/end`, girl.token);
    });

    await step('Video: paralel bəyənmə/saxlama 500 vermir, sayğac bir dəfə artır', async () => {
      const v = await prisma.video.create({ data: { userId: girl.id, url: 'https://x.az/v.mp4' } });
      const rs = await Promise.all([1, 2, 3].map(() => api('POST', `/videos/${v.id}/like`, man.token)));
      assert.ok(rs.every((r) => r.status === 200), JSON.stringify(rs.map((r) => r.data)));
      await Promise.all([1, 2].map(() => api('POST', `/videos/${v.id}/save`, man.token)));
      await Promise.all([1, 2].map(() => api('POST', `/videos/${v.id}/view`, man.token)));
      const after = await prisma.video.findUniqueOrThrow({ where: { id: v.id } });
      assert.equal(after.likesCount, 1);
      assert.equal(after.savesCount, 1);
      assert.equal(after.views, 1);
      assert.equal((await api('POST', '/videos/nope/view', man.token)).status, 404);
    });

    await step('Bloklanmış istifadəçi ilə uyğunluq yaranmır', async () => {
      await api('POST', `/users/${man2.id}/block`, girl2.token);
      const blocked = await prisma.block.findFirst({ where: { blockerId: girl2.id, blockedId: man2.id } });
      if (!blocked) await prisma.block.create({ data: { blockerId: girl2.id, blockedId: man2.id } });
      const r = await api('POST', '/swipes', man2.token, { toId: girl2.id, action: 'LIKE' });
      assert.equal(r.data.error, 'BLOCKED');
    });

    console.log(`\n${passed} zəng/canlı testi keçdi ✅`);
  } finally {
    sockets.forEach((s) => s.close());
    stopCallBilling();
    await app.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
