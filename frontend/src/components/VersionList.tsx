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
        <div className={styles.listTitle}>版本列表</div>
        <div className={styles.listDescription}>
          当前版本会高亮显示；操作按钮统一在右侧，便于快速浏览与操作。
        </div>
      </div>

      <div className={styles.columnHeader}>
        <span>版本</span>
        <span>发布时间</span>
        <span>大小</span>
        <span>发布人</span>
        <span>操作</span>
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
            尚无版本。请上传首个安装包以开始版本管理。
          </div>
        )}
      </div>
    </section>
  );
}
