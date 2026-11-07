/**
 * Böyümə mexanikalarının mətnləri — `growth.*` bölməsi: mövsümi kampaniyalar (banner, səhifə, hədiyyə tabı),
 * zəngdə host tərəfi "zəng tezliklə bitə bilər" banneri, yeni bildiriş növləri (notifTypes.*).
 * index.ts əsas lüğətlərlə dərin birləşdirir.
 */
const az = {
  growth: {
    endingTitle: 'Zəng tezliklə bitə bilər',
    endingSub: 'Həmsöhbətinin balansı bitir — təxminən {{s}} san. qalıb',
    live: 'Gedir', upcoming: 'Tezliklə', ended: 'Bitdi',
    endsIn: 'Bitməsinə {{t}}', startsIn: 'Başlamasına {{t}}',
    days: '{{n}} gün', hours: '{{n}} saat', minutes: '{{n}} dəq',
    open: 'Bax', tab: 'Bayram',
    senders: 'Səxavətlilər', hosts: 'Ulduzlar',
    prizes: 'Mükafatlar', giftsTitle: 'Kampaniya hədiyyələri', rules: 'Kampaniya hədiyyələri göndər — hər Nar sənə xal qazandırır. Reytinq canlı yenilənir.',
    myScore: 'Sənin xalın', sent: 'Göndərdin', received: 'Qəbul etdin',
    empty: 'Hələ heç kim yoxdur — ilk sən ol!', notFound: 'Kampaniya tapılmadı',
    legal: 'Mükafatlar pulsuz promo Nar və profil bəzəkləridir; nağd pula çevrilmir. Apple və Google bu kampaniyanın sponsoru deyil.',
  },
  notifTypes: {
    host_online: 'indi onlayndır 🟢 Elə indi zəng et',
    campaign: '{{emoji}} {{titleAz}} başladı — xüsusi hədiyyələr və reytinq',
  } as Record<string, string>,
};

const ru: typeof az = {
  growth: {
    endingTitle: 'Звонок скоро может закончиться',
    endingSub: 'У собеседника заканчивается баланс — осталось около {{s}} сек.',
    live: 'Идёт', upcoming: 'Скоро', ended: 'Завершён',
    endsIn: 'До конца {{t}}', startsIn: 'До начала {{t}}',
    days: '{{n}} дн.', hours: '{{n}} ч', minutes: '{{n}} мин',
    open: 'Смотреть', tab: 'Праздник',
    senders: 'Щедрые', hosts: 'Звёзды',
    prizes: 'Призы', giftsTitle: 'Подарки акции', rules: 'Дари подарки акции — каждый Нар приносит очки. Рейтинг обновляется в реальном времени.',
    myScore: 'Твои очки', sent: 'Подарено', received: 'Получено',
    empty: 'Пока никого — стань первым!', notFound: 'Акция не найдена',
    legal: 'Призы — бесплатные промо-Нар и украшения профиля; не обмениваются на деньги. Apple и Google не являются спонсорами акции.',
  },
  notifTypes: {
    host_online: 'сейчас онлайн 🟢 Позвони прямо сейчас',
    campaign: '{{emoji}} {{titleRu}} — особые подарки и рейтинг',
  },
};

const en: typeof az = {
  growth: {
    endingTitle: 'The call may end soon',
    endingSub: "Your caller's balance is running out — about {{s}} s left",
    live: 'Live', upcoming: 'Soon', ended: 'Ended',
    endsIn: 'Ends in {{t}}', startsIn: 'Starts in {{t}}',
    days: '{{n}} d', hours: '{{n}} h', minutes: '{{n}} min',
    open: 'Open', tab: 'Holiday',
    senders: 'Top givers', hosts: 'Top stars',
    prizes: 'Prizes', giftsTitle: 'Campaign gifts', rules: 'Send campaign gifts — every Nar earns you points. The leaderboard updates live.',
    myScore: 'Your score', sent: 'Sent', received: 'Received',
    empty: 'Nobody yet — be the first!', notFound: 'Campaign not found',
    legal: 'Prizes are free promo Nar and profile decorations; they cannot be exchanged for cash. Apple and Google are not sponsors of this campaign.',
  },
  notifTypes: {
    host_online: 'is online now 🟢 Call now',
    campaign: '{{emoji}} {{titleEn}} has started — special gifts and leaderboard',
  },
};

export const growthText = { az, ru, en };
