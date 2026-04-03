"use client";

import type { Route } from "next";
import Link from "next/link";

import type { CommandTaskItem, DatasetItem, HostItem } from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import { usePaginatedResource } from "@/lib/use-paginated-resource";
import { useToolsPaginatedResource } from "@/lib/use-tools-bff-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./department-pages.module.css";

function getCount(state: { kind: string; data?: { pagination: { count: number } } }) {
  if (state.kind !== "ready") {
    return "-";
  }

  return state.data?.pagination.count ?? "-";
}

const P_DASH = ["department.interference.view", "interference.dashboard.view"];
const P_DATA = ["department.interference.view", "interference.datahub.view"];
const P_TOOLS = ["department.interference.view", "interference.tools.view"];
const P_HOSTS = ["department.interference.view", "interference.hosts.view"];
const P_CMD = ["department.interference.view", "interference.commands.view"];

export function InterferencePage() {
  const { state } = useDashboardSession();
  const enabled = state.kind === "ready";
  const permissions = enabled ? state.data.permissions : [];
  const sessionUser = enabled ? state.data.user : null;
  const canSeeHosts = hasDashboardPermission(permissions, P_HOSTS);
  const canSeeCommands = hasDashboardPermission(permissions, P_CMD);
  const canSeeData = hasDashboardPermission(permissions, P_DATA);
  const canSeeTools = hasDashboardPermission(permissions, P_TOOLS);

  const datasetsState = usePaginatedResource<DatasetItem>({
    endpoint: "/api/datahub/datasets",
    query: { page: 1 },
    enabled: enabled && canSeeData,
    messages: defaultFetchMessages,
  });
  const toolsState = useToolsPaginatedResource({
    query: { page: 1, page_size: 10 },
    enabled: enabled && canSeeTools,
  });
  const hostsState = usePaginatedResource<HostItem>({
    endpoint: "/api/ops/hosts",
    query: { page: 1 },
    enabled: enabled && canSeeHosts,
    messages: defaultFetchMessages,
  });
  const commandsState = usePaginatedResource<CommandTaskItem>({
    endpoint: "/api/ops/commands",
    query: { page: 1 },
    enabled: enabled && canSeeCommands,
    messages: defaultFetchMessages,
  });

  return (
    <DepartmentAccessGuard
      description="当前账号没有进入干扰子部门门户的权限。"
      requiredPermissions={P_DASH}
      title="无法访问干扰门户"
    >
      <div className={`${styles.page} ${styles.portalPage}`}>
        <header className={styles.portalHeader}>
          <h1 className={styles.portalTitle}>干扰门户</h1>
          <p className={styles.portalDeptPath}>电磁 / 干扰 子部门工作入口</p>
          <p className={styles.portalLead}>
            统一管理干扰相关的数据资源、工具能力与现场主机，支持数据分析、工具调度与运维管理。
          </p>
        </header>

        <section className={styles.portalMain} aria-label="业务入口">
          <div className={styles.portalCardGrid}>
            {canSeeData ? (
              <Link
                className={`${styles.card} ${styles.portalCard} ${styles.portalCardClickable}`}
                href={
                  "/dashboard/electromagnetic/interference/datasets" as unknown as Route
                }
              >
                <div className={styles.cardTitle}>数据中心</div>
                <div className={styles.cardCopy}>
                  平台侧数据集与测量资产的统一纳管、上传与可视化分析。
                </div>
              </Link>
            ) : (
              <div
                className={`${styles.card} ${styles.portalCard} ${styles.portalCardMuted}`}
              >
                <div className={styles.cardTitle}>数据中心</div>
                <div className={styles.cardCopy}>当前账号未开通数据中心访问权限。</div>
              </div>
            )}

            {canSeeTools ? (
              <Link
                className={`${styles.card} ${styles.portalCard} ${styles.portalCardClickable}`}
                href={
                  "/dashboard/electromagnetic/interference/tools" as unknown as Route
                }
              >
                <div className={styles.cardTitle}>工具仓库</div>
                <div className={styles.cardCopy}>
                  工具版本与分发能力，统一承载分析与采集相关资产。
                </div>
              </Link>
            ) : (
              <div
                className={`${styles.card} ${styles.portalCard} ${styles.portalCardMuted}`}
              >
                <div className={styles.cardTitle}>工具仓库</div>
                <div className={styles.cardCopy}>当前账号未开通工具仓库访问权限。</div>
              </div>
            )}

            {canSeeHosts ? (
              <Link
                className={`${styles.card} ${styles.portalCard} ${styles.portalCardClickable}`}
                href={
                  "/dashboard/electromagnetic/interference/hosts" as unknown as Route
                }
              >
                <div className={styles.cardTitle}>主机管理</div>
                <div className={styles.cardCopy}>
                  主机资产与连接状态的平台视图，支持授权范围内的运行管理。
                </div>
              </Link>
            ) : (
              <div
                className={`${styles.card} ${styles.portalCard} ${styles.portalCardMuted}`}
              >
                <div className={styles.cardTitle}>主机管理</div>
                <div className={styles.cardCopy}>
                  当前账号未开通主机管理权限，如需使用请联系管理员。
                </div>
              </div>
            )}

            {canSeeCommands ? (
              <Link
                className={`${styles.card} ${styles.portalCard} ${styles.portalCardClickable}`}
                href={
                  "/dashboard/electromagnetic/interference/commands" as unknown as Route
                }
              >
                <div className={styles.cardTitle}>命令审计</div>
                <div className={styles.cardCopy}>
                  远程操作留痕与审计查询，支撑内控与合规追溯。
                </div>
              </Link>
            ) : (
              <div
                className={`${styles.card} ${styles.portalCard} ${styles.portalCardMuted}`}
              >
                <div className={styles.cardTitle}>命令审计</div>
                <div className={styles.cardCopy}>
                  当前账号未开通命令审计权限，如需使用请联系管理员。
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className={styles.portalFoot}>
          {sessionUser ? (
            <p className={styles.portalUserMeta}>
              <span>{sessionUser.username}</span>
              <span className={styles.portalUserSep}>·</span>
              <span>{sessionUser.department_full_name ?? "组织待分配"}</span>
            </p>
          ) : null}

          <div className={styles.portalStats}>
            <span className={styles.portalStatChip}>数据集 {getCount(datasetsState)}</span>
            <span className={styles.portalStatChip}>工具 {getCount(toolsState)}</span>
            <span className={styles.portalStatChip}>
              主机 {canSeeHosts ? getCount(hostsState) : "—"}
            </span>
            <span className={styles.portalStatChip}>
              审计 {canSeeCommands ? getCount(commandsState) : "—"}
            </span>
          </div>

          <div className={styles.portalHelp}>
            <h2 className={styles.portalHelpTitle}>使用说明</h2>
            <p className={styles.portalHelpText}>
              本页为干扰子部门门户。权限与组织信息由企业管理员维护；可见模块随部门与功能权限策略变化。
            </p>
            <ul className={styles.portalHelpList}>
              <li>请通过左侧导航在各模块间切换，面包屑用于确认当前位置。</li>
              <li>无权限的模块在侧栏中不展示，亦无法访问对应路径。</li>
            </ul>
          </div>
        </footer>
      </div>
    </DepartmentAccessGuard>
  );
}
