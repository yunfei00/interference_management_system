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

import { DashboardNav } from "./dashboard-nav";
import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./department-pages.module.css";

function getCount(state: { kind: string; data?: { pagination: { count: number } } }) {
  if (state.kind !== "ready") {
    return "-";
  }

  return state.data?.pagination.count ?? "-";
}

export function OverviewPage() {
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

  const departmentName =
    state.kind === "ready"
      ? state.data.user.department_full_name || "未分配部门"
      : "加载中";

  return (
    <main className={styles.page}>
      <section className={`surface ${styles.hero}`}>
        <div className={styles.eyebrow}>公司部门工作台</div>
        <h1 className={styles.title}>从部门进入新的管理系统</h1>
        <p className={styles.copy}>
          现在这套系统已经按公司组织结构重新规划。顶层先分为电磁和射频，
          当前所有已迁移完成的业务能力都归属在“电磁 / 干扰”下，RSE、EMC 和射频页面已预留但暂不填充具体内容。
        </p>

        <div className={styles.chipRow}>
          <span className={styles.chip}>当前账号部门：{departmentName}</span>
          <span className={styles.chip}>数据集：{getCount(datasetsState)}</span>
          <span className={styles.chip}>工具：{getCount(toolsState)}</span>
          <span className={styles.chip}>
            主机：{canSeeHosts ? getCount(hostsState) : "无权限"}
          </span>
          <span className={styles.chip}>
            命令：{canSeeCommands ? getCount(commandsState) : "无权限"}
          </span>
        </div>

        <DashboardNav />
      </section>

      <section className={styles.content}>
        <div className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div>
              <h2 className={styles.panelTitle}>部门入口</h2>
              <p className={styles.panelText}>
                日常操作建议先从部门页进入。电磁下面已经细分到干扰、RSE、EMC，
                其中干扰页连接了当前全部业务工作区。
              </p>
            </div>

            <div className={styles.grid}>
              <article className={styles.card}>
                <div className={styles.cardTitle}>电磁</div>
                <div className={styles.cardCopy}>
                  进入电磁事业部主页，查看干扰、RSE、EMC 三个子部门的分工入口。
                </div>
                <div className={styles.cardMeta}>
                  当前已上线内容集中在“干扰”子部门。
                </div>
                <div className={styles.actions}>
                  <Link className="button" href="/dashboard/electromagnetic">
                    打开电磁页面
                  </Link>
                </div>
              </article>

              <article className={styles.card}>
                <div className={styles.cardTitle}>射频</div>
                <div className={styles.cardCopy}>
                  射频页面已预留，当前阶段先保留结构，后续再逐步补齐具体业务模块。
                </div>
                <div className={styles.cardMeta}>
                  现在可以先作为新项目的组织入口和占位页。
                </div>
                <div className={styles.actions}>
                  <Link className="buttonGhost" href="/dashboard/rf">
                    打开射频页面
                  </Link>
                </div>
              </article>
            </div>
          </section>

          <section className={`surface ${styles.panel}`}>
            <div>
              <h2 className={styles.panelTitle}>当前已迁移能力</h2>
              <p className={styles.panelText}>
                这些能力都已经归到“电磁 / 干扰”下面，后续用户将从部门页进入对应工作区。
              </p>
            </div>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>数据中心</span>
                <span className={styles.listValue}>
                  数据集、文件上传、测量点、热力图
                </span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>工具仓库</span>
                <span className={styles.listValue}>
                  干扰相关工具上传、版本管理和下载入口
                </span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>主机管理</span>
                <span className={styles.listValue}>
                  干扰环境主机资产、在线状态与远程命令执行
                </span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>命令审计</span>
                <span className={styles.listValue}>
                  干扰工作区内所有远程命令任务的结果追踪
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div>
              <h2 className={styles.panelTitle}>当前组织规则</h2>
              <p className={styles.panelText}>
                这套规则已经同步到后端初始化逻辑里，数据库重建后也可以直接恢复。
              </p>
            </div>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>一级部门</span>
                <span className={styles.listValue}>电磁、射频</span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>电磁子部门</span>
                <span className={styles.listValue}>干扰、RSE、EMC</span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>当前内容归属</span>
                <span className={styles.listValue}>原有业务页面全部归到干扰</span>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
