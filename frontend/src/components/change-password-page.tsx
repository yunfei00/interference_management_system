"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ApiEnvelope } from "@/lib/contracts";
import { apiFetch } from "@/lib/api-client";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./account-settings.module.css";

function extractError(payload: ApiEnvelope<unknown> | null, fallback: string) {
  if (!payload?.data || typeof payload.data !== "object" || payload.data === null) {
    return payload?.message || fallback;
  }
  const data = payload.data as Record<string, unknown>;
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length && typeof value[0] === "string") {
      return value[0];
    }
    if (typeof value === "string" && value) {
      return value;
    }
  }
  return payload?.message || fallback;
}

export function ChangePasswordPage() {
  const router = useRouter();
  const { state, refreshSession } = useDashboardSession();
  const t = useTranslations();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (state.kind !== "ready") {
    return null;
  }

  const mustChangePassword = state.data.user.must_change_password;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("current_password") ?? "");
    const newPassword = String(formData.get("new_password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t("validation.completePasswordFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("validation.passwordMismatch"));
      return;
    }

    setPending(true);
    const response = await apiFetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
    const payload = (await response.json()) as ApiEnvelope<unknown> | null;
    setPending(false);
    if (!response.ok || !payload?.success) {
      setError(extractError(payload, t("auth.changePassword.failed")));
      return;
    }

    setMessage(payload.message || t("auth.changePassword.success"));
    (event.currentTarget as HTMLFormElement).reset();
    refreshSession();
    if (mustChangePassword) {
      router.replace("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className={styles.page}>
      <section className={`surface ${styles.panel}`}>
        <div className="eyebrow">{t("auth.changePassword.eyebrow")}</div>
        <h1 className={styles.title}>{t("auth.changePassword.title")}</h1>
        <p className={styles.text}>{t("auth.changePassword.subtitle")}</p>

        {mustChangePassword ? (
          <div className={styles.alert}>{t("auth.changePassword.mustChangeAlert")}</div>
        ) : null}

        {error ? <div className={styles.alert}>{error}</div> : null}
        {message ? <div className={styles.success}>{message}</div> : null}

        <form className={styles.grid} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>{t("auth.changePassword.currentPassword")}</span>
            <input
              autoComplete="current-password"
              className={styles.input}
              name="current_password"
              type="password"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("auth.changePassword.newPassword")}</span>
            <input
              autoComplete="new-password"
              className={styles.input}
              name="new_password"
              type="password"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("auth.changePassword.confirmPassword")}</span>
            <input
              autoComplete="new-password"
              className={styles.input}
              name="confirm_password"
              type="password"
            />
          </label>
          <div className={styles.actions}>
            <button className="button" disabled={pending} type="submit">
              {pending
                ? t("auth.changePassword.submitting")
                : t("auth.changePassword.submit")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
