"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { getBreadcrumbItems } from "@/lib/dashboard-navigation";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./dashboard-breadcrumb.module.css";

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const { state } = useDashboardSession();
  const t = useTranslations("nav");

  if (state.kind !== "ready") {
    return null;
  }

  let items = getBreadcrumbItems(pathname, state.data.permissions);
  if (pathname.startsWith("/dashboard/electromagnetic/interference")) {
    items = items.filter((item) => item.key !== "portal");
  }
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label={t("breadcrumb")} className={styles.crumbRow}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span className={styles.crumbUnit} key={item.key}>
            {index > 0 ? <span className={styles.crumbSep}>/</span> : null}
            {isLast ? (
              <span className={styles.crumbCurrent}>{t(item.key)}</span>
            ) : (
              <Link className={styles.crumbLink} href={item.href as Route}>
                {t(item.key)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
