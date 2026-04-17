"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import type { ApiEnvelope, AuthUser, SessionPayload } from "@/lib/contracts";
import { apiFetch, logAuthClientConfig } from "@/lib/api-client";

import styles from "./login-form.module.css";

type LoginFormProps = {
  embedded?: boolean;
  onSwitchToRegister?: () => void;
};

export function LoginForm({ embedded = false, onSwitchToRegister }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const appName = t("common.appName");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!username || !password) {
      setError(t("auth.errors.missingCredentials"));
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
        setError(resolveLoginError(t, payload.code, payload.message));
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
    } catch (submitError) {
      console.warn("[auth][login] request failed", submitError);
      setError(t("auth.errors.backendUnavailable"));
    }
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">{t("auth.login.eyebrow")}</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            {t("auth.login.badge")}
          </div>
        </div>

        <h1 className={styles.title}>
          {embedded
            ? t("auth.login.titleEmbedded")
            : t("auth.login.titleStandalone", { appName })}
        </h1>
        <p className={styles.subtitle}>{t("auth.login.subtitle")}</p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.login.username")}</span>
            <span className={styles.fieldHint}>{t("validation.required")}</span>
          </div>
          <input
            autoComplete="username"
            className={styles.input}
            name="username"
            placeholder={t("auth.login.usernamePlaceholder")}
            type="text"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.login.password")}</span>
            <span className={styles.fieldHint}>{t("validation.required")}</span>
          </div>
          <input
            autoComplete="current-password"
            className={styles.input}
            name="password"
            placeholder={t("auth.login.passwordPlaceholder")}
            type="password"
          />
        </label>

        <button className={styles.submitButton} disabled={isPending} type="submit">
          {isPending
            ? t("auth.login.pending")
            : embedded
              ? t("auth.login.titleEmbedded")
              : t("auth.login.submitStandalone")}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          {t("auth.login.forgotPrompt")}
          <Link className={styles.inlineLink} href="/forgot-password">
            {t("auth.login.forgotLink")}
          </Link>
        </p>
      </div>

      {embedded && onSwitchToRegister ? (
        <div className={styles.embeddedSwitch}>
          <span className={styles.embeddedSwitchText}>{t("auth.login.needAccount")}</span>
          <button
            className={styles.inlineLink}
            onClick={onSwitchToRegister}
            type="button"
          >
            {t("auth.login.registerLink")}
          </button>
        </div>
      ) : null}

      {embedded === false ? (
        <>
          <div className={styles.ruleList}>
            <div className={styles.ruleItem}>{t("auth.login.rules.pending")}</div>
            <div className={styles.ruleItem}>{t("auth.login.rules.backend")}</div>
            <div className={styles.ruleItem}>{t("auth.login.rules.mustChange")}</div>
          </div>

          <div className={styles.footer}>
            <p>{t("auth.login.footer")}</p>
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
  if (user?.must_change_password) {
    return "/dashboard/change-password";
  }

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

  return "/dashboard";
}

function resolveLoginError(
  t: ReturnType<typeof useTranslations>,
  code: string,
  fallbackMessage: string,
) {
  if (
    code === "authentication_failed" ||
    code === "no_active_account" ||
    code === "login_failed"
  ) {
    return t("auth.errors.invalidCredentials");
  }

  if (code === "missing_credentials") {
    return t("auth.errors.missingCredentials");
  }

  if (code === "invalid_json") {
    return t("auth.errors.invalidJson");
  }

  if (code === "backend_unavailable") {
    return t("auth.errors.backendUnavailable");
  }

  if (code === "account_pending") {
    return t("auth.errors.pending");
  }

  if (code === "account_rejected") {
    return t("auth.errors.rejected");
  }

  if (code === "account_disabled") {
    return t("auth.errors.disabled");
  }

  return fallbackMessage || t("auth.errors.loginFailed");
}
