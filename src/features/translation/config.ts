export const SUPPORTED_LOCALES = ["ko", "en", "zh"] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type TranslationLocale = Exclude<SupportedLocale, "ko">

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ko: "한국어",
  en: "English",
  zh: "中文",
}

export const LOCALE_COOKIE = "wangwang_locale"
export const DEFAULT_LOCALE: SupportedLocale = "ko"
export const TRANSLATION_MONTHLY_LIMIT = 450_000

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
}

export function isTranslationLocale(value: string): value is TranslationLocale {
  return value === "en" || value === "zh"
}
