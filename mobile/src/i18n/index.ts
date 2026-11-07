import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import az from './az';
import ru from './ru';
import en from './en';
import { extra } from './extra';
import { safetyI18n } from './safety';

/** Əsas lüğət + yeni bölmələr (dərin birləşmə; eyni bölmədə yeni açarlar əlavə olunur) */
function merge<T extends Record<string, unknown>>(a: T, b: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const cur = out[k];
    out[k] = cur && typeof cur === 'object' && !Array.isArray(cur) && v && typeof v === 'object' && !Array.isArray(v) ? merge(cur as Record<string, unknown>, v as Record<string, unknown>) : v;
  }
  return out as T;
}

export const LANGUAGES = [
  { code: 'az', label: 'Azərbaycanca', flag: '🇦🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode ?? 'az';
  return code === 'ru' || code === 'en' ? code : 'az';
}

void i18n.use(initReactI18next).init({
  resources: { az: { translation: merge(merge(az, extra.az), safetyI18n.az) }, ru: { translation: merge(merge(ru, extra.ru), safetyI18n.ru) }, en: { translation: merge(merge(en, extra.en), safetyI18n.en) } },
  lng: deviceLang(),
  fallbackLng: 'az',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
