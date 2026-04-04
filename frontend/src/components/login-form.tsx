"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import type { ApiEnvelope, AuthUser, SessionPayload } from "@/lib/contracts";
import { apiFetch, logAuthClientConfig } from "@/lib/api-client";
import { APP_NAME } from "@/lib/public-config";

import styles from "./login-form.module.css";

type LoginFormProps = {
  /** 嵌入门户时使用更紧凑的文案与布局 */
  embedded?: boolean;
  onSwitchToRegister?: () => void;
};

export function LoginForm({ embedded = false, onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!username || !password) {
      setError("请输入账号和密码。");
      return;
    }

    try {
      logAuthClientConfig("login submit");
      const response = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const payload = (await response.json()) as ApiEnvelope<SessionPayload | null>;

      if (!response.ok || !payload.success) {
        setError(resolveLoginError(payload.code, payload.message));
        return;
      }

      startTransition(() => {
        const target = resolvePostLoginPath(
          searchParams.get("next"),
          payload.data?.user,
        );
        router.push(target);
        router.refresh();
      });
    } catch (error) {
      console.warn("[auth][login] 浏览器请求异常:", error);
      setError("当前认证网关暂时无法连接后端，请稍后重试。");
    }
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">统一登录</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            受控访问
          </div>
        </div>

        <h1 className={styles.title}>
          {embedded ? "登录" : `登录到 ${APP_NAME}`}
        </h1>
        <p className={styles.subtitle}>
          {embedded
            ? "使用已开通的企业账号登录。"
            : "使用企业账号完成身份认证。系统会结合审批状态与所属部门，自动分配可见页面与工作区权限。"}
        </p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>账号</span>
            <span className={styles.fieldHint}>企业用户名</span>
          </div>
          <input
            autoComplete="username"
            className={styles.input}
            name="username"
            placeholder="请输入账号"
            type="text"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>密码</span>
            <span className={styles.fieldHint}>受控登录口令</span>
          </div>
          <input
            autoComplete="current-password"
            className={styles.input}
            name="password"
            placeholder="请输入密码"
            type="password"
          />
        </label>

        <button className={styles.submitButton} disabled={isPending} type="submit">
          {isPending ? "登录中..." : embedded ? "登录" : "登录平台"}
        </button>
      </form>

      {embedded && onSwitchToRegister ? (
        <div className={styles.embeddedSwitch}>
          <span className={styles.embeddedSwitchText}>还没有企业账号？</span>
          <button
            className={styles.inlineLink}
            onClick={onSwitchToRegister}
            type="button"
          >
            注册账号
          </button>
        </div>
      ) : null}

      {embedded === false ? (
        <>
          <div className={styles.ruleList}>
            <div className={styles.ruleItem}>审批通过后才会开通业务工作台访问权限</div>
            <div className={styles.ruleItem}>登录后自动匹配电磁 / 射频及子部门可见页面</div>
            <div className={styles.ruleItem}>首次启用管理员账号后请及时修改密码并完善部门信息</div>
          </div>

          <div className={styles.footer}>
            <p>如果账号尚未开通，请先完成注册审批或联系管理员处理。</p>
            <p>当前登录页用于企业统一身份认证，不再展示技术迁移说明。</p>
          </div>
        </>
      ) : null}
    </section>
  );
}

function resolvePostLoginPath(
  nextPath: string | null,
  user: AuthUser | undefined,
): Route {
  const raw = nextPath?.trim() ?? "";
  if (
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    raw !== "/dashboard" &&
    raw !== ""
  ) {
    return raw as Route;
  }

  const home = user?.department_page_path?.trim();
  if (home?.startsWith("/")) {
    return home as Route;
  }

  if (user?.is_staff || user?.is_superuser) {
    return "/dashboard";
  }

  return "/dashboard";
}

function resolveLoginError(code: string, fallbackMessage: string) {
  if (
    code === "authentication_failed" ||
    code === "no_active_account" ||
    code === "login_failed"
  ) {
    return "账号或密码错误。";
  }

  if (code === "missing_credentials") {
    return "请输入账号和密码。";
  }

  if (code === "invalid_json") {
    return "登录请求格式不正确。";
  }

  if (code === "backend_unavailable") {
    return "认证网关暂时无法连接后端。";
  }

  if (code === "not_approved") {
    return "当前账号尚未通过审批，暂时无法登录。";
  }

  if (code === "account_disabled") {
    return "该账号已被禁用，请联系管理员。";
  }

  return fallbackMessage || "登录失败，请稍后重试。";
}
