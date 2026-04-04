"use client";

import Link from "next/link";

import { hasDashboardPermission } from "@/lib/dashboard-navigation";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./department-pages.module.css";

type DepartmentAccessGuardProps = {
  /** 须全部具备 */
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

  if (state.kind === "loading") {
    return (
      <div className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <div className={styles.empty}>正在加载页面权限...</div>
        </section>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <h1 className={styles.panelTitle}>无法加载当前页面</h1>
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
          <div className={styles.empty}>
            当前账号没有访问该页面的权限，请联系管理员调整所属部门或权限配置。
          </div>
          <div className={styles.actions}>
            <Link className="buttonGhost" href="/dashboard">
              返回工作台
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return <>{children}</>;
}
