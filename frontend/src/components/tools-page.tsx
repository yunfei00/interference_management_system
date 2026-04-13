"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { ToolListItem } from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { normalizeToolStatus, toolStatusLabel } from "@/lib/tool-status";
import { TOOLS_MANAGE_ACCESS, TOOLS_VIEW_ACCESS } from "@/lib/tool-permissions";
import { useToolsPaginatedResource } from "@/lib/use-tools-bff-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
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
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  const toolsState = useToolsPaginatedResource({
    query: { page, page_size: 10, q: keyword },
    enabled: canView,
  });

  return (
    <DepartmentAccessGuard
      description="当前账号没有进入工具仓库的权限。"
      requiredPermissions={[...TOOLS_VIEW_ACCESS]}
      title="无法访问工具仓库"
    >
      <section
        className={`${styles.content} ${canManage ? pageStyles.toolsPageAdmin : pageStyles.toolsPageUser}`}
      >
        <div className={pageStyles.toolsMainColumn}>
          <section className={`surface ${styles.panel} ${pageStyles.catalogPanel}`}>
            <header className={pageStyles.catalogHeader}>
              <div className={pageStyles.catalogHeaderText}>
                <h2 className={pageStyles.catalogTitle}>工具仓库</h2>
                <p className={pageStyles.catalogSubtitle}>
                  <span className={pageStyles.catalogMicrohead}>已收录工具</span>
                  {canManage
                    ? " · 您具备维护权限：可通过右上角入口上传，或在卡片菜单中快速跳转。"
                    : " · 浏览工具信息与版本，进入详情可下载指定版本。"}
                </p>
              </div>
              {canManage ? (
                <div className={pageStyles.catalogAdminCorner}>
                  <Link
                    className={pageStyles.catalogAdminLink}
                    href={`${toolsListPath}/upload` as Route}
                  >
                    上传新工具
                  </Link>
                </div>
              ) : null}
            </header>
            <div className={pageStyles.searchRow}>
              <input
                className={pageStyles.searchInput}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索工具名、编码、分类、简介或标签"
                type="search"
                value={keyword}
              />
            </div>

            {toolsState.kind === "ready" && toolsState.data.items.length ? (
              <div className={pageStyles.toolGrid}>
                {toolsState.data.items.map((tool) => (
                  <ToolCatalogCard
                    canManage={canManage}
                    key={tool.id}
                    listPath={toolsListPath}
                    onOpen={() =>
                      router.push(`${toolsListPath}/${tool.id}` as Route)
                    }
                    statusClassName={statusClass(tool.status)}
                    tool={tool}
                  />
                ))}
              </div>
            ) : null}

            {toolsState.kind === "loading" ? (
              <div className={styles.empty}>正在加载工具列表...</div>
            ) : null}
            {toolsState.kind === "error" ? (
              <div className={styles.error} role="alert">
                {toolsState.message ||
                  "无法加载工具列表，请刷新后重试或联系管理员。"}
              </div>
            ) : null}

            {toolsState.kind === "ready" && !toolsState.data.items.length ? (
              <div className={styles.empty}>
                {keyword.trim() ? (
                  <>未找到匹配“{keyword.trim()}”的工具，请调整关键词后重试。</>
                ) : canManage ? (
                  <>
                    暂无工具。可在上方上传，或于后端执行{" "}
                    <code>python manage.py seed_demo_tools</code>。
                  </>
                ) : (
                  <>暂无已发布工具，请联系管理员。</>
                )}
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

        <aside className={pageStyles.toolsAside}>
          {toolsState.kind === "ready" && toolsState.data.items.length ? (
            <ToolsOverviewPanel
              items={toolsState.data.items}
              totalCount={toolsState.data.pagination.count}
            />
          ) : (
            <div className={pageStyles.overviewPlaceholder}>
              <p className={pageStyles.overviewPlaceholderText}>
                加载列表后将在此显示本页与全库汇总。
              </p>
            </div>
          )}
        </aside>
      </section>
    </DepartmentAccessGuard>
  );
}

function ToolsOverviewPanel({
  items,
  totalCount,
}: {
  items: ToolListItem[];
  totalCount: number;
}) {
  const { pageActive, pageTesting, pageDeprecated, latestLabel } = useMemo(() => {
    let a = 0;
    let t = 0;
    let d = 0;
    let latest = 0;
    for (const row of items) {
      switch (normalizeToolStatus(row.status)) {
        case "active":
          a += 1;
          break;
        case "testing":
          t += 1;
          break;
        case "deprecated":
          d += 1;
          break;
        default:
          break;
      }
      const ts = row.updated_at ? new Date(row.updated_at).getTime() : 0;
      if (ts > latest) latest = ts;
    }
    return {
      pageActive: a,
      pageTesting: t,
      pageDeprecated: d,
      latestLabel:
        latest > 0
          ? new Date(latest).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—",
    };
  }, [items]);

  return (
    <div className={pageStyles.overviewCard}>
      <h3 className={pageStyles.overviewTitle}>概览</h3>
      <dl className={pageStyles.overviewStats}>
        <div className={pageStyles.overviewRow}>
          <dt>工具总数</dt>
          <dd>{totalCount}</dd>
        </div>
        <div className={pageStyles.overviewRow}>
          <dt>可用</dt>
          <dd>{pageActive}</dd>
        </div>
        <div className={pageStyles.overviewRow}>
          <dt>测试中</dt>
          <dd>{pageTesting}</dd>
        </div>
        <div className={pageStyles.overviewRow}>
          <dt>已归档</dt>
          <dd>{pageDeprecated}</dd>
        </div>
        <div className={pageStyles.overviewRow}>
          <dt>本页最近更新</dt>
          <dd>{latestLabel}</dd>
        </div>
      </dl>
      <p className={pageStyles.overviewFootnote}>
        状态列为当前页分布；全库共 {totalCount} 个工具。
      </p>
    </div>
  );
}

function ToolCatalogCard({
  tool,
  canManage,
  statusClassName,
  onOpen,
  listPath,
}: {
  tool: ToolListItem;
  canManage: boolean;
  statusClassName: string;
  onOpen: () => void;
  listPath: Route;
}) {
  const deprecated = normalizeToolStatus(tool.status) === "deprecated";

  return (
    <article
      className={`${pageStyles.toolCard} ${deprecated ? pageStyles.toolCardDeprecated : ""} ${canManage ? pageStyles.toolCardAdminMark : ""}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {canManage ? (
        <details
          className={pageStyles.cardMenu}
          onClick={(e) => e.stopPropagation()}
        >
          <summary
            className={pageStyles.cardMenuTrigger}
            onClick={(e) => e.stopPropagation()}
          >
            ···
          </summary>
          <div
            className={pageStyles.cardMenuPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href={`${listPath}/${tool.id}` as Route}
              onClick={(e) => e.stopPropagation()}
            >
              进入详情维护
            </Link>
          </div>
        </details>
      ) : null}
      <h3 className={pageStyles.toolCardTitle}>{tool.name}</h3>
      <div className={pageStyles.toolCardMetaLine}>
        <span className={pageStyles.toolCardCategory}>{tool.category}</span>
        <span className={`${pageStyles.statusPill} ${statusClassName}`}>
          {toolStatusLabel(tool.status)}
        </span>
      </div>
      <p className={pageStyles.toolCardSummary}>{tool.summary}</p>
      <div className={pageStyles.toolCardFooter}>
        <span className={pageStyles.latestVersionPill}>{tool.latest_version || "—"}</span>
        <span className={pageStyles.toolCardUpdatedMeta}>
          {tool.updated_at
            ? new Date(tool.updated_at).toLocaleString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
        <span className={pageStyles.cardChevron} aria-hidden>
          进入详情
        </span>
      </div>
    </article>
  );
}
