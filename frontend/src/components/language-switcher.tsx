"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import {
  APP_LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/i18n/config";

import styles from "./language-switcher.module.css";

export function LanguageSwitcher({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("common.language");
  const [isPending, startTransition] = useTransition();

  function updateLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    document.cookie = `${APP_LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <label
      className={`${styles.switcher} ${variant === "dark" ? styles.dark : ""}`}
    >
      <span className={styles.label}>{t("label")}</span>
      <select
        aria-label={t("label")}
        className={styles.select}
        disabled={isPending}
        onChange={(event) => updateLocale(event.target.value as AppLocale)}
        value={locale}
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item} value={item}>
            {t(item)}
          </option>
        ))}
      </select>
    </label>
  );
}
