"use client";

import { useState } from "react";

import type { CommandTaskItem } from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import { usePaginatedResource } from "@/lib/use-paginated-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import { InterferenceWorkspaceBanner } from "./interference-workspace-banner";
import styles from "./management-page.module.css";

const COMMANDS_ACCESS = [
  "department.interference.view",
  "interference.commands.view",
];

export function CommandsPage() {
  const { state } = useDashboardSession();
  const canView =
    state.kind === "ready" &&
    hasDashboardPermission(state.data.permissions, COMMANDS_ACCESS);
  const [page, setPage] = useState(1);

  const commandsState = usePaginatedResource<CommandTaskItem>({
    endpoint: "/api/ops/commands",
    query: { page },
    enabled: canView,
    messages: defaultFetchMessages,
  });

  return (
    <DepartmentAccessGuard
      description="当前账号没有查看命令审计的权限。"
      requiredPermissions={COMMANDS_ACCESS}
      title="无法访问命令审计"
    >
    <section className={styles.content}>
      <div className={styles.stack}>
        <InterferenceWorkspaceBanner
          description="命令审计是干扰子部门当前的运维审计页，主要跟踪主机远程操作的执行结果。"
          title="命令审计"
        />

        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>命令任务审计</h2>
              <p className={styles.panelText}>
                汇总每次远程命令的主机、执行状态、操作人和结果文本。
              </p>
            </div>
          </div>

          {commandsState.kind === "ready" && commandsState.data.items.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>主机</th>
                    <th>命令</th>
                    <th>状态</th>
                    <th>结果</th>
                  </tr>
                </thead>
                <tbody>
                  {commandsState.data.items.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <div className={styles.primaryCell}>
                          <span className={styles.primaryText}>{task.host_name}</span>
                          <span className={styles.secondaryText}>
                            操作人：{task.operator || "未知"}
                          </span>
                        </div>
                      </td>
                      <td>{task.command}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            task.status === "SUCCESS"
                              ? styles.badgeOk
                              : styles.badgeMuted
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles.primaryCell}>
                          <span className={styles.secondaryText}>
                            {task.result || "-"}
                          </span>
                          <span className={styles.secondaryText}>
                            完成时间：{task.finished_at || "-"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {commandsState.kind === "loading" ? (
            <div className={styles.empty}>正在加载命令任务...</div>
          ) : null}
          {commandsState.kind === "error" ? (
            <div className={styles.error}>{commandsState.message}</div>
          ) : null}

          {commandsState.kind === "ready" ? (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                第 {commandsState.data.pagination.page} /{" "}
                {commandsState.data.pagination.pages || 1} 页，共{" "}
                {commandsState.data.pagination.count} 条
              </div>
              <div className={styles.paginationActions}>
                <button
                  className={styles.buttonSmall}
                  disabled={!commandsState.data.pagination.previous}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  上一页
                </button>
                <button
                  className={styles.buttonSmall}
                  disabled={!commandsState.data.pagination.next}
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
              <h2 className={styles.panelTitle}>审计范围</h2>
              <p className={styles.panelText}>当前页面主要覆盖命令执行轨迹，后续可继续叠加登录日志与操作日志。</p>
            </div>
          </div>
          <div className={styles.asideList}>
            <div className={styles.asideItem}>
              <span className={styles.asideLabel}>来源接口</span>
              <span className={styles.asideValue}>GET /api/ops/commands</span>
            </div>
            <div className={styles.asideItem}>
              <span className={styles.asideLabel}>当前粒度</span>
              <span className={styles.asideValue}>命令、状态、结果、操作人、时间</span>
            </div>
          </div>
        </section>
      </aside>
    </section>
    </DepartmentAccessGuard>
  );
}
