import type { ToolVersionModel } from "@/lib/tool-detail-service";

import styles from "./tool-detail.module.css";

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

function formatFileSize(size: number) {
  if (!size) {
    return "无文件";
  }

  if (size >= 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }
  return `${(size / 1024).toFixed(1)} KB`;
}

type VersionRowProps = {
  row: ToolVersionModel;
  canManage: boolean;
  busyAction: string | null;
  onSetCurrent: (row: ToolVersionModel) => void;
  onDelete: (row: ToolVersionModel) => void;
};

export function VersionRow({
  row,
  canManage,
  busyAction,
  onSetCurrent,
  onDelete,
}: VersionRowProps) {
  const isBusy =
    busyAction === `set-current-${row.id}` ||
    busyAction === `delete-version-${row.id}`;

  return (
    <article className={`${styles.row} ${row.is_current ? styles.rowCurrent : ""}`}>
      <div className={styles.primaryCell}>
        <div className={styles.versionTitle}>
          <span className={styles.versionCode}>{row.version}</span>
          {row.is_current ? (
            <span className={styles.currentRowBadge}>当前</span>
          ) : null}
        </div>
      </div>

      <div className={styles.metaCell}>
        <span className={styles.metaLabelMobile}>发布时间</span>
        <span className={styles.metaValueRow}>{formatDate(row.created_at)}</span>
      </div>

      <div className={styles.metaCell}>
        <span className={styles.metaLabelMobile}>大小</span>
        <span className={styles.metaValueRow}>{formatFileSize(row.file_size)}</span>
      </div>

      <div className={styles.metaCell}>
        <span className={styles.metaLabelMobile}>发布人</span>
        <span className={styles.metaValueRow}>{row.created_by_name || "未知"}</span>
      </div>

      <div className={styles.rowActions}>
        {row.download_url ? (
          <a className={styles.downloadLink} href={row.download_url}>
            下载
          </a>
        ) : (
          <span className={styles.downloadLinkDisabled}>无文件</span>
        )}

        {canManage && !row.is_current ? (
          <button
            className={styles.rowButton}
            disabled={isBusy}
            onClick={() => onSetCurrent(row)}
            type="button"
          >
            设为当前
          </button>
        ) : null}

        {canManage ? (
          <button
            className={styles.rowDangerButton}
            disabled={isBusy}
            onClick={() => onDelete(row)}
            type="button"
          >
            删除
          </button>
        ) : null}
      </div>
    </article>
  );
}
