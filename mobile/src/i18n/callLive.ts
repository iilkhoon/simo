/**
 * Zəng və canlı yayın təcrübəsinin mətnləri: zəngdən əvvəl təsdiq, xərc sayğacı, zəng içində yükləmə,
 * yenidən qoşulma, şəbəkə keyfiyyəti, zəngdən sonra xülasə, canlı otaq (izləyicilər, top dəstəkçilər).
 * index.ts əsas lüğətlərlə dərin birləşdirir.
 */
const az = {
  cl: {
    confirmTitleVideo: 'Görüntülü zəng', confirmTitleVoice: 'Səsli zəng',
    perMin: '/dəq', free: 'Pulsuz', freeSub: 'Uyğunluğunuz var — zəng pulsuzdur',
    balance: 'Balansın', enoughFor: '≈ {{n}} dəqiqəyə çatır', enoughForMany: '{{n}}+ dəqiqəyə çatır',
    notEnough: 'Bir dəqiqə üçün {{n}} Nar lazımdır', vipDiscount: 'VIP endirimi: {{old}} → {{price}}',
    firstMinute: 'İlk dəqiqə qəbul olunanda tutulur, sonra hər dəqiqə başında. Cavab verilməsə — heç nə tutulmur.',
    callNow: 'Zəng et', rechargeAndCall: 'Yüklə və zəng et', unavailable: 'Hazırda zəng etmək olmur',
    spent: 'Xərc', minutesLeft: '{{n}} dəq qalıb', earned: 'Qazanc', nextMinute: 'növbəti dəqiqə {{s}} san sonra',
    lowTitle: 'Balans az qalıb', lowSub: 'Balansın təxminən {{n}} dəqiqəyə çatır. Zəngi kəsmədən yüklə.',
    lowLast: 'Son dəqiqə! Yükləməsən, zəng {{s}} saniyəyə bitəcək.', recharge: 'Yüklə',
    rechargeTitle: 'Zəngi kəsmədən yüklə', rechargeSub: 'Zəng davam edir — ödənişdən sonra bura qayıdacaqsan',
    bought: '+{{n}} Nar yükləndi — söhbətə davam!',
    reconnecting: 'Yenidən qoşulur…', reconnectingSub: 'Şəbəkə zəifdir, bir neçə saniyə gözlə', peerReconnecting: '{{name}} yenidən qoşulur…',
    netGood: 'Yaxşı', netFair: 'Orta', netPoor: 'Zəif', netBad: 'Çox zəif',
    minimize: 'Kiçilt', endConfirm: 'Zəngi bitirmək istəyirsən?', endCta: 'Bitir',
    summaryTitle: 'Zəng bitdi', summaryDuration: 'Müddət', summarySpent: 'Xərclənən', summaryEarned: 'Qazanılan', summaryGifts: 'Hədiyyələr',
    rateQ: 'Zəng necə idi?', rateHostQ: 'İstifadəçi necə idi?', rated: 'Təşəkkürlər! 💛',
    callAgain: 'Yenidən zəng et', follow: 'İzlə', following: 'İzləyirsən', sendGift: 'Hədiyyə', message: 'Yaz', done: 'Bağla',
    notConnected: 'Zəng baş tutmadı',
    // Canlı otaq
    viewersTitle: 'İzləyicilər', viewersEmpty: 'Hələ izləyici yoxdur', topTitle: 'Top dəstəkçilər', topEmpty: 'İlk hədiyyəni sən göndər — siyahıya düş!',
    inRoom: '{{n}} nəfər otaqda', joinedBanner: '{{name}} qoşuldu', liveReconnecting: 'Bağlantı bərpa olunur…',
    sendComment: 'Göndər', sayHi: 'Salam 👋', quickHi: ['Salam 👋', 'Çox gözəlsən 😍', '❤️❤️❤️', 'Haradansan?'],
    pkDraw: 'Bərabərlik', pkWin: 'Qalib', pkYou: 'Sən',
    hostLeft: 'Host bağlantını itirdi — gözləyirik…',
  },
  errors: {
    PK_EXPIRED: 'PK dəvətinin vaxtı bitib', CALL_NOT_ENDED: 'Zəng hələ bitməyib', RETRY: 'Yenidən cəhd et',
  },
};

type Dict = typeof az;

