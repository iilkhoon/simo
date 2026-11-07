import { prisma } from '../db.js';
import crypto from 'node:crypto';
import { emitToUser, isOnline } from '../realtime/hub.js';

const TITLES: Record<string, Record<string, string>> = {
  message: { az: 'Yeni mesaj', ru: 'Новое сообщение', en: 'New message' },
  match: { az: 'Yeni uyğunluq! 💞', ru: 'Новая пара! 💞', en: "It's a match! 💞" },
  like: { az: 'Kimsə səni bəyəndi 💗', ru: 'Ты кому-то понравился 💗', en: 'Someone likes you 💗' },
  gift: { az: 'Sənə hədiyyə gəldi 🎁', ru: 'Тебе подарок 🎁', en: 'You got a gift 🎁' },
  call: { az: 'Gələn zəng', ru: 'Входящий звонок', en: 'Incoming call' },
  live: { az: 'Canlı yayın başladı', ru: 'Начался эфир', en: 'Live started' },
  visit: { az: 'Profilinə baxdılar 👀', ru: 'Твой профиль смотрели 👀', en: 'Someone viewed your profile 👀' },
  follow: { az: 'Yeni izləyici', ru: 'Новый подписчик', en: 'New follower' },
  agency: { az: 'Agentliyə yeni müraciət', ru: 'Новая заявка в агентство', en: 'New agency application' },
  subscription: { az: 'Yeni abunəçi 💎', ru: 'Новый подписчик 💎', en: 'New subscriber 💎' },
  raffle: { az: 'Çəkilişdə qazandın! 🎉', ru: 'Ты выиграл в розыгрыше! 🎉', en: 'You won the raffle! 🎉' },
  pk: { az: 'PK döyüşünə dəvət ⚔️', ru: 'Приглашение на PK ⚔️', en: 'PK battle invite ⚔️' },
  guest: { az: 'Yayına dəvət', ru: 'Приглашение в эфир', en: 'Live invite' },
  kyc: { az: 'Şəxsiyyət təsdiqi', ru: 'Верификация', en: 'Verification' },
  visit_digest: { az: 'Profilinə {{n}} nəfər baxdı 👀', ru: 'Твой профиль посмотрели {{n}} чел. 👀', en: '{{n}} people viewed your profile 👀' },
  like_digest: { az: '{{n}} nəfər səni bəyəndi 💗', ru: 'Ты понравился {{n}} людям 💗', en: '{{n}} people liked you 💗' },
  offer: { az: 'Sənə özəl təklif bitmək üzrədir ⏳', ru: 'Твоё персональное предложение скоро закончится ⏳', en: 'Your personal offer ends soon ⏳' },
  picks: { az: 'Sənə uyğun {{n}} yeni profil var ✨', ru: 'Для тебя {{n}} новых анкет ✨', en: '{{n}} new profiles picked for you ✨' },
  order: { az: 'Xidmətinə yeni sifariş 🛍', ru: 'Новый заказ на услугу 🛍', en: 'New service order 🛍' },
  order_update: { az: 'Sifarişin yeniləndi', ru: 'Заказ обновлён', en: 'Your order was updated' },
  vip: { az: 'VIP statusun', ru: 'Твой VIP', en: 'Your VIP' },
  comment: { az: 'Postuna şərh yazdılar 💬', ru: 'Новый комментарий 💬', en: 'New comment 💬' },
  post_live: { az: 'Planlanmış postun paylaşıldı ✅', ru: 'Запланированный пост опубликован ✅', en: 'Your scheduled post is live ✅' },
  withdrawal: { az: 'Pul çıxarışı', ru: 'Вывод средств', en: 'Withdrawal' },
  agency_update: { az: 'Agentlik', ru: 'Агентство', en: 'Agency' },
  host_online: { az: '{{name}} indi onlayndır 🟢', ru: '{{name}} сейчас онлайн 🟢', en: '{{name}} is online now 🟢' },
  campaign: { az: '{{emoji}} {{titleAz}} başladı!', ru: '{{emoji}} {{titleRu}} — начинаем!', en: '{{emoji}} {{titleEn}} has started!' },
};

