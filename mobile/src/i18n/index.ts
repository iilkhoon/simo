import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import az from './az';
import ru from './ru';
import en from './en';

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
  resources: { az: { translation: az }, ru: { translation: ru }, en: { translation: en } },
  lng: deviceLang(),
  fallbackLng: 'az',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
