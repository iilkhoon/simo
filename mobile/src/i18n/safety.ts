/**
 * Təhlükəsizlik mətnləri (zəng/yayın monitorinqi, zəng daxilində şikayət, host/agentlik müqaviləsi, hüquqi sənədlər).
 * index.ts əsas lüğətlərlə dərin birləşdirir.
 */
const az = {
  safety: {
    noticeTitle: 'Görüntülü zənglər təhlükəsizlik üçün yoxlanılır',
    noticeBody:
      'Görüntülü zəng və canlı yayın zamanı kameranın kiçik kadrları avtomatik sistemlə yoxlanılır. Çılpaqlıq, cinsi məzmun və 18 yaşdan kiçiklərin iştirakı qəti qadağandır — aşkarlandıqda video dərhal gizlədilir, zəng bitirilir və hesab birdəfəlik bloklana bilər. Pozuntu sübutları məhdud müddətə saxlanılır və qanunla tələb olunduqda səlahiyyətli orqanlara verilə bilər.',
    noticePoints: ['Çılpaqlıq və cinsi məzmun qadağandır', 'Yalnız 18+ istifadəçilər', 'Qarşı tərəfi zəng daxilində şikayət edə bilərsən', 'Zəngi qeydə almaq (ekran yazısı) qadağandır'],
    noticeAccept: 'Anladım, qəbul edirəm',
    noticeDecline: 'İmtina et',
    guidelines: 'İcma qaydaları',
    privacy: 'Məxfilik siyasəti',
    report: 'Şikayət',
    reportTitle: 'Nəyi bildirmək istəyirsən?',
    reportSub: 'Qarşı tərəfin videosunun kadrı sübut kimi əlavə olunacaq',
    reasons: { NUDITY: 'Çılpaqlıq / cinsi məzmun', UNDERAGE: '18 yaşdan kiçik görünür', HARASSMENT: 'Təhqir, təqib', SCAM: 'Fırıldaq, pul istəyi', VIOLENCE: 'Zorakılıq, hədə', OTHER: 'Digər' } as Record<string, string>,
    reportSent: 'Şikayət göndərildi. Moderatorlar təcili baxacaq.',
    endAfterReport: 'Zəngi bitirmək istəyirsən?',
    endCall: 'Zəngi bitir',
    keepCall: 'Davam et',
    blockToo: 'Blokla',
    hiddenTitle: 'Video gizlədildi',
    hiddenBody: 'Avtomatik sistem qaydalara zidd məzmun aşkarladı. Narahatsansa, zəngi bitir və şikayət et.',
    warnTitle: 'Qaydaların pozulması aşkarlandı',
    warnBody: 'Videon qarşı tərəfə göstərilmir. Çılpaqlıq və cinsi məzmun qadağandır. Təkrar olarsa zəng bitiriləcək və hesabın bloklana bilər.',
    warnLast: 'Bu son xəbərdarlıqdır — növbəti pozuntu zəngi bitirəcək.',
    strike: 'Xəbərdarlıq: {{n}} / {{max}}. {{max}} xəbərdarlıqda hesab dayandırılır.',
    agreementTitleHOST: 'Host müqaviləsi',
    agreementTitleAGENCY: 'Agentlik müqaviləsi',
    agreementBodyHOST:
      'Host olmaq üçün Host müqaviləsini qəbul etməlisən: sən müstəqil podratçısan; cinsi xidmət, çılpaqlıq və tətbiqdən kənara pul istəmək qadağandır; vergi öhdəliklərinə özün cavabdehsən; pozuntuda qazanc geri alına bilər.',
    agreementBodyAGENCY:
      'Agentlik yaratmaq üçün Agentlik müqaviləsini qəbul etməlisən: hostlarının davranışına və 18+ yaşına görə məsuliyyət daşıyırsan; komissiya, xitam və pozuntuda geri alma qaydaları müqavilədədir.',
    agreementRead: 'Mətni oxu',
    agreementAccept: 'Oxudum, qəbul edirəm',
    legal: 'Hüquqi sənədlər',
    hostAgreement: 'Host müqaviləsi',
    agencyAgreement: 'Agentlik müqaviləsi',
    signupNote: 'Görüntülü zənglər və yayınlar təhlükəsizlik üçün avtomatik yoxlanılır. ',
  },
  call: { reasons: { SAFETY_VIOLATION: 'Zəng qaydaların pozulmasına görə bitirildi', SAFETY_SUSPENDED: 'Hesab müvəqqəti dayandırıldı', SAFETY_BANNED: 'Hesab bloklandı', REPORTED: 'Zəng bitirildi' } },
  errors: {
    HOST_AGREEMENT_REQUIRED: 'Əvvəlcə Host müqaviləsini qəbul et', AGENCY_AGREEMENT_REQUIRED: 'Əvvəlcə Agentlik müqaviləsini qəbul et',
    HOST_KYC_REQUIRED: 'Host olmaq üçün şəxsiyyət təsdiqi lazımdır', UNDERAGE_LOCKED: 'Simo yalnız 18 yaşdan yuxarı şəxslər üçündür',
    SUSPENDED: 'Hesab qaydaların pozulmasına görə müvəqqəti dayandırılıb',
  },
};

