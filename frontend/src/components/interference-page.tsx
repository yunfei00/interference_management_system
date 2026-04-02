"use client";

import Link from "next/link";

import type {
  CommandTaskItem,
  DatasetItem,
  HostItem,
  ToolItem,
} from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import { usePaginatedResource } from "@/lib/use-paginated-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import { InterferenceWorkspaceNav } from "./interference-workspace-nav";
import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./department-pages.module.css";

function getCount(state: { kind: string; data?: { pagination: { count: number } } }) {
  if (state.kind !== "ready") {
    return "-";
  }

  return state.data?.pagination.count ?? "-";
}

export function InterferencePage() {
  const { state } = useDashboardSession();
  const enabled = state.kind === "ready";
  const permissions = enabled ? state.data.permissions : [];
  const canSeeHosts = hasDashboardPermission(permissions, "ops.host.view");
  const canSeeCommands = hasDashboardPermission(permissions, "ops.command.view");

  const datasetsState = usePaginatedResource<DatasetItem>({
    endpoint: "/api/datahub/datasets",
    query: { page: 1 },
    enabled,
    messages: defaultFetchMessages,
  });
  const toolsState = usePaginatedResource<ToolItem>({
    endpoint: "/api/tools",
    query: { page: 1 },
    enabled,
    messages: defaultFetchMessages,
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
      description="当前账号没有进入干扰子部门页面的权限。"
      permission="department.interference.view"
      title="无法访问干扰页面"
    >
      <main className={styles.page}>
        <section className={`surface ${styles.hero}`}>
          <div className={styles.eyebrow}>电磁 / 干扰</div>
          <h1 className={styles.title}>原有业务内容现在都归到干扰</h1>
          <p className={styles.copy}>
            你之前系统里的数据中心、工具仓库、主机管理和命令审计，现在都作为“干扰”子部门的工作区继续保留。
            后续如果再细拆，也会从这里往下扩。
          </p>

          <div className={styles.chipRow}>
            <span className={styles.chip}>数据集：{getCount(datasetsState)}</span>
            <span className={styles.chip}>工具：{getCount(toolsState)}</span>
            <span className={styles.chip}>
              主机：{canSeeHosts ? getCount(hostsState) : "无权限"}
            </span>
            <span className={styles.chip}>
              命令：{canSeeCommands ? getCount(commandsState) : "无权限"}
            </span>
          </div>

          <InterferenceWorkspaceNav />
        </section>

        <section className={styles.content}>
          <div className={styles.stack}>
            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>干扰工作区</h2>
                <p className={styles.panelText}>
                  当前四块业务内容都可以从这里进入。后续你要继续做“部门化重构”时，
                  这块就是干扰子部门自己的工作台主页。
                </p>
              </div>

              <div className={styles.grid}>
                <article className={styles.card}>
                  <div className={styles.cardTitle}>数据中心</div>
                  <div className={styles.cardCopy}>
                    管理干扰测量数据集、上传源文件、查看热力图和测量点。
                  </div>
                  <div className={styles.actions}>
                    <Link className="button" href="/dashboard/datasets">
                      打开数据中心
                    </Link>
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.cardTitle}>工具仓库</div>
                  <div className={styles.cardCopy}>
                    统一沉淀干扰分析、采集、辅助处理相关的工具文件。
                  </div>
                  <div className={styles.actions}>
                    <Link className="buttonGhost" href="/dashboard/tools">
                      打开工具仓库
                    </Link>
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.cardTitle}>主机管理</div>
                  <div className={styles.cardCopy}>
                    连接干扰实验或现场运行主机，保留远程命令能力。
                  </div>
                  <div className={styles.actions}>
                    <Link className="buttonGhost" href="/dashboard/hosts">
                      打开主机管理
                    </Link>
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.cardTitle}>命令审计</div>
                  <div className={styles.cardCopy}>
                    跟踪干扰工作区下的远程命令执行结果和审计记录。
                  </div>
                  <div className={styles.actions}>
                    <Link className="buttonGhost" href="/dashboard/commands">
                      打开命令审计
                    </Link>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <aside className={styles.stack}>
            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>当前归属说明</h2>
                <p className={styles.panelText}>
                  后续其他子部门开始建设时，可以直接仿照干扰页建立自己的模块入口。
                </p>
              </div>
              <div className={styles.list}>
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>当前状态</span>
                  <span className={styles.listValue}>干扰已接管全部原有内容页</span>
                </div>
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>后续扩展</span>
                  <span className={styles.listValue}>RSE、EMC、射频可独立补业务模块</span>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </DepartmentAccessGuard>
  );
}
