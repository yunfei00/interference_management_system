"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useTransition,
} from "react";

import { apiFetch } from "@/lib/api-client";
import { APP_NAME } from "@/lib/public-config";

import { DashboardSidebar } from "./dashboard-sidebar";
import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./dashboard-shell.module.css";

const FORCE_PASSWORD_PATH = "/dashboard/change-password";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
          <div className="eyebrow">Session Error</div>
          <h1 className={styles.panelTitle}>Unable to open the workspace</h1>
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
              {isRefreshing ? "Retrying..." : "Reload Session"}
            </button>
            <Link className="buttonGhost" href="/login">
              Back to Login
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
          <div className="eyebrow">Security Action</div>
          <h1 className={styles.panelTitle}>Password update required</h1>
          <p className={styles.errorText}>
            An administrator has reset your password. Update it before you continue using the system.
          </p>
        </section>
      </main>
    );
  }

  return (
    <div className={styles.appShell}>
      <header className={styles.appHeader}>
        <Link className={styles.appBrand} href="/dashboard">
          {APP_NAME}
        </Link>
        <div className={styles.appHeaderMeta}>
          <span>{session.user.display_name || session.user.username}</span>
          <span className={styles.metaSep}>|</span>
          <span>{session.user.department_full_name || "Unassigned Department"}</span>
        </div>
        <div className={styles.appHeaderActions}>
          {mustChangePassword ? (
            <span className={styles.forceBadge}>Password update required</span>
          ) : (
            <>
              <Link className="buttonGhost" href="/dashboard/profile">
                Profile
              </Link>
              <Link className="buttonGhost" href="/dashboard/change-password">
                Change Password
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
            {isRefreshing ? "Refreshing..." : "Refresh"}
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
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
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
