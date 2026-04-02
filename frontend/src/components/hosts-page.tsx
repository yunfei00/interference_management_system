"use client";

import { useDeferredValue, useState, useTransition } from "react";

import type { ApiEnvelope, CommandTaskItem, HostItem } from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import { usePaginatedResource } from "@/lib/use-paginated-resource";

import { useDashboardSession } from "./dashboard-session-provider";
import { InterferenceWorkspaceBanner } from "./interference-workspace-banner";
import styles from "./management-page.module.css";

export function HostsPage() {
  const { state } = useDashboardSession();
  const canView =
    state.kind === "ready" &&
    hasDashboardPermission(state.data.permissions, "ops.host.view");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [online, setOnline] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("8686");
  const [token, setToken] = useState("");
  const [note, setNote] = useState("");
  const [selectedHostId, setSelectedHostId] = useState("");
  const [command, setCommand] = useState("reboot");
  const [serviceName, setServiceName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hostsState = usePaginatedResource<HostItem>({
    endpoint: "/api/ops/hosts",
    query: {
      page,
      q: deferredQuery,
      online,
      refresh: refreshKey,
    },
    enabled: canView,
    messages: defaultFetchMessages,
  });

  async function createHost() {
    setFeedback(null);
    const response = await fetch("/api/ops/hosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        ip,
        port: Number(port),
        token,
        note,
      }),
    });
    const payload = (await response.json()) as ApiEnvelope<HostItem | null>;
    if (!response.ok || !payload.success || !payload.data) {
      setFeedback(payload.message || "创建主机失败。");
      return;
    }
    setName("");
    setIp("");
    setPort("8686");
    setToken("");
    setNote("");
    setSelectedHostId(String(payload.data.id));
    setRefreshKey((value) => value + 1);
    setFeedback("主机创建成功。");
  }

  async function runCommand() {
    if (!selectedHostId) {
      setFeedback("请先选择一台主机。");
      return;
    }
    setFeedback(null);
    const response = await fetch(`/api/ops/hosts/${selectedHostId}/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        command,
        service_name: serviceName || undefined,
      }),
    });
    const payload = (await response.json()) as ApiEnvelope<CommandTaskItem | null>;
    if (!response.ok || !payload.success || !payload.data) {
      setFeedback(payload.message || "命令执行失败。");
      return;
    }
    setRefreshKey((value) => value + 1);
    setFeedback(`命令已提交，任务 ID：${payload.data.id}`);
  }

  if (state.kind !== "ready" || !canView) {
    return (
      <section className={styles.content}>
        <div className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div className={styles.empty}>当前账号无法访问主机管理。</div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.content}>
      <div className={styles.stack}>
        <InterferenceWorkspaceBanner
          description="主机资产和远程命令能力目前都归属在电磁 / 干扰工作区，后面如果其他部门需要再拆分独立主机池。"
          title="主机管理"
        />

        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>主机清单</h2>
              <p className={styles.panelText}>
                这里保留了原系统的主机资产管理、在线状态和远程执行能力。
              </p>
            </div>
          </div>

          <div className={styles.filters}>
            <label className={styles.field}>
              <span className={styles.label}>搜索</span>
              <input
                className={styles.input}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="按主机名或 IP 搜索"
                value={query}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>在线状态</span>
              <select
                className={styles.select}
                onChange={(event) => {
                  setOnline(event.target.value);
                  setPage(1);
                }}
                value={online}
              >
                <option value="">全部</option>
                <option value="1">在线</option>
                <option value="0">离线</option>
              </select>
            </label>
          </div>

          {hostsState.kind === "ready" && hostsState.data.items.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>主机</th>
                    <th>地址</th>
                    <th>在线</th>
                    <th>资源</th>
                  </tr>
                </thead>
                <tbody>
                  {hostsState.data.items.map((host) => (
                    <tr
                      key={host.id}
                      onClick={() => setSelectedHostId(String(host.id))}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className={styles.primaryCell}>
                          <span className={styles.primaryText}>{host.name}</span>
                          <span className={styles.secondaryText}>
                            {host.note || "无备注"}
                          </span>
                        </div>
                      </td>
                      <td>{host.ip}:{host.port}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            host.is_online ? styles.badgeOk : styles.badgeMuted
                          }`}
                        >
                          {host.is_online ? "在线" : "离线"}
                        </span>
                      </td>
                      <td>
                        {host.latest_metric
                          ? `${host.latest_metric.mem_used}/${host.latest_metric.mem_total} MB`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {hostsState.kind === "loading" ? (
            <div className={styles.empty}>正在加载主机列表...</div>
          ) : null}
          {hostsState.kind === "error" ? (
            <div className={styles.error}>{hostsState.message}</div>
          ) : null}

          {hostsState.kind === "ready" ? (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                第 {hostsState.data.pagination.page} /{" "}
                {hostsState.data.pagination.pages || 1} 页，共{" "}
                {hostsState.data.pagination.count} 条
              </div>
              <div className={styles.paginationActions}>
                <button
                  className={styles.buttonSmall}
                  disabled={!hostsState.data.pagination.previous}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  上一页
                </button>
                <button
                  className={styles.buttonSmall}
                  disabled={!hostsState.data.pagination.next}
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
              <h2 className={styles.panelTitle}>新增主机</h2>
              <p className={styles.panelText}>适合先把现有 Agent 主机纳入新的工作台管理。</p>
            </div>
          </div>
          <div className={styles.filters}>
            <label className={styles.field}>
              <span className={styles.label}>主机名称</span>
              <input className={styles.input} onChange={(event) => setName(event.target.value)} value={name} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>IP</span>
              <input className={styles.input} onChange={(event) => setIp(event.target.value)} value={ip} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>端口</span>
              <input className={styles.input} onChange={(event) => setPort(event.target.value)} value={port} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Token</span>
              <input className={styles.input} onChange={(event) => setToken(event.target.value)} value={token} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>备注</span>
              <input className={styles.input} onChange={(event) => setNote(event.target.value)} value={note} />
            </label>
            <div className={styles.field}>
              <span className={styles.label}>保存</span>
              <button
                className="button"
                onClick={() =>
                  startTransition(() => {
                    void createHost();
                  })
                }
                type="button"
              >
                {isPending ? "保存中..." : "新增主机"}
              </button>
            </div>
          </div>
        </section>

        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>远程命令</h2>
              <p className={styles.panelText}>当前先提供单机命令入口，批量执行后续继续补齐。</p>
            </div>
          </div>
          <div className={styles.filters}>
            <label className={styles.field}>
              <span className={styles.label}>主机 ID</span>
              <input
                className={styles.input}
                onChange={(event) => setSelectedHostId(event.target.value)}
                value={selectedHostId}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>命令</span>
              <select
                className={styles.select}
                onChange={(event) => setCommand(event.target.value)}
                value={command}
              >
                <option value="reboot">重启</option>
                <option value="shutdown">关机</option>
                <option value="service_start">启动服务</option>
                <option value="service_restart">重启服务</option>
                <option value="service_stop">停止服务</option>
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>服务名</span>
              <input
                className={styles.input}
                onChange={(event) => setServiceName(event.target.value)}
                placeholder="服务命令时填写，例如 Spooler"
                value={serviceName}
              />
            </label>
            <div className={styles.field}>
              <span className={styles.label}>执行</span>
              <button
                className="button"
                onClick={() =>
                  startTransition(() => {
                    void runCommand();
                  })
                }
                type="button"
              >
                {isPending ? "执行中..." : "发送命令"}
              </button>
            </div>
          </div>
          {feedback ? <div className={styles.empty}>{feedback}</div> : null}
        </section>
      </aside>
    </section>
  );
}
