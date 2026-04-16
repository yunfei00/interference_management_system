"use client";

import { useRouter } from "next/navigation";
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
      setError("Please complete all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The two password entries do not match.");
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
      setError(extractError(payload, "Unable to change the password."));
      return;
    }

    setMessage(payload.message || "Password updated successfully.");
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
        <div className="eyebrow">Security</div>
        <h1 className={styles.title}>Change Password</h1>
        <p className={styles.text}>
          Update your password here. Backend validation and forced-password-change rules are enforced server-side.
        </p>

        {mustChangePassword ? (
          <div className={styles.alert}>
            Your password was reset by an administrator. You must update it before you can access any other page.
          </div>
        ) : null}

        {error ? <div className={styles.alert}>{error}</div> : null}
        {message ? <div className={styles.success}>{message}</div> : null}

        <form className={styles.grid} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Current Password</span>
            <input
              autoComplete="current-password"
              className={styles.input}
              name="current_password"
              type="password"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>New Password</span>
            <input
              autoComplete="new-password"
              className={styles.input}
              name="new_password"
              type="password"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Confirm New Password</span>
            <input
              autoComplete="new-password"
              className={styles.input}
              name="confirm_password"
              type="password"
            />
          </label>
          <div className={styles.actions}>
            <button className="button" disabled={pending} type="submit">
              {pending ? "Saving..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
