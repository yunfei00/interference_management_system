"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useTransition } from "react";

import { apiFetch } from "@/lib/api-client";
import { APP_NAME } from "@/lib/public-config";

import { DashboardSidebar } from "./dashboard-sidebar";
import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./dashboard-shell.module.css";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { state, refreshSession } = useDashboardSession();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();

  async function handleLogout() {
    await apiFetch("/api/auth/logout", {
      method: "POST",
    });
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  if (state.kind === "loading") {
    return (
      <div className={styles.appShell}>
        <header className={styles.appHeader}>
          <span className={styles.appBrand}>{APP_NAME}</span>
        </header>
        <div className={styles.appBody}>
          <aside className={styles.appSidebar}>
            <div className={styles.skeletonStack}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          </aside>
          <main className={styles.appMain}>
            <div className={styles.skeletonStack}>
              <div className={styles.skeleton} />
              <div className={styles.skeleton} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <main className={styles.page}>
        <section className={`surface ${styles.errorCard}`}>
          <div className="eyebrow">会话异常</div>
          <h1 className={styles.panelTitle}>无法进入工作台</h1>
          <p className={styles.errorText}>{state.message}</p>
          <div className={styles.actionRow}>
            <button
              className="button"
              onClick={() =>
                startRefreshTransition(() => {
                  refreshSession();
                })
              }
              type="button"
            >
              {isRefreshing ? "重试中..." : "重新获取会话"}
            </button>
            <Link className="buttonGhost" href="/login">
              返回登录
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const session = state.data;

  return (
    <div className={styles.appShell}>
      <header className={styles.appHeader}>
        <Link className={styles.appBrand} href="/dashboard">
          {APP_NAME}
        </Link>
        <div className={styles.appHeaderMeta}>
          <span>{session.user.username}</span>
          <span className={styles.metaSep}>·</span>
          <span>{session.user.department_full_name || "未分配部门"}</span>
        </div>
        <div className={styles.appHeaderActions}>
          <button
            className="buttonGhost"
            onClick={() =>
              startRefreshTransition(() => {
                refreshSession();
              })
            }
            type="button"
          >
            {isRefreshing ? "刷新中..." : "刷新会话"}
          </button>
          <button
            className="button"
            onClick={() =>
              startLogoutTransition(() => {
                void handleLogout();
              })
            }
            type="button"
          >
            {isLoggingOut ? "退出中..." : "退出登录"}
          </button>
        </div>
      </header>

      <div className={styles.appBody}>
        <aside className={styles.appSidebar}>
          <DashboardSidebar />
        </aside>
        <main className={styles.appMain}>{children}</main>
      </div>
    </div>
  );
}
