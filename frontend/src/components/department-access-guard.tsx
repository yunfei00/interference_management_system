"use client";

import Link from "next/link";

import { hasDashboardPermission } from "@/lib/dashboard-navigation";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./department-pages.module.css";

type DepartmentAccessGuardProps = {
  permission: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DepartmentAccessGuard({
  permission,
  title,
  description,
  children,
}: DepartmentAccessGuardProps) {
  const { state } = useDashboardSession();

  if (state.kind === "loading") {
    return (
      <main className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <div className={styles.empty}>正在加载页面权限...</div>
        </section>
      </main>
    );
  }

  if (state.kind === "error") {
    return (
      <main className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <h1 className={styles.panelTitle}>无法加载当前页面</h1>
          <div className={styles.empty}>{state.message}</div>
        </section>
      </main>
    );
  }

  if (!hasDashboardPermission(state.data.permissions, permission)) {
    return (
      <main className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <h1 className={styles.panelTitle}>{title}</h1>
          <p className={styles.panelText}>{description}</p>
          <div className={styles.empty}>
            当前账号没有访问该部门页面的权限，请联系管理员调整所属部门或权限配置。
          </div>
          <div className={styles.actions}>
            <Link className="buttonGhost" href="/dashboard">
              返回工作台
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
