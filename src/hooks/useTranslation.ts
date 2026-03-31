import React from 'react';
import { translations, Language } from '../translations';

export function useTranslation(lang: Language) {
  const t = (key: keyof typeof translations.en) => translations[lang][key] || translations.en[key];
  return { t };
}
