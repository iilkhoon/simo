/**
 * Mövsümi kampaniyalar (backend: routes/campaigns.ts). Siyahı 5 dəqiqəlik yaddaşda saxlanılır —
 * banner və hədiyyə pəncərəsi hər açılışda serverə getməsin.
 */
import { useEffect, useState } from 'react';
import i18n from '../i18n';
import { api } from './api';
import type { PublicUser } from './types';

type L = { az: string; ru: string; en: string };
export interface Campaign {
  id: string; slug: string; title: L; subtitle: L; prizes: L;
  emoji: string; color: string; color2: string; imageUrl: string | null;
  giftIds: string[]; startsAt: string; endsAt: string; status: 'upcoming' | 'live' | 'ended';
}
export interface CampaignRow { rank: number; score: number; user: PublicUser }
export interface CampaignDetail { campaign: Campaign; senders: CampaignRow[]; hosts: CampaignRow[]; me: { sent: number; received: number } }

export const loc = (x: L) => { const l = i18n.language; return (l === 'ru' ? x.ru : l === 'en' ? x.en : x.az) || x.az; };

let cache: { at: number; items: Campaign[] } | null = null;
let inflight: Promise<Campaign[]> | null = null;

export function loadCampaigns(force = false): Promise<Campaign[]> {
  if (!force && cache && Date.now() - cache.at < 5 * 60_000) return Promise.resolve(cache.items);
  inflight ??= api<{ items: Campaign[] }>('/campaigns')
    .then((r) => { cache = { at: Date.now(), items: r.items }; return r.items; })
    .catch(() => cache?.items ?? [])
    .finally(() => { inflight = null; });
  return inflight;
}

/** Gedən / yaxınlaşan kampaniyalar */
export function useCampaigns() {
  const [items, setItems] = useState<Campaign[]>(cache?.items ?? []);
  useEffect(() => { let on = true; void loadCampaigns().then((x) => on && setItems(x)); return () => { on = false; }; }, []);
  return items;
}

/** Hədiyyə pəncərəsində xüsusi tab üçün: gedən və öz hədiyyə siyahısı olan ilk kampaniya */
export function useLiveGiftCampaign() {
  return useCampaigns().find((c) => c.status === 'live' && c.giftIds.length > 0) ?? null;
}

/** "2 gün 4 saat" kimi qısa qalan vaxt */
export function leftText(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const t = (k: string, n: number) => i18n.t(`growth.${k}`, { n });
  if (d > 0) return `${t('days', d)} ${h ? t('hours', h) : ''}`.trim();
  if (h > 0) return `${t('hours', h)} ${m ? t('minutes', m) : ''}`.trim();
  return t('minutes', Math.max(1, m));
}
