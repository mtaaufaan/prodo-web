import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import id from './locales/id.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'id',
    supportedLngs: ['id', 'en'],
    ns: ['common'],
    defaultNS: 'common',
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    resources: {
      id: { common: id },
      en: { common: en },
    },
  })

export default i18n
