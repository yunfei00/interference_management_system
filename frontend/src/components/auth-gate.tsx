"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useState } from "react";

import { LanguageSwitcher } from "./language-switcher";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import styles from "./auth-gate.module.css";

function brandInitials(name: string) {
  const normalized = name.trim();
  if (!normalized) {
    return "IM";
  }
  return normalized.length <= 2 ? normalized : normalized.slice(0, 2).toUpperCase();
}

export type AuthGateProps = {
  defaultTab?: "login" | "register";
};

function AuthGateContent({ defaultTab = "login" }: AuthGateProps) {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const appName = t("common.appName");
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
        <aside aria-label={t("auth.productIdentity")} className={styles.brand}>
          <div className={styles.brandInner}>
            <div className={styles.brandTop}>
              <LanguageSwitcher variant="dark" />
            </div>
            <div className={styles.brandMark}>{brandInitials(appName)}</div>
            <h1 className={styles.brandTitle}>{appName}</h1>
            <p className={styles.brandTagline}>{t("auth.gate.tagline")}</p>
            <p className={styles.brandFoot}>{t("auth.gate.foot")}</p>
          </div>
        </aside>

        <div className={styles.panel}>
          <div
            aria-label={t("auth.accountActions")}
            className={styles.tabs}
            role="tablist"
          >
            <button
              aria-controls={loginPanelId}
              aria-selected={activeTab === "login"}
              className={activeTab === "login" ? styles.tabActive : styles.tab}
              id="auth-tab-login"
              onClick={() => setTab("login")}
              role="tab"
              type="button"
            >
              {t("auth.tabs.login")}
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
              {t("auth.tabs.register")}
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
  const t = useTranslations("auth");

  return (
    <Suspense
      fallback={
        <div className={styles.shell}>
          <div className={styles.fallback}>{t("loading")}</div>
        </div>
      }
    >
      <AuthGateContent {...props} />
    </Suspense>
  );
}
