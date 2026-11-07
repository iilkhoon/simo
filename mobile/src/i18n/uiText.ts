/**
 * Dizayn yeniləməsi (Nar 3) ilə gələn mətnlər — `ui.*` bölməsi.
 * Ayrıca faylda saxlanılır ki, digər bölmələrin lüğətləri ilə toqquşmasın; index.ts birləşdirir.
 */
const az = {
  ui: {
    lbEmpty: 'Hələ reytinq yoxdur',
    lbEmptySub: 'Hədiyyə göndər və ya qəbul et — adın burada parlasın',
    savedSub: 'Bəyəndiyin postları yadda saxla, hamısı burada toplanacaq',
    rafflesSub: 'Yeni çəkilişlər tezliklə başlayacaq. Bildirişləri açıq saxla',
    notifSub: 'Bəyənmələr, uyğunluqlar və hədiyyələr burada görünəcək',
    liveEmptySub: 'Yayına başla və ilk tamaşaçılarını topla',
    searchSub: 'Ad və ya ID ilə istənilən hesabı tap',
    noTagsSub: 'Başqa söz yoxla',
    inviteCode: 'Dəvət kodun',
    streakDays: 'gün ardıcıl',
    viewAll: 'Hamısı',
  },
};

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
type UiDict = DeepString<typeof az>;

const ru: UiDict = {
  ui: {
    lbEmpty: 'Пока нет рейтинга',
    lbEmptySub: 'Отправляй или получай подарки — и твоё имя засияет здесь',
    savedSub: 'Сохраняй понравившиеся посты — они соберутся здесь',
    rafflesSub: 'Новые розыгрыши скоро начнутся. Не выключай уведомления',
    notifSub: 'Здесь появятся лайки, совпадения и подарки',
    liveEmptySub: 'Начни эфир и собери первых зрителей',
    searchSub: 'Найди любой аккаунт по имени или ID',
    noTagsSub: 'Попробуй другое слово',
    inviteCode: 'Твой код приглашения',
    streakDays: 'дней подряд',
    viewAll: 'Все',
  },
};

const en: UiDict = {
  ui: {
    lbEmpty: 'No rankings yet',
    lbEmptySub: 'Send or receive gifts to see your name shine here',
    savedSub: 'Save posts you love and they will gather here',
    rafflesSub: 'New raffles are coming soon. Keep notifications on',
    notifSub: 'Likes, matches and gifts will show up here',
    liveEmptySub: 'Go live and gather your first viewers',
    searchSub: 'Find any account by name or ID',
    noTagsSub: 'Try another word',
    inviteCode: 'Your invite code',
    streakDays: 'day streak',
    viewAll: 'All',
  },
};

export const uiText = { az, ru, en };
