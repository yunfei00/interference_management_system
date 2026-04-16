"use client";

import Link from "next/link";
import { useState } from "react";

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
      setError("Email is required.");
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
      setError(extractError(payload, "Unable to request a password reset."));
      return;
    }
    setMessage(
      payload.message ||
        "If the account exists, a password reset email has been sent.",
    );
    (event.currentTarget as HTMLFormElement).reset();
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">Password Recovery</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            Email Safe
          </div>
        </div>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>
          Enter your account email. We will always return the same response so account existence is never disclosed.
        </p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Email</span>
            <span className={styles.fieldHint}>Required</span>
          </div>
          <input className={styles.input} name="email" required type="email" />
        </label>
        <button className={styles.submitButton} disabled={pending} type="submit">
          {pending ? "Submitting..." : "Send Reset Link"}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          Remembered your password?
          <Link className={styles.inlineLink} href="/login">
            Back to login
          </Link>
        </p>
      </div>
    </section>
  );
}
