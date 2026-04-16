"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import type { ApiEnvelope, AuthUser, SessionPayload } from "@/lib/contracts";
import { apiFetch, logAuthClientConfig } from "@/lib/api-client";
import { APP_NAME } from "@/lib/public-config";

import styles from "./login-form.module.css";

type LoginFormProps = {
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
      setError("Please enter your username and password.");
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
    } catch (submitError) {
      console.warn("[auth][login] request failed", submitError);
      setError("The authentication gateway is temporarily unavailable. Please try again.");
    }
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">Unified Login</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            Controlled Access
          </div>
        </div>

        <h1 className={styles.title}>
          {embedded ? "Sign In" : `Sign In to ${APP_NAME}`}
        </h1>
        <p className={styles.subtitle}>
          Use your enterprise account to enter the system. Approval status and role-based permissions are enforced by the backend.
        </p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Username or Email</span>
            <span className={styles.fieldHint}>Required</span>
          </div>
          <input
            autoComplete="username"
            className={styles.input}
            name="username"
            placeholder="Enter your username or email"
            type="text"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Password</span>
            <span className={styles.fieldHint}>Required</span>
          </div>
          <input
            autoComplete="current-password"
            className={styles.input}
            name="password"
            placeholder="Enter your password"
            type="password"
          />
        </label>

        <button className={styles.submitButton} disabled={isPending} type="submit">
          {isPending ? "Signing In..." : embedded ? "Sign In" : "Open Workspace"}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          Need help with your password?
          <Link className={styles.inlineLink} href="/forgot-password">
            Reset it
          </Link>
        </p>
      </div>

      {embedded && onSwitchToRegister ? (
        <div className={styles.embeddedSwitch}>
          <span className={styles.embeddedSwitchText}>Need an account?</span>
          <button
            className={styles.inlineLink}
            onClick={onSwitchToRegister}
            type="button"
          >
            Register
          </button>
        </div>
      ) : null}

      {embedded === false ? (
        <>
          <div className={styles.ruleList}>
            <div className={styles.ruleItem}>
              Newly registered users stay in pending review until an administrator approves them.
            </div>
            <div className={styles.ruleItem}>
              Rejected or disabled accounts are blocked by backend policy, not by client-side hiding.
            </div>
            <div className={styles.ruleItem}>
              If an administrator resets your password, you must update it after your next login.
            </div>
          </div>

          <div className={styles.footer}>
            <p>If your account has not been created yet, register first and wait for approval.</p>
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

function resolveLoginError(code: string, fallbackMessage: string) {
  if (
    code === "authentication_failed" ||
    code === "no_active_account" ||
    code === "login_failed"
  ) {
    return "The username or password is incorrect.";
  }

  if (code === "missing_credentials") {
    return "Please enter your username and password.";
  }

  if (code === "invalid_json") {
    return "The login request format is invalid.";
  }

  if (code === "backend_unavailable") {
    return "The authentication gateway is temporarily unavailable.";
  }

  if (code === "account_pending") {
    return "Your account is still pending approval.";
  }

  if (code === "account_rejected") {
    return "Your account was rejected. Please contact an administrator.";
  }

  if (code === "account_disabled") {
    return "This account has been disabled. Please contact an administrator.";
  }

  return fallbackMessage || "Login failed. Please try again.";
}
