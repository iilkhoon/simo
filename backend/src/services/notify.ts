import { prisma } from '../db.js';
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
};

/** Expo Push API — iOS (APNs) və Android (FCM) üçün vahid */
async function sendPush(token: string, title: string, body: string, data: Record<string, unknown>) {
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
  opts: { actorId?: string; body?: string; data?: Record<string, unknown>; store?: boolean; pushIfOnline?: boolean } = {},
) {
  const data = opts.data ?? {};
  if (opts.store !== false) {
    const n = await prisma.notification.create({
      data: { userId, type, actorId: opts.actorId, data: data as object },
    });
    emitToUser(userId, 'notification', { id: n.id, type, actorId: opts.actorId, data, createdAt: n.createdAt });
  }
  if (isOnline(userId) && !opts.pushIfOnline) return;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true, locale: true } });
  if (!u?.pushToken) return;
  const loc = ['az', 'ru', 'en'].includes(u.locale) ? u.locale : 'az';
  await sendPush(u.pushToken, TITLES[type][loc], opts.body ?? '', { type, ...data });
}
