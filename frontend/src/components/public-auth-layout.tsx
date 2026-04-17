"use client";

import { useTranslations } from "next-intl";

import gateStyles from "./auth-gate.module.css";
import { LanguageSwitcher } from "./language-switcher";

function brandInitials(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    return "IM";
  }
  return normalized.length <= 2 ? normalized : normalized.slice(0, 2).toUpperCase();
}

export function PublicAuthLayout({
  titleKey,
  descriptionKey,
  children,
}: {
  titleKey: string;
  descriptionKey: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const appName = t("common.appName");

  return (
    <div className={gateStyles.shell}>
      <main className={gateStyles.page}>
        <aside aria-label={t("auth.productIdentity")} className={gateStyles.brand}>
          <div className={gateStyles.brandInner}>
            <div className={gateStyles.brandTop}>
              <LanguageSwitcher variant="dark" />
            </div>
            <div className={gateStyles.brandMark}>{brandInitials(appName)}</div>
            <h1 className={gateStyles.brandTitle}>{appName}</h1>
            <p className={gateStyles.brandTagline}>{t(descriptionKey)}</p>
            <p className={gateStyles.brandFoot}>{t(titleKey)}</p>
          </div>
        </aside>
        <div className={gateStyles.panel}>
          <div className={gateStyles.formArea}>{children}</div>
        </div>
      </main>
    </div>
  );
}
