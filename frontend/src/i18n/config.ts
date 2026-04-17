export const APP_LOCALE_COOKIE = "ims_locale";
export const DEFAULT_LOCALE = "zh-CN";
export const SUPPORTED_LOCALES = ["zh-CN", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized.startsWith("zh-")) {
    return "zh-CN";
  }
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }
  return null;
}

export function resolveLocaleFromAcceptLanguage(
  headerValue: string | null | undefined,
): AppLocale {
  if (!headerValue) {
    return DEFAULT_LOCALE;
  }

  const candidates = headerValue
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}

export function toIntlLocale(locale: AppLocale): string {
  return locale === "zh-CN" ? "zh-CN" : "en-US";
}
