"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ToolListItem } from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { normalizeToolStatus, toolStatusLabel } from "@/lib/tool-status";
import { TOOLS_MANAGE_ACCESS, TOOLS_VIEW_ACCESS } from "@/lib/tool-permissions";
import { useToolsPaginatedResource } from "@/lib/use-tools-bff-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import { InterferenceWorkspaceBanner } from "./interference-workspace-banner";
import pageStyles from "./tools-pages.module.css";
import styles from "./management-page.module.css";

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

const toolsListPath = "/dashboard/electromagnetic/interference/tools" as Route;

export function ToolsPage() {
  const router = useRouter();
  const { state } = useDashboardSession();
  const ready = state.kind === "ready";
  const permissions = ready ? state.data.permissions : [];
  const canView = ready && hasDashboardPermission(permissions, [...TOOLS_VIEW_ACCESS]);
  const canManage =
    ready && hasDashboardPermission(permissions, [...TOOLS_MANAGE_ACCESS]);

  const [page, setPage] = useState(1);

  const toolsState = useToolsPaginatedResource({
    query: { page, page_size: 10 },
    enabled: canView,
  });

  return (
    <DepartmentAccessGuard
      description="当前账号没有进入工具仓库的权限。"
      requiredPermissions={[...TOOLS_VIEW_ACCESS]}
      title="无法访问工具仓库"
    >
      <section className={styles.content}>
        <div className={styles.stack}>
          <InterferenceWorkspaceBanner
            description="按工具主实体浏览版本与状态；下载按具体版本分流。上传与条目级管理入口仅管理员可见。"
            title="工具仓库"
          />

          <section className={`surface ${styles.panel}`}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>工具列表</h2>
                <p className={styles.panelText}>
                  企业内网工具目录：分类、简介、最新版本与状态一目了然。点击卡片进入详情与版本下载。
                </p>
              </div>
              {canManage ? (
                <Link className="button" href={`${toolsListPath}/upload` as Route}>
                  上传工具
                </Link>
              ) : null}
            </div>

            {toolsState.kind === "ready" && toolsState.data.items.length ? (
              <div className={pageStyles.toolGrid}>
                {toolsState.data.items.map((tool) => {
                  const deprecated = normalizeToolStatus(tool.status) === "deprecated";
                  const detailHref = `${toolsListPath}/${tool.id}` as Route;
                  return (
                    <div
                      className={`${pageStyles.toolCard} ${deprecated ? pageStyles.toolCardDeprecated : ""}`}
                      key={tool.id}
                      onClick={() => router.push(detailHref)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(detailHref);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={pageStyles.toolCardTop}>
                        <div>
                          <p className={pageStyles.toolCardCategory}>{tool.category}</p>
                          <h3 className={pageStyles.toolCardTitle}>{tool.name}</h3>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span
                            className={`${pageStyles.statusPill} ${statusClass(tool.status)}`}
                          >
                            {toolStatusLabel(tool.status)}
                          </span>
                          {canManage ? (
                            <button
                              className={pageStyles.toolCardManage}
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(detailHref);
                              }}
                              type="button"
                            >
                              管理
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className={pageStyles.toolCardSummary}>{tool.summary}</p>
                      {tool.tags?.length ? (
                        <div className={pageStyles.tagRow}>
                          {tool.tags.map((tag) => (
                            <span className={pageStyles.tagPill} key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className={pageStyles.toolCardMetaRow}>
                        <span className={pageStyles.latestVersionEmphasis}>
                          最新 {tool.latest_version || "—"}
                        </span>
                        <span className={pageStyles.toolCardUpdated}>
                          更新{" "}
                          {tool.updated_at
                            ? new Date(tool.updated_at).toLocaleString("zh-CN")
                            : "—"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {toolsState.kind === "loading" ? (
              <div className={styles.empty}>正在加载工具列表...</div>
            ) : null}
            {toolsState.kind === "error" ? (
              <div className={styles.error}>{toolsState.message}</div>
            ) : null}

            {toolsState.kind === "ready" && !toolsState.data.items.length ? (
              <div className={styles.empty}>
                暂无工具。管理员可在右上角上传入口新增；或于后端执行{" "}
                <code>python manage.py seed_demo_tools</code> 写入演示数据。
              </div>
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
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    type="button"
                  >
                    上一页
                  </button>
                  <button
                    className={styles.buttonSmall}
                    disabled={!toolsState.data.pagination.next}
                    onClick={() => setPage((p) => p + 1)}
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
                <h2 className={styles.panelTitle}>说明</h2>
                <p className={styles.panelText}>
                  普通用户仅可浏览与按版本下载；创建工具、编辑、删除与追加版本需要管理员权限。
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </DepartmentAccessGuard>
  );
}
