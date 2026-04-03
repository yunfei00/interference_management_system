"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { ApiEnvelope, ToolDetailPayload } from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { normalizeToolStatus, toolStatusLabel } from "@/lib/tool-status";
import { TOOLS_MANAGE_ACCESS, TOOLS_VIEW_ACCESS } from "@/lib/tool-permissions";
import { useToolDetailBffResource } from "@/lib/use-tools-bff-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import pageStyles from "./tools-pages.module.css";
import styles from "./management-page.module.css";

const listHref = "/dashboard/electromagnetic/interference/tools" as Route;

function statusClass(status: string) {
  switch (normalizeToolStatus(status)) {
    case "active":
      return pageStyles.statusActive;
    case "testing":
      return pageStyles.statusTesting;
    case "deprecated":
      return pageStyles.statusDeprecated;
    default:
      return pageStyles.statusDeprecated;
  }
}

function isChangelogLong(text: string) {
  const t = (text ?? "").trim();
  if (!t) return false;
  return t.length > 220 || t.split("\n").length > 6;
}

function VersionChangelogSection({ changelog }: { changelog: string }) {
  const long = isChangelogLong(changelog);
  const [open, setOpen] = useState(!long);
  const body = (changelog ?? "").trim();
  if (!body) {
    return <p className={styles.secondaryText}>—</p>;
  }
  if (!long) {
    return <pre className={pageStyles.changelogPre}>{body}</pre>;
  }
  const preview = body.split("\n").slice(0, 2).join("\n");
  return (
    <div className={pageStyles.changelogFold}>
      {open ? (
        <pre className={pageStyles.changelogPre}>{body}</pre>
      ) : (
        <p className={pageStyles.changelogPreview}>{preview}…</p>
      )}
      <button
        className={pageStyles.changelogToggle}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? "收起变更记录" : "展开完整变更记录"}
      </button>
    </div>
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

  const detailState = useToolDetailBffResource({
    toolId,
    enabled: canView && Boolean(toolId),
  });

  const versionsSorted = useMemo(() => {
    if (detailState.kind !== "ready") {
      return [];
    }
    return [...detailState.data.versions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [detailState]);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editOwner, setEditOwner] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editIcon, setEditIcon] = useState("");
  const [editTags, setEditTags] = useState("");
  const [verVersion, setVerVersion] = useState("");
  const [verNotes, setVerNotes] = useState("");
  const [verChangelog, setVerChangelog] = useState("");
  const [verFile, setVerFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function beginEdit(t: ToolDetailPayload) {
    setEditName(t.name);
    setEditCode(t.code);
    setEditCategory(t.category);
    setEditOwner(t.owner_department);
    setEditSummary(t.summary);
    setEditDescription(t.description);
    setEditStatus(t.status);
    setEditIcon(t.icon);
    setEditTags((t.tags || []).join(", "));
    setEditing(true);
  }

  async function saveEdit() {
    setFeedback(null);
    const tags = editTags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const response = await fetch(`/api/tools/${toolId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        code: editCode,
        category: editCategory,
        owner_department: editOwner,
        summary: editSummary,
        description: editDescription,
        status: editStatus,
        icon: editIcon,
        tags,
      }),
    });
    const payload = (await response.json()) as ApiEnvelope<ToolDetailPayload | null>;
    if (!response.ok || !payload.success) {
      setFeedback(payload.message || "保存失败");
      return;
    }
    setEditing(false);
    router.refresh();
    window.location.reload();
  }

  async function removeTool() {
    if (!window.confirm("确定删除该工具及其全部版本？此操作不可恢复。")) {
      return;
    }
    setFeedback(null);
    const response = await fetch(`/api/tools/${toolId}`, { method: "DELETE" });
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    if (!response.ok || !payload.success) {
      setFeedback(payload.message || "删除失败");
      return;
    }
    router.replace(listHref);
    router.refresh();
  }

  async function addVersion() {
    if (!verVersion.trim()) {
      setFeedback("请填写新版本号。");
      return;
    }
    setFeedback(null);
    const fd = new FormData();
    fd.append("version", verVersion.trim());
    fd.append("release_notes", verNotes);
    fd.append("changelog", verChangelog);
    if (verFile) {
      fd.append("file", verFile);
      fd.append("file_name", verFile.name);
    }
    const response = await fetch(`/api/tools/${toolId}/versions`, {
      method: "POST",
      body: fd,
    });
    const payload = (await response.json()) as ApiEnvelope<unknown>;
    if (!response.ok || !payload.success) {
      setFeedback(payload.message || "新增版本失败");
      return;
    }
    setVerVersion("");
    setVerNotes("");
    setVerChangelog("");
    setVerFile(null);
    window.location.reload();
  }

  return (
    <DepartmentAccessGuard
      description="当前账号无法查看工具详情。"
      requiredPermissions={[...TOOLS_VIEW_ACCESS]}
      title="无法访问工具详情"
    >
      <section className={styles.content}>
        <div className={styles.stack}>
          <div className={styles.actions}>
            <Link className="buttonGhost" href={listHref}>
              ← 返回工具列表
            </Link>
          </div>

          {detailState.kind === "loading" ? (
            <div className={styles.empty}>加载中...</div>
          ) : null}
          {detailState.kind === "error" ? (
            <div className={styles.error}>{detailState.message}</div>
          ) : null}

          {detailState.kind === "ready" ? (
            <div className={pageStyles.detailLayout}>
              <div className={pageStyles.detailMain}>
                {canManage ? (
                  <div className={pageStyles.detailAdminToolbar}>
                    <button
                      className="buttonGhost"
                      onClick={() => {
                        beginEdit(detailState.data);
                        requestAnimationFrame(() =>
                          document
                            .getElementById("tool-admin-panel")
                            ?.scrollIntoView({ behavior: "smooth" }),
                        );
                      }}
                      type="button"
                    >
                      编辑工具
                    </button>
                    <button
                      className="buttonGhost"
                      onClick={() =>
                        document
                          .getElementById("tool-add-version")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      type="button"
                    >
                      新增版本
                    </button>
                    <button className="button" onClick={() => void removeTool()} type="button">
                      删除工具
                    </button>
                  </div>
                ) : null}

                <section className={`surface ${styles.panel}`}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h1 className={styles.panelTitle}>{detailState.data.name}</h1>
                      <p className={styles.panelText}>
                        <span className={styles.secondaryText}>
                          {detailState.data.code} · {detailState.data.category}
                        </span>
                      </p>
                      <p className={styles.panelText}>{detailState.data.summary}</p>
                      <div className={pageStyles.detailHeroLatest}>
                        <span className={pageStyles.latestVersionBadge}>
                          当前最新 {detailState.data.latest_version || "—"}
                        </span>
                        <span className={styles.secondaryText}>
                          历史版本 {detailState.data.versions_count} 个
                        </span>
                      </div>
                      <div className={pageStyles.tagRow} style={{ marginTop: "0.5rem" }}>
                        <span
                          className={`${pageStyles.statusPill} ${statusClass(detailState.data.status)}`}
                        >
                          {toolStatusLabel(detailState.data.status)}
                        </span>
                        {detailState.data.tags?.map((tag) => (
                          <span className={pageStyles.tagPill} key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className={styles.panelText} style={{ whiteSpace: "pre-wrap" }}>
                    {detailState.data.description || "（无详细说明）"}
                  </p>
                  <p className={styles.secondaryText}>
                    归属：{detailState.data.owner_department} · 维护人：
                    {detailState.data.created_by_username || "—"} · 更新：
                    {detailState.data.updated_at
                      ? new Date(detailState.data.updated_at).toLocaleString("zh-CN")
                      : "—"}
                  </p>
                </section>

                <section className={`surface ${styles.panel}`}>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2 className={styles.panelTitle}>版本列表</h2>
                      <p className={styles.panelText}>
                        按发布时间倒序；默认最新在上。历史版本样式弱化，变更记录可多行折叠浏览。
                      </p>
                    </div>
                  </div>

                  <div className={pageStyles.versionList}>
                    {versionsSorted.map((v) => (
                      <div
                        className={`${pageStyles.versionCard} ${
                          v.is_latest ? pageStyles.versionCardLatest : pageStyles.versionCardLegacy
                        }`}
                        key={v.id}
                      >
                        <div className={pageStyles.versionHead}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                            <strong>{v.version}</strong>
                            {v.is_latest ? (
                              <span className={pageStyles.latestVersionBadge} style={{ fontSize: "0.72rem" }}>
                                最新
                              </span>
                            ) : (
                              <span className={pageStyles.tagPill} style={{ opacity: 0.85 }}>
                                历史版本
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={pageStyles.versionMeta}>
                          发布 {new Date(v.created_at).toLocaleString("zh-CN")}
                          {v.created_by_username ? ` · ${v.created_by_username}` : ""}
                          {v.file_name ? ` · ${v.file_name}` : ""}
                          {v.file_size ? ` · ${(v.file_size / 1024).toFixed(1)} KB` : ""}
                        </div>
                        <div className={pageStyles.versionBody}>
                          <strong>发布说明</strong>
                        </div>
                        <p className={pageStyles.releaseNotesBlock}>
                          {v.release_notes?.trim() || "—"}
                        </p>
                        <div className={pageStyles.versionBody} style={{ marginTop: "0.65rem" }}>
                          <strong>变更记录</strong>
                        </div>
                        <VersionChangelogSection changelog={v.changelog || ""} />
                        <div className={styles.actions} style={{ marginTop: "0.75rem" }}>
                          {v.file_name ? (
                            <a
                              className={styles.rowLink}
                              href={`/api/tools/${toolId}/versions/${v.id}/download`}
                            >
                              下载本版本
                            </a>
                          ) : (
                            <span className={styles.secondaryText}>暂无附件（演示占位）</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {canManage ? (
                  <div className={pageStyles.adminZone} id="tool-admin-panel">
                    <h3 className={pageStyles.adminZoneTitle}>管理员操作</h3>
                    {feedback ? <div className={styles.empty}>{feedback}</div> : null}

                    {!editing ? (
                      <div className={styles.actions}>
                        <button
                          className="buttonGhost"
                          onClick={() => beginEdit(detailState.data)}
                          type="button"
                        >
                          编辑工具信息
                        </button>
                        <button className="button" onClick={() => void removeTool()} type="button">
                          删除工具
                        </button>
                      </div>
                    ) : (
                      <div className={pageStyles.uploadForm}>
                        <label className={styles.field}>
                          <span className={styles.label}>名称</span>
                          <input
                            className={styles.input}
                            onChange={(e) => setEditName(e.target.value)}
                            value={editName}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>编码</span>
                          <input
                            className={styles.input}
                            onChange={(e) => setEditCode(e.target.value)}
                            value={editCode}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>分类</span>
                          <input
                            className={styles.input}
                            onChange={(e) => setEditCategory(e.target.value)}
                            value={editCategory}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>归属部门</span>
                          <input
                            className={styles.input}
                            onChange={(e) => setEditOwner(e.target.value)}
                            value={editOwner}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>简介</span>
                          <input
                            className={styles.input}
                            onChange={(e) => setEditSummary(e.target.value)}
                            value={editSummary}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>详细说明</span>
                          <textarea
                            className={styles.input}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={4}
                            value={editDescription}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>状态</span>
                          <select
                            className={styles.select}
                            onChange={(e) => setEditStatus(e.target.value)}
                            value={editStatus}
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
                            onChange={(e) => setEditIcon(e.target.value)}
                            value={editIcon}
                          />
                        </label>
                        <label className={styles.field}>
                          <span className={styles.label}>标签（逗号分隔）</span>
                          <input
                            className={styles.input}
                            onChange={(e) => setEditTags(e.target.value)}
                            value={editTags}
                          />
                        </label>
                        <div className={styles.actions}>
                          <button
                            className="button"
                            disabled={isPending}
                            onClick={() =>
                              startTransition(() => {
                                void saveEdit();
                              })
                            }
                            type="button"
                          >
                            {isPending ? "保存中..." : "保存"}
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
                    )}

                    <hr style={{ margin: "1rem 0", borderColor: "var(--line)" }} />

                    <h4 className={styles.panelTitle} id="tool-add-version">
                      新增版本
                    </h4>
                    <div className={pageStyles.uploadForm}>
                      <label className={styles.field}>
                        <span className={styles.label}>版本号</span>
                        <input
                          className={styles.input}
                          onChange={(e) => setVerVersion(e.target.value)}
                          placeholder="v1.3.0"
                          value={verVersion}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>发布说明</span>
                        <textarea
                          className={styles.input}
                          onChange={(e) => setVerNotes(e.target.value)}
                          rows={2}
                          value={verNotes}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>变更记录</span>
                        <textarea
                          className={styles.input}
                          onChange={(e) => setVerChangelog(e.target.value)}
                          rows={2}
                          value={verChangelog}
                        />
                      </label>
                      <label className={styles.field}>
                        <span className={styles.label}>附件</span>
                        <input
                          className={styles.input}
                          onChange={(e) => setVerFile(e.target.files?.[0] ?? null)}
                          type="file"
                        />
                      </label>
                      <button
                        className="button"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(() => {
                            void addVersion();
                          })
                        }
                        type="button"
                      >
                        提交新版本
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className={pageStyles.detailAside}>
                <section className={`surface ${styles.panel}`}>
                  <h3 className={styles.panelTitle}>摘要</h3>
                  <p className={styles.panelText}>
                    最新版本：<strong>{detailState.data.latest_version || "—"}</strong>
                  </p>
                  <p className={styles.panelText}>
                    版本数：{detailState.data.versions_count}
                  </p>
                </section>
              </aside>
            </div>
          ) : null}
        </div>
      </section>
    </DepartmentAccessGuard>
  );
}
