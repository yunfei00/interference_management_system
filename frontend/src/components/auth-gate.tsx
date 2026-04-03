"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

function AuthGateContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<"login" | "register">(
    tabParam === "register" ? "register" : "login",
  );

  useEffect(() => {
    setTab(tabParam === "register" ? "register" : "login");
  }, [tabParam]);

  return (
    <main className={styles.page}>
      <aside aria-label="产品标识" className={styles.brand}>
        <div className={styles.brandInner}>
          <div className={styles.brandMark}>{brandInitials()}</div>
          <h1 className={styles.brandTitle}>{APP_NAME}</h1>
          <p className={styles.brandTagline}>企业统一身份与访问入口</p>
        </div>
      </aside>

      <div className={styles.panel}>
        <div className={styles.tabs} role="tablist">
          <button
            aria-selected={tab === "login"}
            className={tab === "login" ? styles.tabActive : styles.tab}
            onClick={() => setTab("login")}
            role="tab"
            type="button"
          >
            登录
          </button>
          <button
            aria-selected={tab === "register"}
            className={tab === "register" ? styles.tabActive : styles.tab}
            onClick={() => setTab("register")}
            role="tab"
            type="button"
          >
            注册
          </button>
        </div>

        <div className={styles.formArea}>
          {tab === "login" ? (
            <LoginForm embedded />
          ) : (
            <RegisterForm onSwitchToLogin={() => setTab("login")} />
          )}
        </div>
      </div>
    </main>
  );
}

export function AuthGate() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.fallback}>加载中…</div>
        </main>
      }
    >
      <AuthGateContent />
    </Suspense>
  );
}
