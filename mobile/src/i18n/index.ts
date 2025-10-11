import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      si: {
        translation: {
          welcome: "ගොවි පද්ධතියට ඔබ සාදරයෙන් පිළිගනිමු!",
          go_to_tasks: "කාර්ය ලැයිස්තුවට යන්න",
          tasks: "කාර්යයන්",
          task_details: "කාර්ය විස්තර"
        }
      }
    },
    lng: 'si',
    fallbackLng: 'si',
    interpolation: { escapeValue: false }
  });

export default i18n;
