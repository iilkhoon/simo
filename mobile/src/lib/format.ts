import i18n from '../i18n';
import type { Gift } from './types';

export function errorText(e: unknown): string {
  const code = (e as { code?: string })?.code ?? 'SERVER_ERROR';
  const key = `errors.${code}`;
  return i18n.exists(key) ? i18n.t(key) : i18n.t('common.error');
}

export function giftName(g: Pick<Gift, 'nameAz' | 'nameRu' | 'nameEn'>): string {
  const l = i18n.language;
  return l === 'ru' ? g.nameRu : l === 'en' ? g.nameEn : g.nameAz;
}

export function duration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const l = i18n.language;
  const u = l === 'ru' ? ['сейчас', 'мин', 'ч', 'д'] : l === 'en' ? ['now', 'm', 'h', 'd'] : ['indi', 'dəq', 'saat', 'gün'];
  if (diff < 60) return u[0];
  if (diff < 3600) return `${Math.floor(diff / 60)} ${u[1]}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${u[2]}`;
  return `${Math.floor(diff / 86400)} ${u[3]}`;
}

export function clock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function azn(qepik: number): string {
  return `${(qepik / 100).toFixed(2)} ₼`;
}

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** Çatda tarix ayırıcısı: Bu gün / Dünən / 12.03 */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return i18n.t('common.today');
  if (same(d, y)) return i18n.t('common.yesterday');
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
