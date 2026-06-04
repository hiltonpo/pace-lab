import { useTranslation } from "react-i18next";

type Locale = "ja" | "zh" | "en";

const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  zh: "繁體中文",
  en: "English",
};

export function useLocale() {
  const { i18n } = useTranslation();

  const locale = i18n.language as Locale;
  const changeLocale = (newLocale: Locale) => {
    i18n.changeLanguage(newLocale);
  };

  return {
    locale,
    changeLocale,
    available: Object.keys(LOCALE_LABELS) as Locale[],
    labels: LOCALE_LABELS,
  };
}
