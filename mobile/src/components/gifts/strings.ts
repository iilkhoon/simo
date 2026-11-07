/**
 * Hədiyyə UI mətnləri (AZ/RU/EN). Ümumi i18n fayllarına toxunmamaq üçün burada saxlanılır;
 * dil i18n.language-dən götürülür.
 */
import i18n from '../../i18n';

const D = {
  az: {
    you: 'Sən', sent: 'göndərdi', youSent: 'göndərdin', to: 'Kimə', send: 'Göndər', combo: 'KOMBO', tapAgain: 'yenə toxun',
    recharge: 'Artır', needMore: '{{n}} çatmır', popular: 'Populyar', azerbaijan: 'Azərbaycan', romantic: 'Romantik', luxury: 'Lüks', almaz: 'Almaz',
    pick: 'Hədiyyə seç', balance: 'Balans', fx: 'Effekt', full: 'Tam ekran', qty: 'Say',
  },
  ru: {
    you: 'Вы', sent: 'отправил(а)', youSent: 'отправили', to: 'Кому', send: 'Отправить', combo: 'КОМБО', tapAgain: 'жми ещё',
    recharge: 'Пополнить', needMore: 'Не хватает {{n}}', popular: 'Популярные', azerbaijan: 'Азербайджан', romantic: 'Романтика', luxury: 'Люкс', almaz: 'Алмаз',
    pick: 'Выберите подарок', balance: 'Баланс', fx: 'Эффект', full: 'Весь экран', qty: 'Кол-во',
  },
  en: {
    you: 'You', sent: 'sent', youSent: 'sent', to: 'To', send: 'Send', combo: 'COMBO', tapAgain: 'tap again',
    recharge: 'Top up', needMore: '{{n}} short', popular: 'Popular', azerbaijan: 'Azerbaijan', romantic: 'Romantic', luxury: 'Luxury', almaz: 'Almaz',
    pick: 'Pick a gift', balance: 'Balance', fx: 'Effect', full: 'Full screen', qty: 'Qty',
  },
};

export type GiftStr = keyof typeof D.az;

export function gs(key: GiftStr, vars?: Record<string, string | number>): string {
  const l = i18n.language === 'ru' || i18n.language === 'en' ? i18n.language : 'az';
  let s: string = D[l][key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{{${k}}}`, String(v));
  return s;
}
