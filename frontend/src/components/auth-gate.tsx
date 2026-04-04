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
    return "—";
  }
  return name.length <= 2 ? name : name.slice(0, 2);
}

export type AuthGateProps = {
  /** 无 `?tab=` 时的默认页签（如 `/register` 设为 register） */
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
        <aside aria-label="产品标识" className={styles.brand}>
          <div className={styles.brandInner}>
            <div className={styles.brandMark}>{brandInitials()}</div>
            <h1 className={styles.brandTitle}>{APP_NAME}</h1>
            <p className={styles.brandTagline}>
              企业统一身份认证。登录与注册均在站内完成，数据由公司后台统一审批与授权。
            </p>
            <p className={styles.brandFoot}>内部信息系统 · 受控访问</p>
          </div>
        </aside>

        <div className={styles.panel}>
          <div aria-label="账户操作" className={styles.tabs} role="tablist">
            <button
              aria-controls={loginPanelId}
              aria-selected={activeTab === "login"}
              className={activeTab === "login" ? styles.tabActive : styles.tab}
              id="auth-tab-login"
              onClick={() => setTab("login")}
              role="tab"
              type="button"
            >
              登录
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
              注册
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
          <div className={styles.fallback}>加载中…</div>
        </div>
      }
    >
      <AuthGateContent {...props} />
    </Suspense>
  );
}