const ru = {
  safety: {
    noticeTitle: 'Видеозвонки проверяются в целях безопасности',
    noticeBody:
      'Во время видеозвонков и эфиров небольшие кадры с камеры автоматически проверяются системой. Нагота, сексуальный контент и участие лиц младше 18 лет строго запрещены — при обнаружении видео сразу скрывается, звонок завершается, а аккаунт может быть заблокирован навсегда. Доказательства нарушений хранятся ограниченное время и по требованию закона могут быть переданы компетентным органам.',
    noticePoints: ['Нагота и сексуальный контент запрещены', 'Только для 18+', 'Собеседника можно пожаловаться прямо из звонка', 'Запись звонка (запись экрана) запрещена'],
    noticeAccept: 'Понятно, принимаю',
    noticeDecline: 'Отказаться',
    guidelines: 'Правила сообщества',
    privacy: 'Политика конфиденциальности',
    report: 'Жалоба',
    reportTitle: 'О чём вы хотите сообщить?',
    reportSub: 'Кадр видео собеседника будет приложен как доказательство',
    reasons: { NUDITY: 'Нагота / сексуальный контент', UNDERAGE: 'Похоже, младше 18', HARASSMENT: 'Оскорбления, преследование', SCAM: 'Мошенничество, просьба денег', VIOLENCE: 'Насилие, угрозы', OTHER: 'Другое' } as Record<string, string>,
    reportSent: 'Жалоба отправлена. Модераторы рассмотрят её срочно.',
    endAfterReport: 'Завершить звонок?',
    endCall: 'Завершить звонок',
    keepCall: 'Продолжить',
    blockToo: 'Заблокировать',
    hiddenTitle: 'Видео скрыто',
    hiddenBody: 'Автоматическая система обнаружила запрещённый контент. Если вам некомфортно, завершите звонок и пожалуйтесь.',
    warnTitle: 'Обнаружено нарушение правил',
    warnBody: 'Ваше видео не показывается собеседнику. Нагота и сексуальный контент запрещены. При повторе звонок будет завершён, а аккаунт может быть заблокирован.',
    warnLast: 'Это последнее предупреждение — следующее нарушение завершит звонок.',
    strike: 'Предупреждение: {{n}} / {{max}}. При {{max}} предупреждениях аккаунт приостанавливается.',
    agreementTitleHOST: 'Договор хоста',
    agreementTitleAGENCY: 'Договор агентства',
    agreementBodyHOST:
      'Чтобы стать хостом, примите Договор хоста: вы — независимый подрядчик; секс-услуги, нагота и просьбы о деньгах вне приложения запрещены; вы сами отвечаете за налоги; при нарушениях заработок может быть удержан.',
    agreementBodyAGENCY:
      'Чтобы создать агентство, примите Договор агентства: вы отвечаете за поведение своих хостов и их возраст 18+; комиссия, расторжение и удержания при нарушениях описаны в договоре.',
    agreementRead: 'Прочитать текст',
    agreementAccept: 'Прочитал(а), принимаю',
    legal: 'Правовые документы',
    hostAgreement: 'Договор хоста',
    agencyAgreement: 'Договор агентства',
    signupNote: 'Видеозвонки и эфиры автоматически проверяются в целях безопасности. ',
  },
  call: { reasons: { SAFETY_VIOLATION: 'Звонок завершён из-за нарушения правил', SAFETY_SUSPENDED: 'Аккаунт временно приостановлен', SAFETY_BANNED: 'Аккаунт заблокирован', REPORTED: 'Звонок завершён' } },
  errors: {
    HOST_AGREEMENT_REQUIRED: 'Сначала примите Договор хоста', AGENCY_AGREEMENT_REQUIRED: 'Сначала примите Договор агентства',
    HOST_KYC_REQUIRED: 'Чтобы стать хостом, нужна верификация личности', UNDERAGE_LOCKED: 'Simo только для лиц старше 18 лет',
    SUSPENDED: 'Аккаунт временно приостановлен за нарушение правил',
  },
};

