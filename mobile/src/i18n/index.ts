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
          task_details: "කාර්ය විස්තර",
          // ReportCreate strings
          field: 'ක්ෂේත්‍රය',
          date: 'දිනය',
          issueType: 'ගැටලුවේ වර්ගය',
          description: 'විස්තරය',
          photo: 'ඡායාරූප',
          takePhoto: 'ඡායාරූප ගන්න',
          pickPhoto: 'ගැලරියෙන් තෝරන්න',
          voiceNote: 'හඬ සටහන',
          record: 'රෙකෝඩ් කරන්න',
          play: 'ඇසෙන්න',
          stop: 'නවත්වන්න',
          saveReport: 'වාර්තාව සුරකින්න',
          report: 'වාර්තාව'
          ,
          enterDetails: 'විස්තර ඇතුලත් කරන්න'
          ,
          profile: 'පැතිකඩ'
          ,
          permission: 'අවසර',
          mediaLibraryPermission: 'මාධ්‍ය පුස්තකාල අවසරය අවශ්‍යයි',
          cameraPermission: 'කැමරා අවසරය අවශ්‍යයි',
          microphonePermission: 'මයික්‍රොෆෝන් අවසරය අවශ්‍යයි',
          imageError: 'ඡායාරූප දෝෂය',
          cameraError: 'කැමරා දෝෂය',
          recordError: 'හඬ සටහන් දෝෂය',
          stopError: 'නවත්වන විලාප දෝෂය',
          playError: 'සවන්දීමේ දෝෂය',
          attached: 'එකතු කර ඇත'
        }
      }
    },
    lng: 'si',
    fallbackLng: 'si',
    interpolation: { escapeValue: false }
  });

export default i18n;
