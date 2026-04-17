"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { ApiEnvelope } from "@/lib/contracts";
import { apiFetch } from "@/lib/api-client";

import styles from "./login-form.module.css";

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

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!uid || !token) {
      setError(t("auth.reset.invalidLink"));
      return;
    }

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("new_password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");
    if (!newPassword || !confirmPassword) {
      setError(t("validation.completePasswordFields"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("validation.passwordMismatch"));
      return;
    }

    setPending(true);
    const response = await apiFetch("/api/auth/reset-password/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
    const payload = (await response.json()) as ApiEnvelope<unknown> | null;
    setPending(false);
    if (!response.ok || !payload?.success) {
      setError(extractError(payload, t("auth.reset.failed")));
      return;
    }
    setMessage(payload.message || t("auth.reset.success"));
    (event.currentTarget as HTMLFormElement).reset();
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">{t("auth.reset.eyebrow")}</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            {t("auth.reset.badge")}
          </div>
        </div>
        <h1 className={styles.title}>{t("auth.reset.title")}</h1>
        <p className={styles.subtitle}>{t("auth.reset.subtitle")}</p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.reset.newPassword")}</span>
            <span className={styles.fieldHint}>{t("validation.required")}</span>
          </div>
          <input
            autoComplete="new-password"
            className={styles.input}
            name="new_password"
            required
            type="password"
          />
        </label>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.reset.confirmPassword")}</span>
            <span className={styles.fieldHint}>{t("validation.repeatIt")}</span>
          </div>
          <input
            autoComplete="new-password"
            className={styles.input}
            name="confirm_password"
            required
            type="password"
          />
        </label>
        <button className={styles.submitButton} disabled={pending} type="submit">
          {pending ? t("auth.reset.submitting") : t("auth.reset.submit")}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          {t("auth.reset.backToLoginPrompt")}
          <Link className={styles.inlineLink} href="/login">
            {t("auth.reset.backToLogin")}
          </Link>
        </p>
      </div>
    </section>
  );
}
