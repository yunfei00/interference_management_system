import { cookies, headers } from "next/headers";

import {
  APP_LOCALE_COOKIE,
  DEFAULT_LOCALE,
  normalizeLocale,
  resolveLocaleFromAcceptLanguage,
  type AppLocale,
} from "./config";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = normalizeLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  if (cookieLocale) {
    return cookieLocale;
  }

  const headerStore = await headers();
  return resolveLocaleFromAcceptLanguage(
    headerStore.get("accept-language"),
  ) || DEFAULT_LOCALE;
}
