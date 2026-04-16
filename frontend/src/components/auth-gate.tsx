"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { APP_NAME } from "@/lib/public-config";

import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import styles from "./auth-gate.module.css";

function brandInitials() {
  const name = APP_NAME.trim();
  if (!name) {
    return "IM";
  }
  return name.length <= 2 ? name : name.slice(0, 2).toUpperCase();
}

export type AuthGateProps = {
  defaultTab?: "login" | "register";
};

function AuthGateContent({ defaultTab = "login" }: AuthGateProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const forcedTab =
    tabParam === "register" ? "register" : tabParam === "login" ? "login" : null;

  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const activeTab = forcedTab ?? tab;

  const loginPanelId = "auth-panel-login";
  const registerPanelId = "auth-panel-register";

  return (
    <div className={styles.shell}>
      <main className={styles.page}>
        <aside aria-label="Product identity" className={styles.brand}>
          <div className={styles.brandInner}>
            <div className={styles.brandMark}>{brandInitials()}</div>
            <h1 className={styles.brandTitle}>{APP_NAME}</h1>
            <p className={styles.brandTagline}>
              Enterprise identity, approvals, and access control live inside the same product workspace.
            </p>
            <p className={styles.brandFoot}>Secure enterprise access for the interference management system.</p>
          </div>
        </aside>

        <div className={styles.panel}>
          <div aria-label="Account actions" className={styles.tabs} role="tablist">
            <button
              aria-controls={loginPanelId}
              aria-selected={activeTab === "login"}
              className={activeTab === "login" ? styles.tabActive : styles.tab}
              id="auth-tab-login"
              onClick={() => setTab("login")}
              role="tab"
              type="button"
            >
              Login
            </button>
            <button
              aria-controls={registerPanelId}
              aria-selected={activeTab === "register"}
              className={activeTab === "register" ? styles.tabActive : styles.tab}
              id="auth-tab-register"
              onClick={() => setTab("register")}
              role="tab"
              type="button"
            >
              Register
            </button>
          </div>

          <div className={styles.formArea}>
            <div
              aria-labelledby="auth-tab-login"
              hidden={activeTab !== "login"}
              id={loginPanelId}
              role="tabpanel"
            >
              <LoginForm embedded onSwitchToRegister={() => setTab("register")} />
            </div>
            <div
              aria-labelledby="auth-tab-register"
              hidden={activeTab !== "register"}
              id={registerPanelId}
              role="tabpanel"
            >
              <RegisterForm onSwitchToLogin={() => setTab("login")} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthGate(props: AuthGateProps) {
  return (
    <Suspense
      fallback={
        <div className={styles.shell}>
          <div className={styles.fallback}>Loading...</div>
        </div>
      }
    >
      <AuthGateContent {...props} />
    </Suspense>
  );
}
