import type { Route } from "next";
import Link from "next/link";

import type {
  ToolSummaryModel,
  ToolVersionModel,
} from "@/lib/tool-detail-service";

import styles from "./tool-detail.module.css";

const listHref = "/dashboard/electromagnetic/interference/tools" as Route;

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

function statusLabel(status: string) {
  switch (status) {
    case "active":
      return "可用";
    case "testing":
      return "测试中";
    case "deprecated":
      return "已停用";
    default:
      return status;
  }
}

type ToolInfoCardProps = {
  tool: ToolSummaryModel;
  currentVersion: ToolVersionModel | null;
};

export function ToolInfoCard({ tool, currentVersion }: ToolInfoCardProps) {
  return (
    <>
      <Link className={styles.backButton} href={listHref}>
        返回工具列表
      </Link>

      <section className={`${styles.surface} ${styles.infoCard}`}>
        <div className={styles.sectionLabel}>工具信息</div>
        <div className={styles.toolName}>{tool.name}</div>
        <div className={styles.toolCode}>
          {tool.code} / {tool.category}
        </div>
        <p className={styles.toolSummary}>
          {tool.summary || "暂无工具描述。"}
        </p>

        {tool.tags.length ? (
          <div className={styles.tagList}>
            {tool.tags.map((tag) => (
              <span className={styles.tag} key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className={styles.metaList}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>负责人</span>
            <span className={styles.metaValue}>{tool.owner_name || "未分配"}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>部门</span>
            <span className={styles.metaValue}>{tool.department}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>状态</span>
            <span className={styles.metaValue}>{statusLabel(tool.status)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>最近更新</span>
            <span className={styles.metaValue}>{formatDate(tool.updated_at)}</span>
          </div>
        </div>
      </section>

      <section className={`${styles.surface} ${styles.currentCard}`}>
        <div className={styles.sectionLabel}>当前版本</div>
        {currentVersion ? (
          <>
            <div className={styles.currentTop}>
              <div className={styles.currentVersion}>{currentVersion.version}</div>
              <span className={styles.currentBadge}>当前</span>
            </div>
            <div className={styles.currentMeta}>
              <span className={styles.currentMetaText}>
                发布时间：{formatDate(currentVersion.created_at)}
              </span>
              <span className={styles.currentMetaText}>
                发布人：{currentVersion.created_by_name || "未知"}
              </span>
              <span className={styles.currentMetaText}>
                文件大小：{formatFileSize(currentVersion.file_size)}
              </span>
            </div>
          </>
        ) : (
          <div className={styles.currentMetaText}>当前还没有可用版本。</div>
        )}
      </section>
    </>
  );
}
