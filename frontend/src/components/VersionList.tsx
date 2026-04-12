import type { ToolVersionModel } from "@/lib/tool-detail-service";

import styles from "./tool-detail.module.css";
import { VersionRow } from "./VersionRow";

type VersionListProps = {
  versions: ToolVersionModel[];
  canManage: boolean;
  busyAction: string | null;
  onSetCurrent: (row: ToolVersionModel) => void;
  onDelete: (row: ToolVersionModel) => void;
};

export function VersionList({
  versions,
  canManage,
  busyAction,
  onSetCurrent,
  onDelete,
}: VersionListProps) {
  return (
    <section className={`${styles.surface} ${styles.listSurface}`}>
      <div className={styles.listHeader}>
        <div className={styles.listTitle}>Version List</div>
        <div className={styles.listDescription}>
          The current version stays highlighted, and all row actions are aligned on
          the right side for fast scanning.
        </div>
      </div>

      <div className={styles.columnHeader}>
        <span>Version</span>
        <span>Published</span>
        <span>Size</span>
        <span>Publisher</span>
        <span>Actions</span>
      </div>

      <div className={styles.listBody}>
        {versions.length ? (
          versions.map((row) => (
            <VersionRow
              busyAction={busyAction}
              canManage={canManage}
              key={row.id}
              onDelete={onDelete}
              onSetCurrent={onSetCurrent}
              row={row}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            No versions yet. Upload the first package to start version management.
          </div>
        )}
      </div>
    </section>
  );
}
