"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import type {
  ApiEnvelope,
  DatasetDetail,
  DatasetItem,
  MeasurementItem,
} from "@/lib/contracts";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import { useBffResource } from "@/lib/use-bff-resource";
import { usePaginatedResource } from "@/lib/use-paginated-resource";

import { useDashboardSession } from "./dashboard-session-provider";
import { InterferenceWorkspaceBanner } from "./interference-workspace-banner";
import styles from "./management-page.module.css";

export function DatasetsPage() {
  const { state } = useDashboardSession();
  const canView =
    state.kind === "ready" &&
    hasDashboardPermission(state.data.permissions, "datahub.view");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const datasetsState = usePaginatedResource<DatasetItem>({
    endpoint: "/api/datahub/datasets",
    query: { page, refresh: refreshKey },
    enabled: canView,
    messages: defaultFetchMessages,
  });
  const detailState = useBffResource<DatasetDetail>({
    endpoint: selectedDatasetId
      ? `/api/datahub/datasets/${selectedDatasetId}`
      : "/api/datahub/datasets/0",
    enabled: canView && Boolean(selectedDatasetId),
    messages: defaultFetchMessages,
  });
  const measurementsState = usePaginatedResource<MeasurementItem>({
    endpoint: selectedDatasetId
      ? `/api/datahub/datasets/${selectedDatasetId}/measurements`
      : "/api/datahub/datasets/0/measurements",
    query: { page: 1, refresh: refreshKey },
    enabled: canView && Boolean(selectedDatasetId),
    messages: defaultFetchMessages,
  });

  async function createDataset() {
    setFeedback(null);
    const response = await fetch("/api/datahub/datasets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, description }),
    });
    const payload = (await response.json()) as ApiEnvelope<DatasetItem | null>;
    if (!response.ok || !payload.success || !payload.data) {
      setFeedback(payload.message || "创建数据集失败。");
      return;
    }
    setName("");
    setDescription("");
    setSelectedDatasetId(String(payload.data.id));
    setRefreshKey((value) => value + 1);
    setFeedback("数据集创建成功。");
  }

  async function uploadFile() {
    if (!selectedDatasetId || !selectedFile) {
      setFeedback("请先选择数据集和上传文件。");
      return;
    }
    setFeedback(null);
    const formData = new FormData();
    formData.append("file", selectedFile);
    const response = await fetch(
      `/api/datahub/datasets/${selectedDatasetId}/upload`,
      {
        method: "POST",
        body: formData,
      },
    );
    const payload = (await response.json()) as ApiEnvelope<
      { inserted: number } | null
    >;
    if (!response.ok || !payload.success || !payload.data) {
      setFeedback(payload.message || "上传数据文件失败。");
      return;
    }
    setSelectedFile(null);
    setRefreshKey((value) => value + 1);
    setFeedback(`上传成功，新增 ${payload.data.inserted} 条测量记录。`);
  }

  if (state.kind !== "ready" || !canView) {
    return (
      <section className={styles.content}>
        <div className={styles.stack}>
          <section className={`surface ${styles.panel}`}>
            <div className={styles.empty}>当前账号无法访问数据中心。</div>
          </section>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.content}>
      <div className={styles.stack}>
        <InterferenceWorkspaceBanner
          description="原来的数据集、上传、热力图和测量点功能，现在统一归属到电磁事业部的干扰工作区。"
          title="数据中心"
        />

        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>数据集管理</h2>
              <p className={styles.panelText}>
                支持创建数据集、上传 CSV/JSON/Excel 并生成测量点与热力图。
              </p>
            </div>
          </div>

          <div className={styles.filters}>
            <label className={styles.field}>
              <span className={styles.label}>数据集名称</span>
              <input
                className={styles.input}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：办公区 3F 射频巡检"
                value={name}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>描述</span>
              <input
                className={styles.input}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="记录采集批次、区域和说明"
                value={description}
              />
            </label>
            <div className={styles.field}>
              <span className={styles.label}>操作</span>
              <button
                className="button"
                onClick={() =>
                  startTransition(() => {
                    void createDataset();
                  })
                }
                type="button"
              >
                {isPending ? "提交中..." : "创建数据集"}
              </button>
            </div>
          </div>

          {feedback ? <div className={styles.empty}>{feedback}</div> : null}
        </section>

        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>数据集列表</h2>
              <p className={styles.panelText}>
                选中一条数据集后，右侧会显示文件、热力图和测量点明细。
              </p>
            </div>
          </div>

          {datasetsState.kind === "ready" && datasetsState.data.items.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>描述</th>
                    <th>文件数</th>
                    <th>测量点</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetsState.data.items.map((dataset) => (
                    <tr
                      key={dataset.id}
                      onClick={() => setSelectedDatasetId(String(dataset.id))}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div className={styles.primaryCell}>
                          <span className={styles.primaryText}>{dataset.name}</span>
                          <span className={styles.secondaryText}>
                            所属人：{dataset.owner_username}
                          </span>
                        </div>
                      </td>
                      <td>{dataset.description || "无描述"}</td>
                      <td>{dataset.file_count}</td>
                      <td>{dataset.measurement_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {datasetsState.kind === "loading" ? (
            <div className={styles.empty}>正在加载数据集...</div>
          ) : null}
          {datasetsState.kind === "error" ? (
            <div className={styles.error}>{datasetsState.message}</div>
          ) : null}

          {datasetsState.kind === "ready" ? (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                第 {datasetsState.data.pagination.page} /{" "}
                {datasetsState.data.pagination.pages || 1} 页，共{" "}
                {datasetsState.data.pagination.count} 条
              </div>
              <div className={styles.paginationActions}>
                <button
                  className={styles.buttonSmall}
                  disabled={!datasetsState.data.pagination.previous}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  type="button"
                >
                  上一页
                </button>
                <button
                  className={styles.buttonSmall}
                  disabled={!datasetsState.data.pagination.next}
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
              <h2 className={styles.panelTitle}>上传到当前数据集</h2>
              <p className={styles.panelText}>支持 CSV、JSON、Excel 三类输入。</p>
            </div>
          </div>
          <div className={styles.filters}>
            <label className={styles.field}>
              <span className={styles.label}>当前数据集 ID</span>
              <input
                className={styles.input}
                onChange={(event) => setSelectedDatasetId(event.target.value)}
                placeholder="先从左侧列表选中"
                value={selectedDatasetId}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>上传文件</span>
              <input
                className={styles.input}
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
                type="file"
              />
            </label>
            <div className={styles.field}>
              <span className={styles.label}>导入</span>
              <button
                className="button"
                onClick={() =>
                  startTransition(() => {
                    void uploadFile();
                  })
                }
                type="button"
              >
                {isPending ? "导入中..." : "上传并解析"}
              </button>
            </div>
          </div>
        </section>

        <section className={`surface ${styles.panel}`}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>数据集详情</h2>
              <p className={styles.panelText}>包括文件列表、热力图和测量点样本。</p>
            </div>
          </div>

          {detailState.kind === "ready" ? (
            <div className={styles.asideList}>
              <div className={styles.asideItem}>
                <span className={styles.asideLabel}>数据集</span>
                <span className={styles.asideValue}>{detailState.data.name}</span>
              </div>
              <div className={styles.asideItem}>
                <span className={styles.asideLabel}>文件</span>
                <span className={styles.asideValue}>
                  {detailState.data.files.map((file) => file.original_name).join("、") ||
                    "暂无文件"}
                </span>
              </div>
              <Image
                alt="热力图"
                height={480}
                src={`/api/datahub/datasets/${selectedDatasetId}/heatmap`}
                unoptimized
                style={{ width: "100%", borderRadius: "1rem", border: "1px solid var(--line)" }}
                width={800}
              />
            </div>
          ) : null}

          {detailState.kind === "loading" && selectedDatasetId ? (
            <div className={styles.empty}>正在加载详情...</div>
          ) : null}

          {measurementsState.kind === "ready" && measurementsState.data.items.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>X</th>
                    <th>Y</th>
                    <th>值</th>
                  </tr>
                </thead>
                <tbody>
                  {measurementsState.data.items.slice(0, 8).map((item) => (
                    <tr key={item.id}>
                      <td>{item.x}</td>
                      <td>{item.y}</td>
                      <td>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </aside>
    </section>
  );
}
