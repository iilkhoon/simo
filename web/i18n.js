/* Simo veb tərcümələri. Azərbaycan mətni HTML-in özündədir (data-i18n), ru/en burada. */
(function () {
  const RU = {
    'nav.features': 'Возможности', 'nav.gifts': 'Подарки', 'nav.coins': 'Монеты', 'nav.hosts': 'Хостам', 'nav.faq': 'Вопросы', 'nav.download': 'Скачать',
    'hero.kicker': '🇦🇿 Создано для Азербайджана', 'hero.t1': 'Знакомься.', 'hero.t2': 'Общайся.', 'hero.t3': 'Люби.',
    'hero.lead': 'Случайное видеознакомство в одно касание, голосовые комнаты, прямые эфиры и подарки. Находи настоящие связи рядом с тобой.',
    'hero.cta': 'Скачать бесплатно', 'hero.cta2': 'Стань хостом', 'hero.s1': 'видеознакомство', 'hero.s2': 'видов подарков', 'hero.s3': 'языка: AZ · RU · EN',
    'f.label': 'Возможности', 'f.title': 'Всё в одном приложении', 'f.sub': 'Лучшее от приложения знакомств, стриминговой платформы и мессенджера — просто, безопасно и весело.',
    'f.1t': 'Случайное видеознакомство', 'f.1d': 'Одна кнопка — и ты уже лицом к лицу с кем-то онлайн. Не понравилось? Жми «Дальше». Есть и голосовой режим — без камеры.',
    'f.2t': 'Голосовые комнаты', 'f.2d': 'Комнаты на 8 мест: караоке, мугам, общение. Займи место и говори.',
    'f.3t': 'Прямой эфир', 'f.3d': 'Выходи в эфир, общайся со зрителями, получай подарки.',
    'f.4t': 'Чат и звонки', 'f.4d': 'Сообщения, фото, видео- и аудиозвонки — всё внутри приложения.',
    'f.5t': 'Люди рядом', 'f.5d': 'Находи людей в нескольких километрах от тебя.',
    'f.6t': 'Короткие видео', 'f.6d': 'Листай ленту, лайкай, комментируй и дари подарки любимым авторам.',
    'g.label': 'Подарки', 'g.title': 'Скажи подарком, а не словами', 'g.sub': 'От розы до Девичьей башни — большие подарки показываются анимацией на всю комнату.',
    'c.label': 'Simo Coin', 'c.title': 'Пакеты монет', 'c.sub': 'Монеты нужны для сообщений, звонков, подарков и VIP. Цены в манатах.',
    'c.x2': 'При первом пополнении монеты любого пакета удваиваются!', 'c.note': 'Для пользователей Huawei и оплаты через сайт:', 'c.topup': 'Пополнить (по Simo ID) →',
    'v.label': 'VIP', 'v.title': 'Будь впереди всех', 'v.sub': 'Бесплатные сообщения, скидки на звонки, кто тебя лайкнул — и многое другое.',
    'v.s': 'Серебро', 'v.s1': '10 бесплатных сообщений в день', 'v.s2': 'Скидка 5% на звонки', 'v.s3': 'Безлимитные лайки',
    'v.best': 'Выгоднее', 'v.g': 'Золото', 'v.g1': '30 бесплатных сообщений в день', 'v.g2': 'Скидка 10% на звонки', 'v.g3': 'Смотри, кто тебя лайкнул', 'v.g4': 'Режим инкогнито',
    'v.d': 'Бриллиант', 'v.d1': '100 бесплатных сообщений в день', 'v.d2': 'Скидка 20% на звонки', 'v.d3': 'Особый эффект входа', 'v.d4': 'В 1.5× чаще в поиске',
    'h.label': 'Для хостов', 'h.title': 'Общайся — зарабатывай', 'h.sub': 'Подтверждённые хосты получают алмазы за сообщения, звонки и подарки и выводят их в манатах.',
    'h.calc': 'Калькулятор дохода', 'h.msgs': 'Сообщений в день', 'h.mins': 'Минут звонков в день', 'h.gifts': 'Подарков в день (монет)', 'h.month': 'Примерный доход в месяц',
    'h.disclaimer': 'Расчёт примерный; реальный доход зависит от активности.',
    'h.s1t': 'Создай профиль', 'h.s1d': 'Добавь красивые фото и заполни профиль.', 'h.s2t': 'Пройди проверку селфи', 'h.s2d': 'Подтверди, что ты реальный человек — фейкам здесь не место.',
    'h.s3t': 'Общайся и зарабатывай', 'h.s3d': 'За каждое сообщение, минуту звонка и подарок начисляются алмазы.', 'h.s4t': 'Выводи деньги', 'h.s4d': '100 алмазов = 1 ₼. Вывод на карту, m10 или eManat.',
    'a.label': 'Агентства', 'a.title': 'Собери команду и зарабатывайте вместе', 'a.sub': 'Откройте агентство, приглашайте хостов и получайте дополнительную комиссию с их дохода. Комиссия платится из доли платформы — доход хоста не уменьшается.',
    'a.box': 'комиссия агентства — дополнительно с алмазного дохода каждого хоста.',
    's.label': 'Безопасность', 's.title': 'Для спокойного общения', 's.1t': 'Проверенные хосты', 's.1d': 'Реальные люди с проверкой селфи.',
    's.2t': 'Скрытые данные', 's.2d': 'Номера телефонов и ссылки в чате скрываются автоматически.', 's.3t': 'Блок и жалоба', 's.3d': 'Блокируй любого пользователя в одно касание.',
    's.4t': 'Только 18+', 's.4d': 'Модерация работает 24/7.',
    'q.label': 'Вопросы', 'q.title': 'Частые вопросы',
    'q.1q': 'Simo бесплатный?', 'q.1a': 'Да. Регистрация, поиск, лайки и мэтчи бесплатны. Монеты нужны для сообщений хостам, платных звонков и подарков.',
    'q.2q': 'Как купить монеты?', 'q.2a': 'В приложении через App Store или Google Play. На устройствах Huawei и на сайте — банковской картой через Epoint.',
    'q.3q': 'Как стать хостом?', 'q.3a': 'В профиле открой «Стать хостом», пройди проверку селфи. После одобрения начнёшь получать алмазы за сообщения, звонки и подарки.',
    'q.4q': 'Как вывести заработок?', 'q.4a': 'Минимум 5000 алмазов (50 ₼). Заявка переводится на карту, m10 или eManat за 1–3 рабочих дня.',
    'q.5q': 'Как работает видеознакомство?', 'q.5a': 'Нажми «Видеознакомство» — система найдёт свободного человека онлайн. Позвони или нажми «Дальше». Оплата начинается только после ответа.',
    'd.title': 'Скачай Simo сейчас', 'd.sub': '50 монет в подарок при регистрации и бонус ×2 при первом пополнении.', 'd.ios': 'Для iPhone', 'd.android': 'Для Android', 'd.huawei': 'Для Huawei',
    'ft.topup': 'Пополнить', 'ft.terms': 'Условия использования', 'ft.privacy': 'Политика конфиденциальности', 'ft.support': 'Поддержка',
    // JS
    'js.popular': 'Популярный', 'js.bonus': '+{n} бонус', 'js.marquee': ['Видеознакомство', 'Голосовые комнаты', 'Прямые эфиры', 'Подарки', 'VIP', 'Люди рядом', 'Короткие видео'],
    // topup
    'tp.title': 'Пополнить монеты', 'tp.sub': 'Введи свой Simo ID (Профиль → ID) и выбери пакет. Оплата банковской картой через Epoint.',
    'tp.id': 'Simo ID', 'tp.find': 'Найти', 'tp.notFound': 'Пользователь не найден', 'tp.pick': 'Выбери пакет', 'tp.pay': 'Оплатить', 'tp.success': 'Оплата прошла! Монеты уже на балансе.',
    'tp.error': 'Оплата не прошла. Попробуй ещё раз.', 'tp.secure': 'Платёж обрабатывается Epoint. Данные карты не передаются Simo.', 'tp.back': '← На главную',
  };
  const EN = {
    'nav.features': 'Features', 'nav.gifts': 'Gifts', 'nav.coins': 'Coins', 'nav.hosts': 'Hosts', 'nav.faq': 'FAQ', 'nav.download': 'Download',
    'hero.kicker': '🇦🇿 Made for Azerbaijan', 'hero.t1': 'Meet.', 'hero.t2': 'Talk.', 'hero.t3': 'Love.',
    'hero.lead': 'One-tap random video matching, voice rooms, live streams and gifts. Build real connections with people near you.',
    'hero.cta': 'Download free', 'hero.cta2': 'Become a host', 'hero.s1': 'video matching', 'hero.s2': 'kinds of gifts', 'hero.s3': 'languages: AZ · RU · EN',
    'f.label': 'Features', 'f.title': 'Everything in one app', 'f.sub': 'The best of a dating app, a streaming platform and a messenger — simple, safe and fun.',
    'f.1t': 'Random video match', 'f.1d': 'One button and you are face to face with someone online. Not your vibe? Hit “Next”. Voice mode too — no camera needed.',
    'f.2t': 'Voice rooms', 'f.2d': '8-seat rooms for karaoke, mugham and chats. Take a seat and talk.',
    'f.3t': 'Live streaming', 'f.3d': 'Go live, chat with viewers and receive gifts.',
    'f.4t': 'Chat & calls', 'f.4d': 'Messages, photos, video and voice calls — all inside the app.',
    'f.5t': 'People nearby', 'f.5d': 'Discover people just a few kilometres away.',
    'f.6t': 'Short videos', 'f.6d': 'Swipe the feed, like, comment and send gifts to creators you love.',
    'g.label': 'Gifts', 'g.title': 'Say it with a gift', 'g.sub': 'From a rose to the Maiden Tower — big gifts play a full-room animation.',
    'c.label': 'Simo Coin', 'c.title': 'Coin packages', 'c.sub': 'Use coins for messages, calls, gifts and VIP. Prices in manat.',
    'c.x2': 'Your first top-up doubles the coins of any package!', 'c.note': 'For Huawei users and web payments:', 'c.topup': 'Top up (with Simo ID) →',
    'v.label': 'VIP', 'v.title': 'Stay ahead of everyone', 'v.sub': 'Free messages, call discounts, see who liked you and more.',
    'v.s': 'Silver', 'v.s1': '10 free messages a day', 'v.s2': '5% off calls', 'v.s3': 'Unlimited likes',
    'v.best': 'Best value', 'v.g': 'Gold', 'v.g1': '30 free messages a day', 'v.g2': '10% off calls', 'v.g3': 'See who liked you', 'v.g4': 'Incognito mode',
    'v.d': 'Diamond', 'v.d1': '100 free messages a day', 'v.d2': '20% off calls', 'v.d3': 'Special room entry effect', 'v.d4': '1.5× more visible in discovery',
    'h.label': 'For hosts', 'h.title': 'Chat and earn', 'h.sub': 'Verified hosts earn diamonds from messages, calls and gifts — and cash them out in manat.',
    'h.calc': 'Earnings calculator', 'h.msgs': 'Messages per day', 'h.mins': 'Call minutes per day', 'h.gifts': 'Gifts per day (coins)', 'h.month': 'Estimated monthly earnings',
    'h.disclaimer': 'An estimate only; real earnings depend on activity.',
    'h.s1t': 'Create a profile', 'h.s1d': 'Add great photos and complete your profile.', 'h.s2t': 'Verify with a selfie', 'h.s2d': 'Prove you are a real person — no fakes allowed.',
    'h.s3t': 'Chat and earn', 'h.s3d': 'Every message, call minute and gift adds diamonds.', 'h.s4t': 'Cash out', 'h.s4d': '100 diamonds = 1 ₼. Withdraw to card, m10 or eManat.',
    'a.label': 'Agencies', 'a.title': 'Build a team and earn together', 'a.sub': 'Open an agency, invite hosts and earn an extra commission on their income. The commission comes from the platform share — hosts keep their full earnings.',
    'a.box': 'agency commission — on top of every host’s diamond earnings.',
    's.label': 'Safety', 's.title': 'Built for comfortable chats', 's.1t': 'Verified hosts', 's.1d': 'Real people with selfie verification.',
    's.2t': 'Private details', 's.2d': 'Phone numbers and links are hidden in chat automatically.', 's.3t': 'Block & report', 's.3d': 'Block anyone with a single tap.',
    's.4t': '18+ only', 's.4d': 'Moderation works 24/7.',
    'q.label': 'FAQ', 'q.title': 'Frequently asked questions',
    'q.1q': 'Is Simo free?', 'q.1a': 'Yes. Sign-up, discovery, likes and matches are free. Coins are needed for messages to hosts, paid calls and gifts.',
    'q.2q': 'How do I buy coins?', 'q.2a': 'In the app via the App Store or Google Play. On Huawei devices and on the website you can pay by bank card through Epoint.',
    'q.3q': 'How do I become a host?', 'q.3a': 'Open “Become a host” in your profile and verify with a selfie. Once approved you start earning diamonds from messages, calls and gifts.',
    'q.4q': 'How do I cash out?', 'q.4a': 'Minimum 5000 diamonds (50 ₼). Requests are paid to a bank card, m10 or eManat within 1–3 business days.',
    'q.5q': 'How does video match work?', 'q.5a': 'Tap “Video match” and we find someone online and free. Call them or hit “Next”. Billing starts only after they answer.',
    'd.title': 'Get Simo now', 'd.sub': '50 free coins on sign-up and a ×2 bonus on your first top-up.', 'd.ios': 'For iPhone', 'd.android': 'For Android', 'd.huawei': 'For Huawei',
    'ft.topup': 'Top up', 'ft.terms': 'Terms of Use', 'ft.privacy': 'Privacy Policy', 'ft.support': 'Support',
    'js.popular': 'Popular', 'js.bonus': '+{n} bonus', 'js.marquee': ['Video match', 'Voice rooms', 'Live streams', 'Gifts', 'VIP', 'People nearby', 'Short videos'],
    'tp.title': 'Top up coins', 'tp.sub': 'Enter your Simo ID (Profile → ID) and pick a package. Pay by bank card via Epoint.',
    'tp.id': 'Simo ID', 'tp.find': 'Find', 'tp.notFound': 'User not found', 'tp.pick': 'Pick a package', 'tp.pay': 'Pay', 'tp.success': 'Payment successful! Coins are on your balance.',
    'tp.error': 'Payment failed. Please try again.', 'tp.secure': 'Payments are processed by Epoint. Card details are never shared with Simo.', 'tp.back': '← Home',
  };
  const AZ_JS = {
    'js.popular': 'Populyar', 'js.bonus': '+{n} bonus', 'js.marquee': ['Video tanışlıq', 'Səsli otaqlar', 'Canlı yayın', 'Hədiyyələr', 'VIP', 'Yaxınlıqdakılar', 'Qısa videolar'],
    'tp.title': 'Coin yüklə', 'tp.sub': 'Simo ID-ni daxil et (Profil → ID) və paketi seç. Ödəniş Epoint vasitəsilə bank kartı ilə.',
    'tp.id': 'Simo ID', 'tp.find': 'Tap', 'tp.notFound': 'İstifadəçi tapılmadı', 'tp.pick': 'Paket seç', 'tp.pay': 'Ödə', 'tp.success': 'Ödəniş uğurludur! Coinlər balansına əlavə olundu.',
    'tp.error': 'Ödəniş alınmadı. Yenidən cəhd et.', 'tp.secure': 'Ödəniş Epoint tərəfindən emal olunur. Kart məlumatları Simo-ya ötürülmür.', 'tp.back': '← Ana səhifə',
  };
  const DICTS = { ru: RU, en: EN, az: AZ_JS };
  const az = {};
  let lang = 'az';
  try {
    const saved = localStorage.getItem('simo.lang');
    if (saved && DICTS[saved]) lang = saved;
    else if (/^ru/i.test(navigator.language)) lang = 'ru';
    else if (/^en/i.test(navigator.language) && !/^az/i.test(navigator.language)) lang = 'en';
  } catch (e) { /* storage bağlıdır */ }

  function t(key, vars) {
    let v = (DICTS[lang] && DICTS[lang][key]) ?? az[key] ?? AZ_JS[key] ?? key;
    if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    return v;
  }

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (!(k in az)) az[k] = el.innerHTML;
      el.innerHTML = lang === 'az' ? az[k] : (DICTS[lang][k] ?? az[k]);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
    document.querySelectorAll('[data-lang]').forEach((b) => b.classList.toggle('on', b.getAttribute('data-lang') === lang));
    document.dispatchEvent(new CustomEvent('simo:lang', { detail: lang }));
  }

  function set(l) {
    if (!DICTS[l]) return;
    lang = l;
    try { localStorage.setItem('simo.lang', l); } catch (e) { /* ignore */ }
    apply();
  }

  window.SimoI18n = { t, apply, set, get lang() { return lang; } };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (b) set(b.getAttribute('data-lang'));
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
