"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ApiEnvelope, ToolDetailPayload, ToolVersionRow } from "@/lib/contracts";
import { apiFetch, apiUrl } from "@/lib/api-client";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { runChunkedUpload, type UploadState } from "@/lib/tool-upload";
import { normalizeToolStatus, toolStatusLabel } from "@/lib/tool-status";
import { TOOLS_MANAGE_ACCESS, TOOLS_VIEW_ACCESS } from "@/lib/tool-permissions";
import { useToolDetailBffResource } from "@/lib/use-tools-bff-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./management-page.module.css";
import pageStyles from "./tools-pages.module.css";

const listHref = "/dashboard/electromagnetic/interference/tools" as Route;

function statusClass(status: string) {
  switch (normalizeToolStatus(status)) {
    case "active":
      return pageStyles.statusActive;
    case "testing":
      return pageStyles.statusTesting;
    default:
      return pageStyles.statusDeprecated;
  }
}

function splitTags(tags: string | null | undefined): string[] {
  return String(tags ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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
  const rawText = await response.text();
  let json: unknown = null;
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = null;
    }
  }
  const payload =
    json && typeof json === "object" && "success" in json
      ? (json as Partial<ApiEnvelope<T>>)
      : null;
  const success = payload?.success ?? response.ok;
  const data = (payload?.data ?? json) as T | null;

  if (!response.ok || !success) {
    if (response.status === 413) {
      throw new Error("上传文件过大，请压缩后重试，或联系管理员提升上传大小限制。");
    }
    const message =
      payload?.message?.trim() ||
      flattenFieldErrors(payload?.data ?? json) ||
      "请求失败，请稍后重试。";
    throw new Error(message);
  }

  return data as T;
}

