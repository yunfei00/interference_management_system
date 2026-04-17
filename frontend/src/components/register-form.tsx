"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations();
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
          setLoadError(payload.message || t("auth.register.loadDepartmentsFailed"));
          return;
        }
        setDepartments(payload.data);
      } catch {
        if (!cancelled) {
          setLoadError(t("auth.register.loadDepartmentsFailed"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

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
      setError(
        `${t("auth.register.username")}, ${t("auth.register.email")}, ${t("auth.register.realName")}, ${t("auth.register.password")} ${t("validation.required")}`,
      );
      return;
    }
    if (password.length < 8) {
      setError(t("validation.passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("validation.passwordMismatch"));
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
        setError(
          pickRegisterError(payload, t("auth.register.submitFailed")),
        );
        return;
      }

      setSuccess(payload.message || t("auth.register.success"));
      (event.currentTarget as HTMLFormElement).reset();
    } catch {
      setError(t("auth.register.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">{t("auth.register.eyebrow")}</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            {t("auth.register.badge")}
          </div>
        </div>
        <h1 className={styles.title}>{t("auth.register.title")}</h1>
        <p className={styles.subtitle}>{t("auth.register.subtitle")}</p>
      </div>

      {loadError ? <div className={styles.error}>{loadError}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {success ? <div className={styles.success}>{success}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.register.username")}</span>
            <span className={styles.fieldHint}>{t("validation.required")}</span>
          </div>
          <input className={styles.input} name="username" required type="text" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.register.email")}</span>
            <span className={styles.fieldHint}>{t("validation.required")}</span>
          </div>
          <input
            autoComplete="email"
            className={styles.input}
            name="email"
            placeholder={t("auth.register.emailPlaceholder")}
            required
            type="email"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.register.realName")}</span>
            <span className={styles.fieldHint}>{t("validation.required")}</span>
          </div>
          <input className={styles.input} name="real_name" required type="text" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.register.company")}</span>
            <span className={styles.fieldHint}>{t("validation.optional")}</span>
          </div>
          <input
            className={styles.input}
            name="company"
            placeholder={t("auth.register.companyPlaceholder")}
            type="text"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.register.phone")}</span>
            <span className={styles.fieldHint}>{t("validation.optional")}</span>
          </div>
          <input autoComplete="tel" className={styles.input} name="phone" type="tel" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.register.titleField")}</span>
            <span className={styles.fieldHint}>{t("validation.optional")}</span>
          </div>
          <input
            className={styles.input}
            name="title"
            placeholder={t("auth.register.titlePlaceholder")}
            type="text"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.register.department")}</span>
            <span className={styles.fieldHint}>{t("validation.optional")}</span>
          </div>
          <select className={styles.input} defaultValue="" name="department">
            <option value="">{t("auth.register.departmentPlaceholder")}</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>{t("auth.register.password")}</span>
            <span className={styles.fieldHint}>{t("validation.atLeast8")}</span>
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
            <span className={styles.label}>{t("auth.register.confirmPassword")}</span>
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

        <button className={styles.submitButton} disabled={submitting} type="submit">
          {submitting ? t("auth.register.submitting") : t("auth.register.submit")}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          {t("auth.register.signInPrompt")}
          <button className={styles.inlineLink} onClick={onSwitchToLogin} type="button">
            {t("auth.register.signInLink")}
          </button>
        </p>
      </div>
    </section>
  );
}
