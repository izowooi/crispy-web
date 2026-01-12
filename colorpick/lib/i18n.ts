import ko from '@/locales/ko.json';
import en from '@/locales/en.json';

export type Language = 'ko' | 'en';

export type TranslationKey = keyof typeof ko;

const translations: Record<Language, Record<TranslationKey, string>> = {
  ko,
  en
};

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key] || key;
}

export function useTranslation(lang: Language) {
  return {
    t: (key: TranslationKey) => getTranslation(lang, key)
  };
}

export const languageNames: Record<Language, string> = {
  ko: '한국어',
  en: 'English'
};
