import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import si from './si.json';

i18n.use(initReactI18next).init({
  lng: 'si',
  fallbackLng: 'si',
  resources: { si: { translation: si } },
  interpolation: { escapeValue: false }
});

export default i18n;