const ru: Dict = {
  cl: {
    confirmTitleVideo: 'Видеозвонок', confirmTitleVoice: 'Аудиозвонок',
    perMin: '/мин', free: 'Бесплатно', freeSub: 'У вас взаимная симпатия — звонок бесплатный',
    balance: 'Твой баланс', enoughFor: '≈ на {{n}} мин', enoughForMany: 'на {{n}}+ мин',
    notEnough: 'Для одной минуты нужно {{n}} Нар', vipDiscount: 'Скидка VIP: {{old}} → {{price}}',
    firstMinute: 'Первая минута списывается после ответа, далее — в начале каждой минуты. Не ответили — ничего не списывается.',
    callNow: 'Позвонить', rechargeAndCall: 'Пополнить и позвонить', unavailable: 'Сейчас позвонить нельзя',
    spent: 'Расход', minutesLeft: 'осталось {{n}} мин', earned: 'Доход', nextMinute: 'следующая минута через {{s}} с',
    lowTitle: 'Мало на балансе', lowSub: 'Баланса хватит примерно на {{n}} мин. Пополни, не прерывая звонок.',
    lowLast: 'Последняя минута! Без пополнения звонок закончится через {{s}} с.', recharge: 'Пополнить',
    rechargeTitle: 'Пополнить, не прерывая звонок', rechargeSub: 'Звонок продолжается — после оплаты вернёшься сюда',
    bought: '+{{n}} Нар — продолжайте общение!',
    reconnecting: 'Переподключение…', reconnectingSub: 'Слабая сеть, подожди несколько секунд', peerReconnecting: '{{name}} переподключается…',
    netGood: 'Хорошая', netFair: 'Средняя', netPoor: 'Слабая', netBad: 'Очень слабая',
    minimize: 'Свернуть', endConfirm: 'Завершить звонок?', endCta: 'Завершить',
    summaryTitle: 'Звонок завершён', summaryDuration: 'Длительность', summarySpent: 'Потрачено', summaryEarned: 'Заработано', summaryGifts: 'Подарки',
    rateQ: 'Как прошёл звонок?', rateHostQ: 'Как вам собеседник?', rated: 'Спасибо! 💛',
    callAgain: 'Позвонить снова', follow: 'Подписаться', following: 'Вы подписаны', sendGift: 'Подарок', message: 'Написать', done: 'Закрыть',
    notConnected: 'Звонок не состоялся',
    viewersTitle: 'Зрители', viewersEmpty: 'Пока нет зрителей', topTitle: 'Топ дарителей', topEmpty: 'Отправь первый подарок — попади в топ!',
    inRoom: '{{n}} в комнате', joinedBanner: '{{name}} заходит', liveReconnecting: 'Восстанавливаем связь…',
    sendComment: 'Отправить', sayHi: 'Привет 👋', quickHi: ['Привет 👋', 'Ты красивая 😍', '❤️❤️❤️', 'Откуда ты?'],
    pkDraw: 'Ничья', pkWin: 'Победа', pkYou: 'Ты',
    hostLeft: 'Ведущий потерял связь — ждём…',
  },
  errors: {
    PK_EXPIRED: 'Приглашение на PK истекло', CALL_NOT_ENDED: 'Звонок ещё не завершён', RETRY: 'Попробуй ещё раз',
  },
};

const en: Dict = {
  cl: {
    confirmTitleVideo: 'Video call', confirmTitleVoice: 'Voice call',
    perMin: '/min', free: 'Free', freeSub: "You're a match — this call is free",
    balance: 'Your balance', enoughFor: '≈ {{n}} min of talk', enoughForMany: '{{n}}+ min of talk',
    notEnough: 'You need {{n}} Nar for one minute', vipDiscount: 'VIP discount: {{old}} → {{price}}',
    firstMinute: 'The first minute is charged when she answers, then at the start of each minute. No answer — no charge.',
    callNow: 'Call now', rechargeAndCall: 'Top up & call', unavailable: "Can't call right now",
    spent: 'Spent', minutesLeft: '{{n}} min left', earned: 'Earned', nextMinute: 'next minute in {{s}}s',
    lowTitle: 'Low balance', lowSub: 'Your balance covers about {{n}} min. Top up without leaving the call.',
    lowLast: 'Last minute! Without a top-up the call ends in {{s}}s.', recharge: 'Top up',
    rechargeTitle: 'Top up without hanging up', rechargeSub: 'The call keeps going — you’ll come right back here',
    bought: '+{{n}} Nar added — keep talking!',
    reconnecting: 'Reconnecting…', reconnectingSub: 'Weak network, give it a few seconds', peerReconnecting: '{{name}} is reconnecting…',
    netGood: 'Good', netFair: 'Fair', netPoor: 'Poor', netBad: 'Very poor',
    minimize: 'Minimize', endConfirm: 'End this call?', endCta: 'End',
    summaryTitle: 'Call ended', summaryDuration: 'Duration', summarySpent: 'Spent', summaryEarned: 'Earned', summaryGifts: 'Gifts',
    rateQ: 'How was the call?', rateHostQ: 'How was the caller?', rated: 'Thanks! 💛',
    callAgain: 'Call again', follow: 'Follow', following: 'Following', sendGift: 'Gift', message: 'Message', done: 'Close',
    notConnected: "Call didn't connect",
    viewersTitle: 'Viewers', viewersEmpty: 'No viewers yet', topTitle: 'Top supporters', topEmpty: 'Send the first gift and top the list!',
    inRoom: '{{n}} in the room', joinedBanner: '{{name}} joined', liveReconnecting: 'Reconnecting…',
    sendComment: 'Send', sayHi: 'Hi 👋', quickHi: ['Hi 👋', "You're gorgeous 😍", '❤️❤️❤️', 'Where are you from?'],
    pkDraw: 'Draw', pkWin: 'Winner', pkYou: 'You',
    hostLeft: 'Host lost connection — waiting…',
  },
  errors: {
    PK_EXPIRED: 'The PK invite has expired', CALL_NOT_ENDED: 'The call has not ended yet', RETRY: 'Please try again',
  },
};

export const callLive = { az, ru, en };
