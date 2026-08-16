import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// TODO S1: Add proper translation files under src/i18n/locales/
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'id',
    supportedLngs: ['id', 'en'],
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
    resources: {
      id: {
        translation: {
          welcome: 'Selamat datang di PRODO',
        },
      },
      en: {
        translation: {
          welcome: 'Welcome to PRODO',
        },
      },
    },
  })

export default i18n
