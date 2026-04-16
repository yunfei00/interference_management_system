"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
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
      setError("The reset link is incomplete or invalid.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("new_password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");
    if (!newPassword || !confirmPassword) {
      setError("Please enter the new password twice.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two password entries do not match.");
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
      setError(extractError(payload, "Unable to reset the password."));
      return;
    }
    setMessage(payload.message || "Password reset successfully. You can now sign in.");
    (event.currentTarget as HTMLFormElement).reset();
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">Password Recovery</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            One-Time Token
          </div>
        </div>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          Use the reset link from your email to choose a new password. Expired or reused links are rejected by the backend.
        </p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>New Password</span>
            <span className={styles.fieldHint}>Required</span>
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
            <span className={styles.label}>Confirm New Password</span>
            <span className={styles.fieldHint}>Repeat it</span>
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
          {pending ? "Submitting..." : "Reset Password"}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          Ready to sign in?
          <Link className={styles.inlineLink} href="/login">
            Go to login
          </Link>
        </p>
      </div>
    </section>
  );
}
