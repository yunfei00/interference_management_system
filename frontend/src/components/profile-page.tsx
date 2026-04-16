"use client";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./account-settings.module.css";

export function ProfilePage() {
  const { state } = useDashboardSession();

  if (state.kind !== "ready") {
    return null;
  }

  const { user } = state.data;

  return (
    <div className={styles.page}>
      <section className={`surface ${styles.panel}`}>
        <div className="eyebrow">My Account</div>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.text}>
          Personal information is sourced from the backend session and user directory.
        </p>
        <div className={styles.grid}>
          <div className={styles.field}>
            <span className={styles.label}>Username</span>
            <div className={styles.value}>{user.username}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Real Name</span>
            <div className={styles.value}>{user.real_name || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Email</span>
            <div className={styles.value}>{user.email || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Phone</span>
            <div className={styles.value}>{user.phone || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Department</span>
            <div className={styles.value}>{user.department_full_name || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Title</span>
            <div className={styles.value}>{user.title || "-"}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Role</span>
            <div className={styles.value}>{user.role_name}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Status</span>
            <div className={styles.value}>{user.status_name}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
