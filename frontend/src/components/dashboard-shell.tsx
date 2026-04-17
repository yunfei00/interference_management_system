"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startTransition, useEffect, useTransition } from "react";

import { apiFetch } from "@/lib/api-client";

import { DashboardSidebar } from "./dashboard-sidebar";
import { useDashboardSession } from "./dashboard-session-provider";
import { LanguageSwitcher } from "./language-switcher";
import styles from "./dashboard-shell.module.css";

const FORCE_PASSWORD_PATH = "/dashboard/change-password";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const appName = t("common.appName");
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

  useEffect(() => {
    if (state.kind !== "ready") {
      return;
    }
    if (
      state.data.user.must_change_password &&
      pathname !== FORCE_PASSWORD_PATH
    ) {
      startTransition(() => {
        router.replace(FORCE_PASSWORD_PATH);
      });
    }
  }, [pathname, router, state]);

  if (state.kind === "loading") {
    return (
      <div className={styles.appShell}>
        <header className={styles.appHeader}>
          <span className={styles.appBrand}>{appName}</span>
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
          <div className="eyebrow">{t("dashboard.sessionErrorEyebrow")}</div>
          <h1 className={styles.panelTitle}>{t("dashboard.sessionErrorTitle")}</h1>
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
              {isRefreshing
                ? t("dashboard.retrying")
                : t("dashboard.reloadSession")}
            </button>
            <Link className="buttonGhost" href="/login">
              {t("common.actions.backToLogin")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const session = state.data;
  const mustChangePassword = session.user.must_change_password;
  const showRestrictedShell = mustChangePassword && pathname !== FORCE_PASSWORD_PATH;

  if (showRestrictedShell) {
    return (
      <main className={styles.page}>
        <section className={`surface ${styles.errorCard}`}>
          <div className="eyebrow">{t("dashboard.securityEyebrow")}</div>
          <h1 className={styles.panelTitle}>{t("dashboard.passwordRequiredTitle")}</h1>
          <p className={styles.errorText}>{t("dashboard.passwordRequiredDescription")}</p>
        </section>
      </main>
    );
  }

  return (
    <div className={styles.appShell}>
      <header className={styles.appHeader}>
        <Link className={styles.appBrand} href="/dashboard">
          {appName}
        </Link>
        <div className={styles.appHeaderMeta}>
          <span>{session.user.display_name || session.user.username}</span>
          <span className={styles.metaSep}>|</span>
          <span>
            {session.user.department_full_name || t("dashboard.unassignedDepartment")}
          </span>
        </div>
        <div className={styles.appHeaderActions}>
          <LanguageSwitcher />
          {mustChangePassword ? (
            <span className={styles.forceBadge}>{t("dashboard.passwordRequiredBadge")}</span>
          ) : (
            <>
              <Link className="buttonGhost" href="/dashboard/profile">
                {t("dashboard.profile")}
              </Link>
              <Link className="buttonGhost" href="/dashboard/change-password">
                {t("dashboard.changePassword")}
              </Link>
            </>
          )}
          <button
            className="buttonGhost"
            onClick={() =>
              startRefreshTransition(() => {
                refreshSession();
              })
            }
            type="button"
          >
            {isRefreshing ? t("dashboard.refreshing") : t("dashboard.refresh")}
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
            {isLoggingOut ? t("dashboard.signingOut") : t("dashboard.signOut")}
          </button>
        </div>
      </header>

      <div className={styles.appBody}>
        {mustChangePassword ? null : (
          <aside className={styles.appSidebar}>
            <DashboardSidebar />
          </aside>
        )}
        <main className={styles.appMain}>{children}</main>
      </div>
    </div>
  );
}
