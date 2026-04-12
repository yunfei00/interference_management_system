import styles from "./tool-detail.module.css";

type ToolActionsProps = {
  canManage: boolean;
  versionsCount: number;
  refreshing: boolean;
  busy: boolean;
  activePanel: "upload" | "edit" | null;
  feedback:
    | {
        tone: "success" | "error";
        message: string;
      }
    | null;
  onOpenUpload: () => void;
  onOpenEdit: () => void;
  onDeleteTool: () => void;
};

export function ToolActions({
  canManage,
  versionsCount,
  refreshing,
  busy,
  activePanel,
  feedback,
  onOpenUpload,
  onOpenEdit,
  onDeleteTool,
}: ToolActionsProps) {
  return (
    <>
      <section className={`${styles.surface} ${styles.actionBar}`}>
        <div className={styles.actionHeader}>
          <div className={styles.actionTitle}>版本管理</div>
          <div className={styles.actionMeta}>
            {refreshing
              ? "正在刷新数据…"
              : `共 ${versionsCount} 条版本记录`}
          </div>
        </div>

        {canManage ? (
          <div className={styles.actionButtons}>
            <button className={styles.button} disabled={busy} onClick={onOpenUpload} type="button">
              {activePanel === "upload" ? "关闭上传" : "上传新版本"}
            </button>
            <button
              className={styles.buttonSecondary}
              disabled={busy}
              onClick={onOpenEdit}
              type="button"
            >
              {activePanel === "edit" ? "关闭编辑" : "编辑工具"}
            </button>
            <button
              className={styles.buttonDanger}
              disabled={busy}
              onClick={onDeleteTool}
              type="button"
            >
              删除工具
            </button>
          </div>
        ) : null}
      </section>

      {feedback ? (
        <div
          className={`${styles.feedback} ${
            feedback.tone === "success" ? styles.feedbackSuccess : styles.feedbackError
          }`}
          role="status"
        >
          {feedback.message}
        </div>
      ) : null}
    </>
  );
}