const BODIES: Record<string, Record<string, string>> = {
  visit_digest: { az: 'Kim olduğunu gör — bəlkə sənin tipindir', ru: 'Посмотри, кто это — вдруг твой тип', en: 'See who — maybe your type' },
  like_digest: { az: 'Qarşılıqlı bəyən və söhbətə başla', ru: 'Ответь взаимностью и начни общение', en: 'Like back and start chatting' },
  offer: { az: 'Bonus Nar səni gözləyir — yalnız bir neçə saat', ru: 'Бонусные Нар ждут — всего несколько часов', en: 'Bonus Nar waiting — only a few hours left' },
  picks: { az: 'Zövqünə görə seçdik, bax', ru: 'Подобрали по твоему вкусу', en: 'Picked to your taste' },
  host_online: { az: 'Elə indi zəng et və ya yaz — hələ ki buradadır', ru: 'Позвони или напиши прямо сейчас', en: 'Call or message now while they are here' },
  campaign: { az: 'Xüsusi hədiyyələr və reytinq — mükafatlar səni gözləyir', ru: 'Особые подарки и рейтинг — призы ждут', en: 'Special gifts and leaderboard — prizes await' },
};

/** Bildiriş növü → istifadəçinin bağlaya biləcəyi kateqoriya */
const PREF: Record<string, string> = {
  message: 'messages', call: 'calls', like: 'likes', match: 'likes', like_digest: 'likes', follow: 'follows', visit: 'visits', visit_digest: 'visits',
  subscription: 'subscriptions', live: 'lives', offer: 'offers', picks: 'smart', vip: 'offers', comment: 'messages', host_online: 'follows', campaign: 'offers',
};

const fill = (s: string, d: Record<string, unknown>) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => String(d[k] ?? ''));

/** Expo Push API — iOS (APNs) və Android (FCM) üçün vahid */
export async function sendPush(token: string, title: string, body: string, data: Record<string, unknown>) {
  if (!token.startsWith('ExponentPushToken')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data, sound: 'default', priority: 'high' }),
    });
  } catch {
    /* push uğursuz olsa belə əsas axın dayanmır */
  }
}

export async function notify(
  userId: string,
  type: keyof typeof TITLES,
  opts: { actorId?: string; body?: string; data?: Record<string, unknown>; store?: boolean; pushIfOnline?: boolean; push?: boolean } = {},
) {
  const data = opts.data ?? {};
  if (opts.store !== false) {
    const n = await prisma.notification.create({
      data: { userId, type, actorId: opts.actorId, data: data as object },
    });
    emitToUser(userId, 'notification', { id: n.id, type, actorId: opts.actorId, data, createdAt: n.createdAt });
  }
  if (opts.push === false) return;
  if (isOnline(userId) && !opts.pushIfOnline) return;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true, locale: true, notifPrefs: true } });
  if (!u?.pushToken) return;
  const prefs = (u.notifPrefs ?? {}) as Record<string, boolean>;
  if (PREF[type] && prefs[PREF[type]] === false) return;
  const loc = ['az', 'ru', 'en'].includes(u.locale) ? u.locale : 'az';
  await sendPush(u.pushToken, fill(TITLES[type][loc], data), opts.body ?? fill(BODIES[type]?.[loc] ?? '', data), { type, ...data });
}

/**
 * Gələn zəngi tətbiq bağlı olanda da sistem zəng ekranında göstərmək:
 *  iOS — PushKit VoIP (APNs birbaşa) → CallKit;  Android — yüksək prioritetli data-push → ConnectionService (fon tapşırığı).
 * Heç biri mümkün deyilsə — adi bildiriş. Qaytarır: native zəng push-u göndərildimi.
 */
export async function pushIncomingCall(userId: string, p: { callId: string; type: 'VIDEO' | 'VOICE'; callerName: string; actorId: string }) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true, pushPlatform: true, voipToken: true, notifPrefs: true } });
  if (!u) return false;
  if (((u.notifPrefs ?? {}) as Record<string, boolean>).calls === false) return false;
  if (u.voipToken) {
    const { sendVoip } = await import('./apns.js');
    const uuid = crypto.randomUUID();
    if (await sendVoip(u.voipToken, { uuid, callId: p.callId, callerName: p.callerName, hasVideo: p.type === 'VIDEO' })) return true;
  }
  if (u.pushToken && u.pushPlatform === 'android' && u.pushToken.startsWith('ExponentPushToken')) {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ to: u.pushToken, data: { type: 'call', callId: p.callId, callType: p.type, callerName: p.callerName }, priority: 'high', ttl: 30, _contentAvailable: true }),
      });
      return true;
    } catch { /* adi bildirişə keç */ }
  }
  return false;
}
