import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import studentRU from "./pages/student/language/dashboard/ru.json"
import studentEN from "./pages/student/language/dashboard/en.json"

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        student: studentEN
      },
      ru: {
        student: studentRU
      }
    },
    lng: "ru",
    fallbackLng: "ru",
    ns: ["student"],
    defaultNS: "student",
    interpolation: { escapeValue: false }
  });

export default i18n;
