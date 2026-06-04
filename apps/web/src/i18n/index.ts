import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import jaCommon from "./locales/ja/common.json";
import zhCommon from "./locales/zh/common.json";
import enCommon from "./locales/en/common.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ja: { common: jaCommon },
      zh: { common: zhCommon },
      en: { common: enCommon },
    },
    fallbackLng: "ja",
    defaultNS: "common",
    supportedLngs: ["ja", "zh", "en"],
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false, // React 本身會做 escape
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
