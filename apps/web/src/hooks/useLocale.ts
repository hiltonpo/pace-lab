import { useTranslation } from "react-i18next";

type Locale = "ja" | "zh" | "en";

const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  zh: "繁體中文",
  en: "English",
};

const SUPPORTED_LOCALES = Object.keys(LOCALE_LABELS) as Locale[];

function normalizeLocale(raw: string | undefined): Locale {
  // 取前兩個字（"zh-TW" → "zh"、"en-US" → "en"）
  const short = (raw ?? "").slice(0, 2).toLowerCase();
  if (SUPPORTED_LOCALES.includes(short as Locale)) {
    return short as Locale;
  }
  return "ja"; // fallback
}

export function useLocale() {
  const { i18n } = useTranslation();

  const locale = normalizeLocale(i18n.language);
  const changeLocale = (newLocale: Locale) => {
    i18n.changeLanguage(newLocale);
  };

  return {
    locale,
    changeLocale,
    available: SUPPORTED_LOCALES,
    labels: LOCALE_LABELS,
  };
}
