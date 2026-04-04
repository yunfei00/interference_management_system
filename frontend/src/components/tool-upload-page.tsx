"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ApiEnvelope, ToolDetailPayload } from "@/lib/contracts";
import { apiFetch } from "@/lib/api-client";
import { TOOLS_MANAGE_ACCESS } from "@/lib/tool-permissions";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./management-page.module.css";
import pageStyles from "./tools-pages.module.css";

const listHref = "/dashboard/electromagnetic/interference/tools" as Route;

function flattenFieldErrors(input: unknown): string | null {
  if (input == null || typeof input !== "object") {
    return null;
  }

  const parts: string[] = [];
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      parts.push(`${key}: ${value.map(String).join(" ")}`);
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      parts.push(`${key}: ${value}`);
      continue;
    }
    if (value && typeof value === "object") {
      const nested = flattenFieldErrors(value);
      if (nested) {
        parts.push(`${key}: ${nested}`);
      }
    }
  }

  return parts.length ? parts.join(" / ") : null;
}

async function parseApiData<T>(response: Response): Promise<T> {
  const json = (await response.json()) as unknown;
  const payload =
    json && typeof json === "object" && "success" in json
      ? (json as Partial<ApiEnvelope<T>>)
      : null;
  const success = payload?.success ?? response.ok;
  const data = (payload?.data ?? json) as T | null;

  if (!response.ok || !success) {
    const message =
      payload?.message?.trim() ||
      flattenFieldErrors(payload?.data ?? json) ||
      "请求失败，请稍后重试或联系管理员。";
    throw new Error(message);
  }

  return data as T;
}

export function ToolUploadPage() {
  const router = useRouter();
  const { state } = useDashboardSession();
  const ready = state.kind === "ready";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("数据处理");
  const [department, setDepartment] = useState("电磁 / 干扰");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState("active");
  const [tags, setTags] = useState("");
  const [version, setVersion] = useState("v1.0.0");
  const [changelog, setChangelog] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [icon, setIcon] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function submit() {
    const values = {
      name: name.trim(),
      code: code.trim(),
      category: category.trim(),
      department: department.trim(),
      summary: summary.trim(),
      detail: detail.trim(),
      status,
      tags: tags.trim(),
      initial_version: version.trim(),
      changelog: changelog.trim(),
      release_notes: releaseNotes.trim(),
      icon: icon.trim(),
    };

    if (!values.name || !values.code || !values.initial_version) {
      setError("请至少填写工具名称、工具编码和首个版本号。");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          formData.append(key, String(value));
        }
      });
      if (file) {
        formData.append("file", file);
        formData.append("file_name", file.name);
      }

      const response = await apiFetch("/api/tools", {
        method: "POST",
        body: formData,
      });
      const created = await parseApiData<ToolDetailPayload>(response);
      setToast(`工具“${created.name}”已创建。`);
      router.push(`${listHref}/${created.id}` as Route);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "创建失败，请稍后重试或联系管理员。",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <DepartmentAccessGuard
      description="上传与维护工具需要管理员权限（tools.manage）。"
      requiredPermissions={[...TOOLS_MANAGE_ACCESS]}
      title="无法上传工具"
    >
      <section className={styles.content}>
        <div className={styles.stack}>
          {!ready ? (
            <section className={`surface ${styles.panel}`}>
              <p className={styles.panelText}>正在加载当前会话…</p>
            </section>
          ) : (
            <section className={`surface ${styles.panel}`}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>新增工具</h2>
                  <p className={styles.panelText}>
                    创建工具主记录并可同步上传首个版本文件。表单字段已经与后端工具模型保持一致。
                  </p>
                </div>
              </div>

              {toast ? (
                <div className={pageStyles.uploadToast} role="status">
                  {toast}
                </div>
              ) : null}

              <div className={pageStyles.uploadForm}>
                <div className={pageStyles.uploadGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>工具名称</span>
                    <input
                      className={styles.input}
                      onChange={(event) => setName(event.target.value)}
                      value={name}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>工具编码</span>
                    <input
                      className={styles.input}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="tool-code"
                      value={code}
                    />
                  </label>
                </div>

                <div className={pageStyles.uploadGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>分类</span>
                    <input
                      className={styles.input}
                      onChange={(event) => setCategory(event.target.value)}
                      value={category}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>所属部门</span>
                    <input
                      className={styles.input}
                      onChange={(event) => setDepartment(event.target.value)}
                      value={department}
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>摘要</span>
                  <input
                    className={styles.input}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="用于列表卡片的简短说明"
                    value={summary}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>详细说明</span>
                  <textarea
                    className={styles.input}
                    onChange={(event) => setDetail(event.target.value)}
                    placeholder="工具用途、限制、部署说明等"
                    rows={4}
                    value={detail}
                  />
                </label>

                <div className={pageStyles.uploadGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>状态</span>
                    <select
                      className={styles.select}
                      onChange={(event) => setStatus(event.target.value)}
                      value={status}
                    >
                      <option value="active">可用</option>
                      <option value="testing">测试中</option>
                      <option value="deprecated">已归档</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>图标 URL</span>
                    <input
                      className={styles.input}
                      onChange={(event) => setIcon(event.target.value)}
                      value={icon}
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>标签</span>
                  <input
                    className={styles.input}
                    onChange={(event) => setTags(event.target.value)}
                    placeholder="推荐, 现场常用"
                    value={tags}
                  />
                </label>

                <div className={pageStyles.uploadGrid2}>
                  <label className={styles.field}>
                    <span className={styles.label}>初始版本</span>
                    <input
                      className={styles.input}
                      onChange={(event) => setVersion(event.target.value)}
                      value={version}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>附件</span>
                    <input
                      className={styles.input}
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </label>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>发布说明</span>
                  <textarea
                    className={styles.input}
                    onChange={(event) => setReleaseNotes(event.target.value)}
                    rows={2}
                    value={releaseNotes}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>变更记录</span>
                  <textarea
                    className={styles.input}
                    onChange={(event) => setChangelog(event.target.value)}
                    rows={3}
                    value={changelog}
                  />
                </label>

                {error ? (
                  <div className={pageStyles.uploadFormError} role="alert">
                    {error}
                  </div>
                ) : null}

                <div className={styles.actions}>
                  <button
                    className="button"
                    disabled={loading}
                    onClick={() => void submit()}
                    type="button"
                  >
                    {loading ? "创建中…" : "创建工具"}
                  </button>
                  <Link className="buttonGhost" href={listHref}>
                    取消
                  </Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
    </DepartmentAccessGuard>
  );
}
