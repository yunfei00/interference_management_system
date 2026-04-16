"use client";

import { useEffect, useState } from "react";

import type { ApiEnvelope, RegistrationDepartmentOption } from "@/lib/contracts";
import { apiFetch } from "@/lib/api-client";

import styles from "./login-form.module.css";

function pickRegisterError(payload: ApiEnvelope<unknown> | null, fallback: string) {
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
  return payload.message || fallback;
}

async function parseEnvelopeSafely(response: Response): Promise<ApiEnvelope<unknown> | null> {
  try {
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function RegisterForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void;
}) {
  const [departments, setDepartments] = useState<RegistrationDepartmentOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await apiFetch("/api/auth/register/departments");
        const payload = (await response.json()) as ApiEnvelope<
          RegistrationDepartmentOption[] | null
        >;
        if (cancelled) {
          return;
        }
        if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
          setLoadError(payload.message || "Unable to load department options.");
          return;
        }
        setDepartments(payload.data);
      } catch {
        if (!cancelled) {
          setLoadError("Unable to load department options.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const realName = String(formData.get("real_name") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const departmentRaw = String(formData.get("department") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (!username || !email || !realName || !password) {
      setError("Username, email, real name, and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two password entries do not match.");
      return;
    }

    const body: Record<string, unknown> = {
      username,
      email,
      real_name: realName,
      password,
      confirm_password: confirmPassword,
    };
    if (company) {
      body.company = company;
    }
    if (phone) {
      body.phone = phone;
    }
    if (title) {
      body.title = title;
    }
    if (departmentRaw) {
      const id = Number(departmentRaw);
      if (!Number.isNaN(id)) {
        body.department = id;
      }
    }

    setSubmitting(true);
    try {
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await parseEnvelopeSafely(response)) as ApiEnvelope<
        { username?: string } | null
      > | null;

      if (!response.ok || !payload?.success) {
        setError(pickRegisterError(payload, "Registration failed. Please check the form and try again."));
        return;
      }

      setSuccess(
        payload.message ||
          "Registration submitted successfully. Please wait for administrator approval.",
      );
      (event.currentTarget as HTMLFormElement).reset();
    } catch {
      setError("Registration failed. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">Enterprise Account</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            Approval Required
          </div>
        </div>
        <h1 className={styles.title}>Register</h1>
        <p className={styles.subtitle}>
          Submit your details and wait for administrator approval before signing in.
        </p>
      </div>

      {loadError ? <div className={styles.error}>{loadError}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {success ? <div className={styles.success}>{success}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Username</span>
            <span className={styles.fieldHint}>Required</span>
          </div>
          <input className={styles.input} name="username" required type="text" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Email</span>
            <span className={styles.fieldHint}>Required</span>
          </div>
          <input
            autoComplete="email"
            className={styles.input}
            name="email"
            placeholder="name@company.com"
            required
            type="email"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Real Name</span>
            <span className={styles.fieldHint}>Required</span>
          </div>
          <input className={styles.input} name="real_name" required type="text" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Company</span>
            <span className={styles.fieldHint}>Optional</span>
          </div>
          <input className={styles.input} name="company" placeholder="Company name" type="text" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Phone</span>
            <span className={styles.fieldHint}>Optional</span>
          </div>
          <input autoComplete="tel" className={styles.input} name="phone" type="tel" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Title</span>
            <span className={styles.fieldHint}>Optional</span>
          </div>
          <input className={styles.input} name="title" placeholder="Job title" type="text" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Department</span>
            <span className={styles.fieldHint}>Optional</span>
          </div>
          <select className={styles.input} defaultValue="" name="department">
            <option value="">Not assigned yet</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Password</span>
            <span className={styles.fieldHint}>At least 8 characters</span>
          </div>
          <input
            autoComplete="new-password"
            className={styles.input}
            name="password"
            required
            type="password"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>Confirm Password</span>
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

        <button className={styles.submitButton} disabled={submitting} type="submit">
          {submitting ? "Submitting..." : "Submit Registration"}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          Already have an account?
          <button className={styles.inlineLink} onClick={onSwitchToLogin} type="button">
            Sign in
          </button>
        </p>
      </div>
    </section>
  );
}
