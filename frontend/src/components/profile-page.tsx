"use client";

import { useTranslations } from "next-intl";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./account-settings.module.css";

export function ProfilePage() {
  const { state } = useDashboardSession();
  const t = useTranslations();

  if (state.kind !== "ready") {
    return null;
  }

  const { user } = state.data;

  return (
    <div className={styles.page}>
      <section className={`surface ${styles.panel}`}>
        <div className="eyebrow">{t("auth.profile.eyebrow")}</div>
        <h1 className={styles.title}>{t("auth.profile.title")}</h1>
        <p className={styles.text}>{t("auth.profile.subtitle")}</p>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>{t("auth.profile.username")}</span>
            <div className={styles.value}>{user.username}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>{t("auth.profile.realName")}</span>
            <div className={styles.value}>{user.real_name || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>{t("auth.profile.email")}</span>
            <div className={styles.value}>{user.email || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>{t("auth.profile.phone")}</span>
            <div className={styles.value}>{user.phone || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>{t("auth.profile.department")}</span>
            <div className={styles.value}>{user.department_full_name || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>{t("auth.profile.titleField")}</span>
            <div className={styles.value}>{user.title || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>{t("auth.profile.role")}</span>
            <div className={styles.value}>{user.role_name}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>{t("auth.profile.status")}</span>
            <div className={styles.value}>{user.status_name}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
