"use client";

import { useState, useTransition } from "react";

import type { ApiEnvelope, ToolItem } from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import { usePaginatedResource } from "@/lib/use-paginated-resource";

import { useDashboardSession } from "./dashboard-session-provider";
import { InterferenceWorkspaceBanner } from "./interference-workspace-banner";
import styles from "./management-page.module.css";

export function ToolsPage() {
  const { state } = useDashboardSession();
  const canView =
    state.kind === "ready" &&
    hasDashboardPermission(state.data.permissions, "tools.view");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toolsState = usePaginatedResource<ToolItem>({
    endpoint: "/api/tools",
    query: { page, refresh: refreshKey },
    enabled: canView,
    messages: defaultFetchMessages,
  });

  async function uploadTool() {
    if (!selectedFile) {
      setFeedback("请先选择要上传的工具文件。");
      return;
    }
    setFeedback(null);
    const formData = new FormData();
    formData.append("name", name);
    formData.append("version", version);
    formData.append("description", description);
    formData.append("file", selectedFile);
    const response = await fetch("/api/tools", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as ApiEnvelope<ToolItem | null>;
    if (!response.ok || !payload.success || !payload.data) {
      setFeedback(payload.message || "上传工具失败。");
      return;
    }
    setName("");
    setVersion("");
    setDescription("");
    setSelectedFile(null);
    setRefreshKey((value) => value + 1);
    setFeedback("工具上传成功。");
  }

  if (state.kind !== "ready" || !canView) {
    return (
      <section className={styles.content}>
        <div className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div className={styles.empty}>当前账号无法访问工具仓库。</div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.content}>
      <div className={styles.stack}>
        <InterferenceWorkspaceBanner
          description="当前工具仓库已经作为干扰子部门的工具区继续保留，后续工具分类也会沿着部门结构扩展。"
          title="工具仓库"
        />

        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>上传工具</h2>
              <p className={styles.panelText}>
                这里沿用现有工具仓库能力，并把上传/下载入口迁移到前后端分离工作台。
              </p>
            </div>
          </div>

          <div className={styles.filters}>
            <label className={styles.field}>
              <span className={styles.label}>工具名称</span>
              <input
                className={styles.input}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：频谱采集客户端"
                value={name}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>版本</span>
              <input
                className={styles.input}
                onChange={(event) => setVersion(event.target.value)}
                placeholder="例如：v1.2.0"
                value={version}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>说明</span>
              <input
                className={styles.input}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="写明用途与适用范围"
                value={description}
              />
            </label>
          </div>

          <div className={styles.filters}>
            <label className={styles.field}>
              <span className={styles.label}>工具文件</span>
              <input
                className={styles.input}
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                type="file"
              />
            </label>
            <div className={styles.field}>
              <span className={styles.label}>上传</span>
              <button
                className="button"
                onClick={() =>
                  startTransition(() => {
                    void uploadTool();
                  })
                }
                type="button"
              >
                {isPending ? "上传中..." : "上传工具"}
              </button>
            </div>
          </div>

          {feedback ? <div className={styles.empty}>{feedback}</div> : null}
        </section>

        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>工具清单</h2>
              <p className={styles.panelText}>下载会先经过 Next.js BFF，再代理到 Django 文件接口。</p>
            </div>
          </div>

          {toolsState.kind === "ready" && toolsState.data.items.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>工具</th>
                    <th>版本</th>
                    <th>上传者</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {toolsState.data.items.map((tool) => (
                    <tr key={tool.id}>
                      <td>
                        <div className={styles.primaryCell}>
                          <span className={styles.primaryText}>{tool.name}</span>
                          <span className={styles.secondaryText}>
                            {tool.description || "无描述"}
                          </span>
                        </div>
                      </td>
                      <td>{tool.version}</td>
                      <td>{tool.uploaded_by_username || "系统导入"}</td>
                      <td>
                        <a
                          className={styles.rowLink}
                          href={`/api/tools/${tool.id}/download`}
                        >
                          下载 {tool.filename}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {toolsState.kind === "loading" ? (
            <div className={styles.empty}>正在加载工具列表...</div>
          ) : null}
          {toolsState.kind === "error" ? (
            <div className={styles.error}>{toolsState.message}</div>
          ) : null}

          {toolsState.kind === "ready" ? (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                第 {toolsState.data.pagination.page} /{" "}
                {toolsState.data.pagination.pages || 1} 页，共{" "}
                {toolsState.data.pagination.count} 条
              </div>
              <div className={styles.paginationActions}>
                <button
                  className={styles.buttonSmall}
                  disabled={!toolsState.data.pagination.previous}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  上一页
                </button>
                <button
                  className={styles.buttonSmall}
                  disabled={!toolsState.data.pagination.next}
                  onClick={() => setPage((value) => value + 1)}
                  type="button"
                >
                  下一页
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <aside className={styles.stack}>
        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>仓库说明</h2>
              <p className={styles.panelText}>当前保留最直接的工具上传下载能力，后续可继续补标签和分类。</p>
            </div>
          </div>
          <div className={styles.asideList}>
            <div className={styles.asideItem}>
              <span className={styles.asideLabel}>上传接口</span>
              <span className={styles.asideValue}>POST /api/tools</span>
            </div>
            <div className={styles.asideItem}>
              <span className={styles.asideLabel}>列表接口</span>
              <span className={styles.asideValue}>GET /api/tools</span>
            </div>
            <div className={styles.asideItem}>
              <span className={styles.asideLabel}>下载接口</span>
              <span className={styles.asideValue}>GET /api/tools/[id]/download</span>
            </div>
          </div>
        </section>
      </aside>
    </section>
  );
}
