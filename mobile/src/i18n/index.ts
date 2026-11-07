import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import az from './az';
import ru from './ru';
import en from './en';
import { extra } from './extra';
import { callLive } from './callLive';
import { agencyText } from './agencyText';
import { safetyI18n } from './safety';
import { uiText } from './uiText';
import { growthText } from './growth';
import { ui2Text } from './ui2';
import { qaText } from './qaText';

/** Əlavə lüğət bölmələri — yenisini bu siyahıya əlavə edin */
const PACKS = [extra, callLive, agencyText, safetyI18n, uiText, growthText, ui2Text, qaText];

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
  resources: {
    az: { translation: PACKS.reduce((acc, p) => merge(acc, p.az), az) },
    ru: { translation: PACKS.reduce((acc, p) => merge(acc, p.ru), ru) },
    en: { translation: PACKS.reduce((acc, p) => merge(acc, p.en), en) },
  },
  lng: deviceLang(),
  fallbackLng: 'az',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
