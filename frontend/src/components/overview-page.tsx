"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { CommandTaskItem, DatasetItem, HostItem } from "@/lib/contracts";
import { hasAnyDashboardPermission } from "@/lib/dashboard-navigation";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import { usePaginatedResource } from "@/lib/use-paginated-resource";
import { useToolsPaginatedResource } from "@/lib/use-tools-bff-resource";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./department-pages.module.css";

function getCount(state: { kind: string; data?: { pagination: { count: number } } }) {
  if (state.kind !== "ready") {
    return "-";
  }

  return state.data?.pagination.count ?? "-";
}

export function OverviewPage() {
  const router = useRouter();
  const { state } = useDashboardSession();
  const enabled = state.kind === "ready";
  const permissions = enabled ? state.data.permissions : [];
  const user = enabled ? state.data.user : null;
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser);
  const deptPath = user?.department_page_path?.trim();

  useEffect(() => {
    if (state.kind !== "ready") {
      return;
    }
    if (isAdmin) {
      return;
    }
    if (deptPath?.startsWith("/")) {
      router.replace(deptPath as Route);
    }
  }, [state.kind, isAdmin, deptPath, router]);

  const canSeeHosts = hasAnyDashboardPermission(permissions, [
    "interference.hosts.view",
    "ops.host.view",
  ]);
  const canSeeCommands = hasAnyDashboardPermission(permissions, [
    "interference.commands.view",
    "ops.command.view",
  ]);

  const datasetsState = usePaginatedResource<DatasetItem>({
    endpoint: "/api/datahub/datasets",
    query: { page: 1 },
    enabled: enabled && isAdmin,
    messages: defaultFetchMessages,
  });
  const toolsState = useToolsPaginatedResource({
    query: { page: 1, page_size: 10 },
    enabled: enabled && isAdmin,
  });
  const hostsState = usePaginatedResource<HostItem>({
    endpoint: "/api/ops/hosts",
    query: { page: 1 },
    enabled: enabled && isAdmin && canSeeHosts,
    messages: defaultFetchMessages,
  });
  const commandsState = usePaginatedResource<CommandTaskItem>({
    endpoint: "/api/ops/commands",
    query: { page: 1 },
    enabled: enabled && isAdmin && canSeeCommands,
    messages: defaultFetchMessages,
  });

  const departmentName = user?.department_full_name || "未分配部门";

  if (state.kind === "loading") {
    return (
      <div className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <div className={styles.empty}>正在加载工作台...</div>
        </section>
      </div>
    );
  }

  if (state.kind !== "ready") {
    return (
      <div className={styles.page}>
        <section className={`surface ${styles.panel}`}>
          <div className={styles.empty}>无法加载会话。</div>
        </section>
      </div>
    );
  }

  if (!isAdmin) {
    if (deptPath?.startsWith("/")) {
      return (
        <div className={styles.page}>
          <section className={`surface ${styles.panel}`}>
            <div className={styles.empty}>正在进入所属部门门户…</div>
          </section>
        </div>
      );
    }

    return (
      <div className={styles.page}>
        <section className={`surface ${styles.hero}`}>
          <div className={styles.eyebrow}>组织信息</div>
          <h1 className={`${styles.title} ${styles.titleCompact}`}>尚未配置门户路径</h1>
          <p className={styles.copy}>
            当前账号（{departmentName}
            ）未绑定可用的部门门户路径，无法自动进入工作台。请联系管理员在部门资料中配置「页面路径」，或为您开通管理员查看权限。
          </p>
        </section>
      </div>
    );
  }

  const adminUser = state.data.user;

  return (
    <div className={styles.page}>
      <section className={`surface ${styles.hero}`}>
        <div className={styles.eyebrow}>管理总览</div>
        <h1 className={`${styles.title} ${styles.titleCompact}`}>跨部门汇总视图</h1>
        <p className={styles.copy}>
          供企业管理员查看组织范围内的资源概况与部门入口。普通业务用户登录后将直接进入本人所属部门门户，不会进入本页。
        </p>

        <div className={styles.chipRow}>
          <span className={styles.chip}>操作者：{adminUser.username}</span>
          <span className={styles.chip}>组织：{departmentName}</span>
          <span className={styles.chip}>数据集：{getCount(datasetsState)}</span>
          <span className={styles.chip}>工具：{getCount(toolsState)}</span>
          <span className={styles.chip}>
            主机：{canSeeHosts ? getCount(hostsState) : "无权限"}
          </span>
          <span className={styles.chip}>
            命令任务：{canSeeCommands ? getCount(commandsState) : "无权限"}
          </span>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div>
              <h2 className={styles.panelTitle}>部门与门户</h2>
              <p className={styles.panelText}>
                业务入口按「电磁 / 射频」与二级子部门组织；干扰侧已接入数据、工具、主机与审计能力，其余子部门为正式占位。
              </p>
            </div>

            <div className={styles.grid}>
              <article className={styles.card}>
                <div className={styles.cardTitle}>电磁事业部</div>
                <div className={styles.cardCopy}>
                  查看干扰、RSE、EMC 子部门挂载与占位说明；干扰承接全部已迁移业务能力。
                </div>
                <div className={styles.actions}>
                  <Link
                    className="button"
                    href={"/dashboard/electromagnetic" as Route}
                  >
                    打开电磁
                  </Link>
                </div>
              </article>

              <article className={styles.card}>
                <div className={styles.cardTitle}>射频事业部</div>
                <div className={styles.cardCopy}>
                  射频一级门户已发布，用于后续扩展该方向业务，并与电磁保持并列的信息架构。
                </div>
                <div className={styles.actions}>
                  <Link className="buttonGhost" href={"/dashboard/rf" as Route}>
                    打开射频
                  </Link>
                </div>
              </article>
            </div>
          </section>

          <section className={`surface ${styles.panel}`}>
            <div>
              <h2 className={styles.panelTitle}>干扰子部门（已上线）</h2>
              <p className={styles.panelText}>
                数据中心、工具仓库、主机管理、命令审计均归集在电磁 / 干扰路由下，便于部门化授权与导航。
              </p>
            </div>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>干扰门户</span>
                <span className={styles.listValue}>统一子部门入口与能力卡片</span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>数据中心</span>
                <span className={styles.listValue}>数据集、导入与测量可视化</span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>工具仓库</span>
                <span className={styles.listValue}>工具分发与版本管理</span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>主机 / 审计</span>
                <span className={styles.listValue}>
                  清单与状态只读面向授权业务用户；登记与远程命令为管理员能力
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div>
              <h2 className={styles.panelTitle}>组织规则摘要</h2>
              <p className={styles.panelText}>
                权限采用「部门 + 功能」双重校验；菜单与面包屑随授权收敛，避免跨部门暴露。
              </p>
            </div>
            <div className={styles.list}>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>一级</span>
                <span className={styles.listValue}>电磁、射频</span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>电磁二级</span>
                <span className={styles.listValue}>干扰、RSE、EMC</span>
              </div>
              <div className={styles.listItem}>
                <span className={styles.listLabel}>业务归属</span>
                <span className={styles.listValue}>原工作台能力归口干扰</span>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