const en = {
  safety: {
    noticeTitle: 'Video calls are monitored for safety',
    noticeBody:
      'During video calls and live streams, small frames from your camera are checked by automated systems. Nudity, sexual content and anyone under 18 are strictly forbidden — if detected, the video is hidden immediately, the call is ended and the account may be permanently banned. Evidence of violations is kept for a limited time and may be shared with the competent authorities where required by law.',
    noticePoints: ['No nudity or sexual content', '18+ only', 'You can report the other person from inside the call', 'Recording the call (screen recording) is forbidden'],
    noticeAccept: 'I understand and accept',
    noticeDecline: 'Decline',
    guidelines: 'Community Guidelines',
    privacy: 'Privacy Policy',
    report: 'Report',
    reportTitle: 'What do you want to report?',
    reportSub: 'A frame of the other person’s video will be attached as evidence',
    reasons: { NUDITY: 'Nudity / sexual content', UNDERAGE: 'Looks under 18', HARASSMENT: 'Abuse, harassment', SCAM: 'Scam, asking for money', VIOLENCE: 'Violence, threats', OTHER: 'Other' } as Record<string, string>,
    reportSent: 'Report sent. Moderators will review it urgently.',
    endAfterReport: 'Do you want to end the call?',
    endCall: 'End call',
    keepCall: 'Continue',
    blockToo: 'Block',
    hiddenTitle: 'Video hidden',
    hiddenBody: 'Our automated system detected content that breaks the rules. If you feel uncomfortable, end the call and report.',
    warnTitle: 'Rule violation detected',
    warnBody: 'Your video is not being shown to the other person. Nudity and sexual content are forbidden. If it happens again the call will be ended and your account may be banned.',
    warnLast: 'This is your final warning — the next violation ends the call.',
    strike: 'Strike {{n}} / {{max}}. At {{max}} strikes the account is suspended.',
    agreementTitleHOST: 'Host Agreement',
    agreementTitleAGENCY: 'Agency Agreement',
    agreementBodyHOST:
      'To become a host you must accept the Host Agreement: you are an independent contractor; sexual services, nudity and asking for money outside the app are forbidden; you are responsible for your own taxes; earnings may be clawed back for violations.',
    agreementBodyAGENCY:
      'To create an agency you must accept the Agency Agreement: you are responsible for your hosts’ conduct and for their being 18+; commission, termination and clawback rules are set out in the agreement.',
    agreementRead: 'Read the text',
    agreementAccept: 'I have read and accept',
    legal: 'Legal documents',
    hostAgreement: 'Host Agreement',
    agencyAgreement: 'Agency Agreement',
    signupNote: 'Video calls and live streams are automatically checked for safety. ',
  },
  call: { reasons: { SAFETY_VIOLATION: 'Call ended for a rule violation', SAFETY_SUSPENDED: 'Account temporarily suspended', SAFETY_BANNED: 'Account banned', REPORTED: 'Call ended' } },
  errors: {
    HOST_AGREEMENT_REQUIRED: 'Please accept the Host Agreement first', AGENCY_AGREEMENT_REQUIRED: 'Please accept the Agency Agreement first',
    HOST_KYC_REQUIRED: 'Identity verification is required to become a host', UNDERAGE_LOCKED: 'Simo is only for people aged 18 and over',
    SUSPENDED: 'Your account is temporarily suspended for breaking the rules',
  },
};

export const safetyI18n = { az, ru, en };
