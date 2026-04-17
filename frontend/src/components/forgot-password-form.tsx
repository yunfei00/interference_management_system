"use client";

import Link from "next/link";
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

export function ForgotPasswordForm() {
  const t = useTranslations();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    if (!email) {
      setError(t("validation.emailRequired"));
      return;
    }

    setPending(true);
    const response = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json()) as ApiEnvelope<unknown> | null;
    setPending(false);
    if (!response.ok || !payload?.success) {
      setError(extractError(payload, t("auth.forgot.failed")));
      return;
    }
    setMessage(payload.message || t("auth.forgot.success"));
    (event.currentTarget as HTMLFormElement).reset();
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">{t("auth.forgot.eyebrow")}</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            {t("auth.forgot.badge")}
          </div>
        </div>
        <h1 className={styles.title}>{t("auth.forgot.title")}</h1>
        <p className={styles.subtitle}>{t("auth.forgot.subtitle")}</p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.forgot.email")}</span>
            <span className={styles.fieldHint}>{t("validation.required")}</span>
          </div>
          <input className={styles.input} name="email" required type="email" />
        </label>
        <button className={styles.submitButton} disabled={pending} type="submit">
          {pending ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          {t("auth.forgot.remembered")}
          <Link className={styles.inlineLink} href="/login">
            {t("auth.forgot.backToLogin")}
          </Link>
        </p>
      </div>
    </section>
  );
}
