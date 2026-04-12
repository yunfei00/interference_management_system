"use client";

import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import type { UploadState } from "@/lib/tool-upload";
import { TOOLS_MANAGE_ACCESS, TOOLS_VIEW_ACCESS } from "@/lib/tool-permissions";
import { uploadProgressStatusLabel } from "@/lib/upload-ui-labels";
import { useToolDetailController } from "@/lib/use-tool-detail-controller";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import { ToolActions } from "./ToolActions";
import { ToolInfoCard } from "./ToolInfoCard";
import { VersionList } from "./VersionList";
import styles from "./tool-detail.module.css";

type ToolDetailPageProps = {
  toolId: string;
};

function UploadPanel(props: {
  busy: boolean;
  uploadState: UploadState;
  versionForm: {
    version: string;
    release_notes: string;
    changelog: string;
    file: File | null;
  };
  onVersionChange: (value: string) => void;
  onReleaseNotesChange: (value: string) => void;
  onChangelogChange: (value: string) => void;
  onFileChange: (value: File | null) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const {
    busy,
    uploadState,
    versionForm,
    onVersionChange,
    onReleaseNotesChange,
    onChangelogChange,
    onFileChange,
    onCancel,
    onSubmit,
  } = props;
  const shouldShowProgress =
    uploadState.status !== "waiting" || Boolean(uploadState.error);

  return (
    <section className={`${styles.surface} ${styles.panel}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>上传新版本</div>
        <div className={styles.panelDescription}>
          先填写版本元数据，再按引导完成安装包上传与绑定。
        </div>
      </div>

      <div className={`${styles.formGrid} ${styles.formGridTwo}`}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>版本号</span>
          <input
            className={styles.input}
            disabled={busy}
            onChange={(event) => onVersionChange(event.target.value)}
            placeholder="v34"
            type="text"
            value={versionForm.version}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>安装包文件</span>
          <input
            className={styles.fileInput}
            disabled={busy}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          <span className={styles.mutedText}>
            {versionForm.file ? versionForm.file.name : "未选择文件。"}
          </span>
        </label>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>发布说明</span>
          <textarea
            className={styles.textarea}
            disabled={busy}
            onChange={(event) => onReleaseNotesChange(event.target.value)}
            placeholder="简要说明本版本目标与适用场景。"
            value={versionForm.release_notes}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>变更记录</span>
          <textarea
            className={styles.textarea}
            disabled={busy}
            onChange={(event) => onChangelogChange(event.target.value)}
            placeholder="列出本版本的重要变更。"
            value={versionForm.changelog}
          />
        </label>
      </div>

      {shouldShowProgress ? (
        <div className={styles.progressCard}>
          <div className={styles.progressMeta}>
            <span>{uploadProgressStatusLabel(uploadState.status)}</span>
            <span>
              分片 {uploadState.uploadedChunks}/{uploadState.totalChunks || 0}
            </span>
            <span>{Math.round(uploadState.progress)}%</span>
            {uploadState.error ? <span>{uploadState.error}</span> : null}
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${Math.max(0, Math.min(uploadState.progress, 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className={styles.panelActions}>
        <button className={styles.buttonGhost} disabled={busy} onClick={onCancel} type="button">
          取消
        </button>
        <button className={styles.button} disabled={busy} onClick={onSubmit} type="button">
          {busy ? "上传中…" : "上传版本"}
        </button>
      </div>
    </section>
  );
}

function EditPanel(props: {
  busy: boolean;
  form: {
    name: string;
    code: string;
    category: string;
    department: string;
    summary: string;
    detail: string;
    status: string;
    icon: string;
    tags: string;
  };
  onChange: <K extends
    | "name"
    | "code"
    | "category"
    | "department"
    | "summary"
    | "detail"
    | "status"
    | "icon"
    | "tags">(
    key: K,
    value: string,
  ) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const { busy, form, onChange, onCancel, onSubmit } = props;

  return (
    <section className={`${styles.surface} ${styles.panel}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>编辑工具</div>
        <div className={styles.panelDescription}>
          在此集中维护工具元数据，避免分散操作。
        </div>
      </div>

      <div className={`${styles.formGrid} ${styles.formGridTwo}`}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>名称</span>
          <input
            className={styles.input}
            disabled={busy}
            onChange={(event) => onChange("name", event.target.value)}
            value={form.name}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>编码</span>
          <input
            className={styles.input}
            disabled={busy}
            onChange={(event) => onChange("code", event.target.value)}
            value={form.code}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>分类</span>
          <input
            className={styles.input}
            disabled={busy}
            onChange={(event) => onChange("category", event.target.value)}
            value={form.category}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>所属部门</span>
          <input
            className={styles.input}
            disabled={busy}
            onChange={(event) => onChange("department", event.target.value)}
            value={form.department}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>状态</span>
          <select
            className={styles.select}
            disabled={busy}
            onChange={(event) => onChange("status", event.target.value)}
            value={form.status}
          >
            <option value="active">可用</option>
            <option value="testing">测试中</option>
            <option value="deprecated">已归档</option>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>图标 URL</span>
          <input
            className={styles.input}
            disabled={busy}
            onChange={(event) => onChange("icon", event.target.value)}
            value={form.icon}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>标签</span>
          <input
            className={styles.input}
            disabled={busy}
            onChange={(event) => onChange("tags", event.target.value)}
            placeholder="python, emc, offline"
            value={form.tags}
          />
        </label>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>摘要</span>
          <textarea
            className={styles.textarea}
            disabled={busy}
            onChange={(event) => onChange("summary", event.target.value)}
            value={form.summary}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>详细说明</span>
          <textarea
            className={styles.textarea}
            disabled={busy}
            onChange={(event) => onChange("detail", event.target.value)}
            value={form.detail}
          />
        </label>
      </div>

      <div className={styles.panelActions}>
        <button className={styles.buttonGhost} disabled={busy} onClick={onCancel} type="button">
          取消
        </button>
        <button className={styles.button} disabled={busy} onClick={onSubmit} type="button">
          {busy ? "保存中…" : "保存更改"}
        </button>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className={styles.skeletonLayout}>
      <div className={styles.skeletonBlock}>
        <section className={`${styles.surface} ${styles.infoCard}`}>
          <div className={styles.skeletonLine} style={{ width: "40%" }} />
          <div className={styles.skeletonLine} style={{ width: "75%", height: "1.35rem" }} />
          <div className={styles.skeletonLine} style={{ width: "55%" }} />
          <div className={styles.skeletonLine} style={{ width: "100%", height: "4.5rem" }} />
          <div className={styles.skeletonLine} style={{ width: "85%" }} />
          <div className={styles.skeletonLine} style={{ width: "78%" }} />
          <div className={styles.skeletonLine} style={{ width: "72%" }} />
        </section>

        <section className={`${styles.surface} ${styles.currentCard}`}>
          <div className={styles.skeletonLine} style={{ width: "38%" }} />
          <div className={styles.skeletonLine} style={{ width: "68%", height: "1.1rem" }} />
          <div className={styles.skeletonLine} style={{ width: "92%" }} />
          <div className={styles.skeletonLine} style={{ width: "74%" }} />
        </section>
      </div>

      <div className={styles.skeletonBlock}>
        <section className={`${styles.surface} ${styles.actionBar}`}>
          <div className={styles.skeletonLine} style={{ width: "24%", height: "1.1rem" }} />
          <div className={styles.skeletonLine} style={{ width: "18%", height: "2.75rem" }} />
        </section>

        <section className={`${styles.surface} ${styles.listSurface}`}>
          <div className={styles.listHeader}>
            <div className={styles.skeletonLine} style={{ width: "18%" }} />
            <div className={styles.skeletonLine} style={{ width: "52%" }} />
          </div>
          <div className={styles.listBody}>
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </div>
        </section>
      </div>
    </div>
  );
}

function ErrorState(props: { message: string; busy: boolean; onRetry: () => void }) {
  const { message, busy, onRetry } = props;

  return (
    <section className={`${styles.surface} ${styles.panel}`}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>无法加载工具详情</div>
        <div className={styles.panelDescription}>{message}</div>
      </div>
      <div className={styles.panelActions}>
        <button className={styles.buttonSecondary} disabled={busy} onClick={onRetry} type="button">
          重试
        </button>
      </div>
    </section>
  );
}

export function ToolDetailPage({ toolId }: ToolDetailPageProps) {
  const { state: session } = useDashboardSession();
  const ready = session.kind === "ready";
  const permissions = ready ? session.data.permissions : [];
  const canView = ready && hasDashboardPermission(permissions, [...TOOLS_VIEW_ACCESS]);
  const canManage =
    ready && hasDashboardPermission(permissions, [...TOOLS_MANAGE_ACCESS]);

  const {
    status,
    errorMessage,
    data,
    refreshing,
    busyAction,
    feedback,
    activePanel,
    uploadState,
    editForm,
    versionForm,
    openPanel,
    closePanel,
    refresh,
    updateEditField,
    updateVersionField,
    submitEdit,
    submitVersion,
    handleDeleteTool,
    handleDeleteVersion,
    handleSetCurrent,
  } = useToolDetailController({
    toolId,
    enabled: canView && Boolean(toolId),
  });

  const busy = Boolean(busyAction);

  return (
    <DepartmentAccessGuard
      description="在此查看工具元数据、版本历史，并在有权限时进行发布与维护操作。"
      requiredPermissions={[...TOOLS_VIEW_ACCESS]}
      title="工具详情"
    >
      <div className={styles.page}>
        <div className={styles.shell}>
          {status === "loading" ? <LoadingSkeleton /> : null}

          {status === "error" ? (
            <ErrorState
              busy={refreshing}
              message={errorMessage || "未知错误"}
              onRetry={refresh}
            />
          ) : null}

          {status === "ready" && data ? (
            <div className={styles.layout}>
              <aside className={styles.sidebar}>
                <ToolInfoCard
                  currentVersion={data.current_version}
                  tool={data.tool}
                />
              </aside>

              <main className={styles.main}>
                <ToolActions
                  activePanel={activePanel}
                  busy={busy}
                  canManage={canManage}
                  feedback={feedback}
                  onDeleteTool={handleDeleteTool}
                  onOpenEdit={() => openPanel("edit")}
                  onOpenUpload={() => openPanel("upload")}
                  refreshing={refreshing}
                  versionsCount={data.versions.length}
                />

                {canManage && activePanel === "upload" ? (
                  <UploadPanel
                    busy={busy}
                    onCancel={closePanel}
                    onChangelogChange={(value) => updateVersionField("changelog", value)}
                    onFileChange={(value) => updateVersionField("file", value)}
                    onReleaseNotesChange={(value) =>
                      updateVersionField("release_notes", value)
                    }
                    onSubmit={submitVersion}
                    onVersionChange={(value) => updateVersionField("version", value)}
                    uploadState={uploadState}
                    versionForm={versionForm}
                  />
                ) : null}

                {canManage && activePanel === "edit" && editForm ? (
                  <EditPanel
                    busy={busy}
                    form={editForm}
                    onCancel={closePanel}
                    onChange={updateEditField}
                    onSubmit={submitEdit}
                  />
                ) : null}

                <VersionList
                  busyAction={busyAction}
                  canManage={canManage}
                  onDelete={handleDeleteVersion}
                  onSetCurrent={handleSetCurrent}
                  versions={data.versions}
                />
              </main>
            </div>
          ) : null}
        </div>
      </div>
    </DepartmentAccessGuard>
  );
}
