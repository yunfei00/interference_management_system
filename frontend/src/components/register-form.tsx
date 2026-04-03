"use client";

import { useEffect, useState } from "react";

import type { ApiEnvelope, RegistrationDepartmentOption } from "@/lib/contracts";

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
        const response = await fetch("/api/auth/register/departments");
        const payload = (await response.json()) as ApiEnvelope<
          RegistrationDepartmentOption[] | null
        >;
        if (cancelled) {
          return;
        }
        if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
          setLoadError(payload.message || "无法加载部门列表。");
          return;
        }
        setDepartments(payload.data);
      } catch {
        if (!cancelled) {
          setLoadError("无法加载部门列表。");
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
    const company = String(formData.get("company") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const departmentRaw = String(formData.get("department") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (!username || !password) {
      setError("请填写用户名和密码。");
      return;
    }
    if (password.length < 8) {
      setError("密码至少 8 位。");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    const body: Record<string, unknown> = {
      username,
      password,
      confirm_password: confirmPassword,
    };
    if (email) {
      body.email = email;
    }
    if (company) {
      body.company = company;
    }
    if (phone) {
      body.phone = phone;
    }
    if (departmentRaw) {
      const id = Number(departmentRaw);
      if (!Number.isNaN(id)) {
        body.department = id;
      }
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as ApiEnvelope<{ username?: string } | null>;

      if (!response.ok || !payload.success) {
        setError(pickRegisterError(payload, "注册失败，请检查填写内容。"));
        return;
      }

      setSuccess(payload.message || "注册成功，请等待审批后再登录。");
      (event.currentTarget as HTMLFormElement).reset();
    } catch {
      setError("注册请求失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`surface ${styles.card}`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className="eyebrow">企业账号</div>
          <div className={styles.secureBadge}>
            <span className={styles.secureDot} />
            审批开通
          </div>
        </div>
        <h1 className={styles.title}>注册</h1>
        <p className={styles.subtitle}>提交后由管理员审批，通过后即可登录工作台。</p>
      </div>

      {loadError ? <div className={styles.error}>{loadError}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {success ? <div className={styles.success}>{success}</div> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>用户名</span>
            <span className={styles.fieldHint}>必填</span>
          </div>
          <input
            autoComplete="username"
            className={styles.input}
            name="username"
            placeholder="请输入用户名"
            required
            type="text"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>邮箱</span>
            <span className={styles.fieldHint}>选填</span>
          </div>
          <input
            autoComplete="email"
            className={styles.input}
            name="email"
            placeholder="name@company.com"
            type="email"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>公司</span>
            <span className={styles.fieldHint}>选填</span>
          </div>
          <input className={styles.input} name="company" placeholder="公司全称" type="text" />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>手机</span>
            <span className={styles.fieldHint}>选填</span>
          </div>
          <input
            autoComplete="tel"
            className={styles.input}
            name="phone"
            placeholder="手机号"
            type="tel"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>所属部门</span>
            <span className={styles.fieldHint}>选填</span>
          </div>
          <select className={styles.input} defaultValue="" name="department">
            <option value="">暂不选择</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>密码</span>
            <span className={styles.fieldHint}>不少于 8 位</span>
          </div>
          <input
            autoComplete="new-password"
            className={styles.input}
            name="password"
            placeholder="设置密码"
            required
            type="password"
          />
        </label>

        <label className={styles.field}>
          <div className={styles.labelRow}>
            <span className={styles.label}>确认密码</span>
            <span className={styles.fieldHint}>再次输入</span>
          </div>
          <input
            autoComplete="new-password"
            className={styles.input}
            name="confirm_password"
            placeholder="再次输入密码"
            required
            type="password"
          />
        </label>

        <button className={styles.submitButton} disabled={submitting} type="submit">
          {submitting ? "提交中..." : "提交注册"}
        </button>
      </form>

      <div className={styles.footer}>
        <p>
          已有账号？
          <button
            className={styles.inlineLink}
            onClick={onSwitchToLogin}
            type="button"
          >
            去登录
          </button>
        </p>
      </div>
    </section>
  );
}