function VersionCard({
  toolId,
  row,
  canManage,
  onDelete,
  onSetLatest,
}: {
  toolId: string;
  row: ToolVersionRow;
  canManage: boolean;
  onDelete: (row: ToolVersionRow) => void;
  onSetLatest: (row: ToolVersionRow) => void;
}) {
  return (
    <article
      className={`${pageStyles.versionShell} ${
        row.is_latest ? pageStyles.versionShellLatest : pageStyles.versionShellLegacy
      }`}
    >
      <div className={pageStyles.versionLine1}>
        <div className={pageStyles.versionLine1Left}>
          <span className={pageStyles.versionCode}>{row.version}</span>
          <span
            className={
              row.is_latest
                ? pageStyles.versionBadgeLatest
                : pageStyles.versionBadgeHistory
            }
          >
            {row.is_latest ? "当前" : "历史"}
          </span>
        </div>
        <time className={pageStyles.versionTime} dateTime={row.created_at}>
          {new Date(row.created_at).toLocaleString("zh-CN")}
        </time>
      </div>

      <p className={pageStyles.versionReleaseNotes}>
        {row.release_notes?.trim() || "暂无发布说明"}
      </p>

      <div className={pageStyles.versionChangelogBlock}>
        <span className={pageStyles.versionSectionLabel}>变更记录</span>
        <pre className={pageStyles.changelogPreCompact}>
          {row.changelog?.trim() || "暂无变更记录"}
        </pre>
      </div>

      <div className={pageStyles.versionRowFooter}>
        <div className={pageStyles.versionAssetStrip}>
          <span>{row.file_name || "未上传附件"}</span>
          {row.file_size ? <span>{(row.file_size / 1024).toFixed(1)} KB</span> : null}
          {row.created_by_username ? <span>发布人 {row.created_by_username}</span> : null}
        </div>

        <div className={pageStyles.versionRowFooterActions}>
          {row.file_name ? (
            <a
              className={pageStyles.downloadButton}
              href={apiUrl(`/api/tools/${toolId}/versions/${row.id}/download`)}
            >
              下载
            </a>
          ) : null}
          {canManage && !row.is_latest ? (
            <button
              className={pageStyles.versionAdminBtn}
              onClick={() => onSetLatest(row)}
              type="button"
            >
              设为当前
            </button>
          ) : null}
          {canManage ? (
            <button
              className={`${pageStyles.versionAdminBtn} ${pageStyles.versionAdminBtnDanger}`}
              onClick={() => onDelete(row)}
              type="button"
            >
              删除版本
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

type ToolDetailPageProps = {
  toolId: string;
};

export function ToolDetailPage({ toolId }: ToolDetailPageProps) {
  const router = useRouter();
  const { state: session } = useDashboardSession();
  const ready = session.kind === "ready";
  const permissions = ready ? session.data.permissions : [];
  const canView = ready && hasDashboardPermission(permissions, [...TOOLS_VIEW_ACCESS]);
  const canManage =
    ready && hasDashboardPermission(permissions, [...TOOLS_MANAGE_ACCESS]);

  const { state: detailState, refetch } = useToolDetailBffResource({
    toolId,
    enabled: canView && Boolean(toolId),
  });

  const versions = useMemo(() => {
    if (detailState.kind !== "ready") {
      return [];
    }
    return [...detailState.data.versions].sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    );
  }, [detailState]);

  const tags = useMemo(
    () => (detailState.kind === "ready" ? splitTags(detailState.data.tags) : []),
    [detailState],
  );

  const [editing, setEditing] = useState(false);
  const [addingVersion, setAddingVersion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editIcon, setEditIcon] = useState("");
  const [editTags, setEditTags] = useState("");

  const [versionNumber, setVersionNumber] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [versionChangelog, setVersionChangelog] = useState("");
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "waiting",
    uploadId: null,
    uploadedChunks: 0,
    totalChunks: 0,
    progress: 0,
    error: null,
  });

  useEffect(() => {
    if (detailState.kind !== "ready" || editing) {
      return;
    }

    setEditName(detailState.data.name);
    setEditCode(detailState.data.code);
    setEditCategory(detailState.data.category);
    setEditDepartment(detailState.data.department);
    setEditSummary(detailState.data.summary);
    setEditDetail(detailState.data.detail);
    setEditStatus(detailState.data.status);
    setEditIcon(detailState.data.icon);
    setEditTags(detailState.data.tags);
  }, [detailState, editing]);

  async function saveEdit() {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await apiFetch(`/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          code: editCode,
          category: editCategory,
          department: editDepartment,
          summary: editSummary,
          detail: editDetail,
          status: editStatus,
          icon: editIcon,
          tags: editTags,
        }),
      });
      await parseApiData<ToolDetailPayload>(response);
      setEditing(false);
      await refetch();
    } catch (requestError) {
      setFeedback(
        requestError instanceof Error ? requestError.message : "保存失败，请稍后重试。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeTool() {
    if (!window.confirm("确认删除整个工具及其所有版本吗？")) {
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const response = await apiFetch(`/api/tools/${toolId}`, { method: "DELETE" });
      await parseApiData(response);
      router.replace(listHref);
    } catch (requestError) {
      setFeedback(
        requestError instanceof Error ? requestError.message : "删除失败，请稍后重试。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addVersion() {
    if (!versionNumber.trim()) {
      setFeedback("请填写版本号。");
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      let uploadId = "";
      if (versionFile) {
        const result = await runChunkedUpload({
          file: versionFile,
          target: "tool_version",
          toolId: Number(toolId),
          onState: setUploadState,
        });
        uploadId = result.uploadId;
      }
      const values = {
        version: versionNumber.trim(),
        release_notes: versionNotes.trim(),
        changelog: versionChangelog.trim(),
        upload_id: uploadId,
        file_name: versionFile?.name ?? "",
      };

      const response = await apiFetch(`/api/tools/${toolId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      await parseApiData(response);
      setVersionNumber("");
      setVersionNotes("");
      setVersionChangelog("");
      setVersionFile(null);
      setAddingVersion(false);
      await refetch();
    } catch (requestError) {
      setFeedback(
        requestError instanceof Error ? requestError.message : "新增版本失败，请稍后重试。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function promoteVersion(row: ToolVersionRow) {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await apiFetch(
        `/api/tools/${toolId}/versions/${row.id}/set-latest`,
        { method: "POST" },
      );
      await parseApiData(response);
      await refetch();
    } catch (requestError) {
      setFeedback(
        requestError instanceof Error ? requestError.message : "设为当前版本失败。",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeVersion(row: ToolVersionRow) {
    if (!window.confirm(`确认删除版本 ${row.version} 吗？`)) {
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const response = await apiFetch(`/api/tools/${toolId}/versions/${row.id}`, {
        method: "DELETE",
      });
      await parseApiData(response);
      await refetch();
    } catch (requestError) {
      setFeedback(
        requestError instanceof Error ? requestError.message : "删除版本失败，请稍后重试。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <DepartmentAccessGuard
      description="当前账号无法查看工具详情。"
      requiredPermissions={[...TOOLS_VIEW_ACCESS]}
      title="无法访问工具详情"
    >
      <section className={styles.content}>
        <div className={styles.stack}>
          <div className={pageStyles.detailTopBar}>
            <Link className="buttonGhost" href={listHref}>
              返回工具仓库
            </Link>
          </div>

          {detailState.kind === "loading" ? (
            <div className={styles.empty}>正在加载工具详情…</div>
          ) : null}

          {detailState.kind === "error" ? (
            <div className={styles.error} role="alert">
              {detailState.message || "无法加载工具详情，请稍后重试。"}
            </div>
          ) : null}

          {detailState.kind === "ready" ? (
            <div className={pageStyles.container}>
              <section className={`surface ${styles.panel} ${pageStyles.detailMainCard}`}>
                <div className={pageStyles.detailToolHeader}>
                  <h1 className={pageStyles.detailToolName}>{detailState.data.name}</h1>
                  <p className={pageStyles.detailToolSlug}>
                    {detailState.data.code} / {detailState.data.category}
                  </p>
                  <div className={pageStyles.detailHeroLatest}>
                    <span className={pageStyles.latestVersionBadge}>
                      当前版本 {detailState.data.latest_version || "未设置"}
                    </span>
                    <span
                      className={`${pageStyles.statusPill} ${statusClass(
                        detailState.data.status,
                      )}`}
                    >
                      {toolStatusLabel(detailState.data.status)}
                    </span>
                  </div>
                  <p className={pageStyles.detailLead}>
                    {detailState.data.summary?.trim() || "暂无摘要"}
                  </p>
                  {tags.length ? (
                    <div className={pageStyles.tagRowTight}>
                      {tags.map((tag) => (
                        <span className={pageStyles.tagPill} key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className={pageStyles.detailDescriptionBlock}>
                  <h2 className={pageStyles.detailSectionTitle}>详细说明</h2>
                  <p className={pageStyles.detailDescriptionBody}>
                    {detailState.data.detail?.trim() || "暂无详细说明"}
                  </p>
                </div>

                <dl className={pageStyles.detailFacts}>
                  <div className={pageStyles.detailFactRow}>
                    <dt>所属部门</dt>
                    <dd>{detailState.data.department}</dd>
                  </div>
                  <div className={pageStyles.detailFactRow}>
                    <dt>维护人</dt>
                    <dd>{detailState.data.created_by_username || "未记录"}</dd>
                  </div>
                  <div className={pageStyles.detailFactRow}>
                    <dt>更新时间</dt>
                    <dd>
                      {detailState.data.updated_at
                        ? new Date(detailState.data.updated_at).toLocaleString("zh-CN")
                        : "未记录"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className={`surface ${styles.panel} ${pageStyles.versionsPanel}`}>
                <div className={pageStyles.versionsPanelHead}>
                  <h2 className={styles.panelTitle}>版本列表</h2>
                  <p className={pageStyles.versionsPanelHint}>
                    中间区域专门展示版本历史、附件和版本操作。
                  </p>
                </div>

                {versions.length ? (
                  <div className={pageStyles.versionList}>
                    {versions.map((row) => (
                      <VersionCard
                        canManage={canManage}
                        key={row.id}
                        onDelete={removeVersion}
                        onSetLatest={promoteVersion}
                        row={row}
                        toolId={toolId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>当前工具还没有版本记录。</div>
                )}
              </section>

              <aside className={pageStyles.rightPanel}>
                <section className={`surface ${styles.panel} ${pageStyles.overviewPanel}`}>
                  <h3 className={pageStyles.asideCardTitle}>概览</h3>
                  <dl className={pageStyles.overviewDl}>
                    <div className={pageStyles.overviewDlRow}>
                      <dt>版本数</dt>
                      <dd>{versions.length}</dd>
                    </div>
                    <div className={pageStyles.overviewDlRow}>
                      <dt>状态</dt>
                      <dd>{toolStatusLabel(detailState.data.status)}</dd>
                    </div>
                    <div className={pageStyles.overviewDlRow}>
                      <dt>分类</dt>
                      <dd>{detailState.data.category}</dd>
                    </div>
                    <div className={pageStyles.overviewDlRow}>
                      <dt>部门</dt>
                      <dd>{detailState.data.department}</dd>
                    </div>
                    <div className={pageStyles.overviewDlRow}>
                      <dt>最新版本</dt>
                      <dd>{detailState.data.latest_version || "未设置"}</dd>
                    </div>
                  </dl>
                </section>

                <section
                  className={`surface ${styles.panel} ${pageStyles.detailActivityPanel}`}
                >
                  <div className={pageStyles.detailActivityBlock}>
                    <h3 className={pageStyles.detailActivityTitle}>使用提示</h3>
                    <ul className={pageStyles.detailActivityList}>
                      <li>工具主信息在左侧维护，版本文件在中间区域查看和管理。</li>
                      <li>右侧操作区固定停靠，滚动长版本列表时不会错位。</li>
                      <li>删除版本会真正删除数据库记录和已上传附件。</li>
                    </ul>
                  </div>
                </section>

                {canManage ? (
                  <section
                    className={`surface ${styles.panel} ${pageStyles.adminMaintainPanel}`}
                  >
                    <h3 className={pageStyles.asideCardTitle}>管理操作</h3>
                    {feedback ? (
                      <div className={pageStyles.adminFeedback}>{feedback}</div>
                    ) : null}

                    <div className={pageStyles.adminActionGroup}>
                      <button
                        className="buttonGhost"
                        onClick={() => {
                          setEditing((current) => !current);
                          setAddingVersion(false);
                          setFeedback(null);
                        }}
                        type="button"
                      >
                        {editing ? "收起编辑" : "编辑工具"}
                      </button>
                      <button
                        className="buttonGhost"
                        onClick={() => {
                          setAddingVersion((current) => !current);
                          setEditing(false);
                          setFeedback(null);
                        }}
                        type="button"
                      >
                        {addingVersion ? "收起版本表单" : "新增版本"}
                      </button>
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() => void removeTool()}
                        type="button"
                      >
                        删除工具
                      </button>
                    </div>

                    {editing ? (
                      <div className={`${pageStyles.uploadForm} ${pageStyles.asideForm}`}>
                        <label className={styles.field}>
                          <span className={styles.label}>名称</span>
                          <input
                            className={styles.input}
                            onChange={(event) => setEditName(event.target.value)}
                            value={editName}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>编码</span>
                          <input
                            className={styles.input}
                            onChange={(event) => setEditCode(event.target.value)}
                            value={editCode}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>分类</span>
                          <input
                            className={styles.input}
                            onChange={(event) => setEditCategory(event.target.value)}
                            value={editCategory}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>部门</span>
                          <input
                            className={styles.input}
                            onChange={(event) => setEditDepartment(event.target.value)}
                            value={editDepartment}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>摘要</span>
                          <input
                            className={styles.input}
                            onChange={(event) => setEditSummary(event.target.value)}
                            value={editSummary}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>详细说明</span>
                          <textarea
                            className={styles.input}
                            onChange={(event) => setEditDetail(event.target.value)}
                            rows={4}
                            value={editDetail}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>状态</span>
                          <select
                            className={styles.select}
                            onChange={(event) => setEditStatus(event.target.value)}
                            value={editStatus}
                          >
                            <option value="active">可用</option>
                            <option value="testing">测试中</option>
                            <option value="deprecated">已归档</option>
                          </select>
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>标签</span>
                          <input
                            className={styles.input}
                            onChange={(event) => setEditTags(event.target.value)}
                            value={editTags}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>图标 URL</span>
                          <input
                            className={styles.input}
                            onChange={(event) => setEditIcon(event.target.value)}
                            value={editIcon}
                          />
                        </label>

                        <div className={styles.actions}>
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() => void saveEdit()}
                            type="button"
                          >
                            {busy ? "保存中…" : "保存修改"}
                          </button>
                          <button
                            className="buttonGhost"
                            onClick={() => setEditing(false)}
                            type="button"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {addingVersion ? (
                      <div className={`${pageStyles.uploadForm} ${pageStyles.asideForm}`}>
                        <label className={styles.field}>
                          <span className={styles.label}>版本号</span>
                          <input
                            className={styles.input}
                            onChange={(event) => setVersionNumber(event.target.value)}
                            placeholder="v1.1.0"
                            value={versionNumber}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>发布说明</span>
                          <textarea
                            className={styles.input}
                            onChange={(event) => setVersionNotes(event.target.value)}
                            rows={2}
                            value={versionNotes}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>变更记录</span>
                          <textarea
                            className={styles.input}
                            onChange={(event) => setVersionChangelog(event.target.value)}
                            rows={3}
                            value={versionChangelog}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>附件</span>
                          <input
                            className={styles.input}
                            onChange={(event) =>
                              setVersionFile(event.target.files?.[0] ?? null)
                            }
                            type="file"
                          />
                        </label>
                        {versionFile ? (
                          <div className={pageStyles.uploadHint}>
                            <div>
                              {versionFile.name} ({(versionFile.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                            <div>
                              {uploadState.status} · {uploadState.uploadedChunks}/
                              {uploadState.totalChunks || 0}
                            </div>
                            <div className={pageStyles.progressBar}>
                              <span style={{ width: `${uploadState.progress}%` }} />
                            </div>
                            <div>{uploadState.progress.toFixed(1)}%</div>
                          </div>
                        ) : null}

                        <div className={styles.actions}>
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() => void addVersion()}
                            type="button"
                          >
                            {busy ? "提交中…" : "提交版本"}
                          </button>
                          <button
                            className="buttonGhost"
                            onClick={() => setAddingVersion(false)}
                            type="button"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </DepartmentAccessGuard>
  );
}
