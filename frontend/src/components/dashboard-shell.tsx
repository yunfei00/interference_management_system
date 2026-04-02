"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useTransition } from "react";

import { APP_NAME, DJANGO_PUBLIC_URL } from "@/lib/public-config";

import { DashboardNav } from "./dashboard-nav";
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
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  if (state.kind === "loading") {
    return (
      <main className={styles.page}>
        <section className={`surface ${styles.hero}`}>
          <div className={styles.skeletonStack}>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
            <div className={styles.skeleton} />
          </div>
        </section>
      </main>
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
  const accountType = session.user.is_superuser
    ? "超级管理员"
    : session.user.is_staff
      ? "管理员"
      : "业务用户";

  return (
    <main className={styles.page}>
      <section className={`surface ${styles.hero}`}>
        <div className={styles.heroTop}>
          <div>
            <div className="eyebrow">部门化工作台</div>
            <h1 className={styles.heroTitle}>{APP_NAME}</h1>
            <p className={styles.heroSubtitle}>
              现在系统已经切换到“按公司部门进入”的结构。Django 负责模型、认证和业务 API，
              Next.js 负责部门主页、工作区导航和日常操作体验。
            </p>
          </div>

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
              {isRefreshing ? "刷新中..." : "刷新会话"}
            </button>
            <button
              className="buttonGhost"
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
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaChip}>用户：{session.user.username}</span>
          <span className={styles.metaChip}>
            公司：{session.user.company || "未设置"}
          </span>
          <span className={styles.metaChip}>
            部门：{session.user.department_full_name || "未分配"}
          </span>
          <span className={styles.metaChip}>
            审批状态：{session.user.approve_status}
          </span>
          <span className={styles.metaChip}>
            前端模式：{session.frontend_modes.join(", ")}
          </span>
        </div>

        <DashboardNav />

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>权限项</span>
            <span className={styles.statValue}>{session.permissions.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>可见菜单</span>
            <span className={styles.statValue}>{session.menus.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>账号类型</span>
            <span className={styles.statValue}>{accountType}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>接口模式</span>
            <span className={styles.statValue}>JWT</span>
          </div>
        </div>
      </section>

      {children}

      <section className={styles.content}>
        <div className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>当前用户摘要</h2>
                <p className={styles.panelDescription}>
                  这里保留当前登录用户最关键的身份与组织信息，方便校验部门归属和账号状态。
                </p>
              </div>
            </div>
            <div className={styles.routeList}>
              <div className={styles.routeItem}>
                <span className={styles.routeLabel}>邮箱</span>
                <span className={styles.routeValue}>
                  {session.user.email || "未填写"}
                </span>
              </div>
              <div className={styles.routeItem}>
                <span className={styles.routeLabel}>手机号</span>
                <span className={styles.routeValue}>
                  {session.user.phone || "未填写"}
                </span>
              </div>
              <div className={styles.routeItem}>
                <span className={styles.routeLabel}>部门</span>
                <span className={styles.routeValue}>
                  {session.user.department_full_name || "未分配"}
                </span>
              </div>
              <div className={styles.routeItem}>
                <span className={styles.routeLabel}>最后登录</span>
                <span className={styles.routeValue}>
                  {session.user.last_login || "首次登录或暂无记录"}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>后端直达入口</h2>
                <p className={styles.panelDescription}>
                  用于联调 Django API、Schema 和健康检查。
                </p>
              </div>
            </div>
            <div className={styles.routeList}>
              <a
                className={styles.routeItem}
                href={`${DJANGO_PUBLIC_URL}/api/docs/`}
                rel="noreferrer"
                target="_blank"
              >
                <span className={styles.routeLabel}>Swagger</span>
                <span className={styles.routeValue}>/api/docs/</span>
              </a>
              <a
                className={styles.routeItem}
                href={`${DJANGO_PUBLIC_URL}/api/redoc/`}
                rel="noreferrer"
                target="_blank"
              >
                <span className={styles.routeLabel}>ReDoc</span>
                <span className={styles.routeValue}>/api/redoc/</span>
              </a>
              <a
                className={styles.routeItem}
                href={`${DJANGO_PUBLIC_URL}/healthz/ready/`}
                rel="noreferrer"
                target="_blank"
              >
                <span className={styles.routeLabel}>Readiness</span>
                <span className={styles.routeValue}>/healthz/ready/</span>
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
