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
    return "No file";
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
      return "Available";
    case "testing":
      return "Testing";
    case "deprecated":
      return "Deprecated";
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
        Back To Tools
      </Link>

      <section className={`${styles.surface} ${styles.infoCard}`}>
        <div className={styles.sectionLabel}>Tool Overview</div>
        <div className={styles.toolName}>{tool.name}</div>
        <div className={styles.toolCode}>
          {tool.code} / {tool.category}
        </div>
        <p className={styles.toolSummary}>
          {tool.summary || "No description provided yet."}
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
            <span className={styles.metaLabel}>Owner</span>
            <span className={styles.metaValue}>{tool.owner_name || "Unassigned"}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Department</span>
            <span className={styles.metaValue}>{tool.department}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Status</span>
            <span className={styles.metaValue}>{statusLabel(tool.status)}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Last Updated</span>
            <span className={styles.metaValue}>{formatDate(tool.updated_at)}</span>
          </div>
        </div>
      </section>

      <section className={`${styles.surface} ${styles.currentCard}`}>
        <div className={styles.sectionLabel}>Current Version</div>
        {currentVersion ? (
          <>
            <div className={styles.currentTop}>
              <div className={styles.currentVersion}>{currentVersion.version}</div>
              <span className={styles.currentBadge}>Current</span>
            </div>
            <div className={styles.currentMeta}>
              <span className={styles.currentMetaText}>
                Published: {formatDate(currentVersion.created_at)}
              </span>
              <span className={styles.currentMetaText}>
                Publisher: {currentVersion.created_by_name || "Unknown"}
              </span>
              <span className={styles.currentMetaText}>
                Size: {formatFileSize(currentVersion.file_size)}
              </span>
            </div>
          </>
        ) : (
          <div className={styles.currentMetaText}>No current version yet.</div>
        )}
      </section>
    </>
  );
}
