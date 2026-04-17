"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { hasDashboardPermission } from "@/lib/dashboard-navigation";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./department-pages.module.css";

type DepartmentAccessGuardProps = {
  requiredPermissions: string[];
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DepartmentAccessGuard({
  requiredPermissions,
  title,
  description,
  children,
}: DepartmentAccessGuardProps) {
  const { state } = useDashboardSession();
  const t = useTranslations();

  if (state.kind === "loading") {
    return (
      <div className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <div className={styles.empty}>{t("common.departmentAccess.loading")}</div>
        </section>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <h1 className={styles.panelTitle}>{t("common.departmentAccess.loadFailed")}</h1>
          <div className={styles.empty}>{state.message}</div>
        </section>
      </div>
    );
  }

  if (!hasDashboardPermission(state.data.permissions, requiredPermissions)) {
    return (
      <div className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <h1 className={styles.panelTitle}>{title}</h1>
          <p className={styles.panelText}>{description}</p>
          <div className={styles.empty}>{t("common.departmentAccess.forbidden")}</div>
          <div className={styles.actions}>
            <Link className="buttonGhost" href="/dashboard">
              {t("common.actions.backToDashboard")}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
