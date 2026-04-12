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
          <div className={styles.actionTitle}>Version Management</div>
          <div className={styles.actionMeta}>
            {refreshing
              ? "Refreshing latest data..."
              : `${versionsCount} version records`}
          </div>
        </div>

        {canManage ? (
          <div className={styles.actionButtons}>
            <button className={styles.button} disabled={busy} onClick={onOpenUpload} type="button">
              {activePanel === "upload" ? "Close Upload" : "Upload New Version"}
            </button>
            <button
              className={styles.buttonSecondary}
              disabled={busy}
              onClick={onOpenEdit}
              type="button"
            >
              {activePanel === "edit" ? "Close Editor" : "Edit Tool"}
            </button>
            <button
              className={styles.buttonDanger}
              disabled={busy}
              onClick={onDeleteTool}
              type="button"
            >
              Delete Tool
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
