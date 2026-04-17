"use client";

import { useLocale, useTranslations } from "next-intl";

import type { ProjectActivityItem, TaskStatus } from "@/lib/contracts";
import type { AppLocale } from "@/i18n/config";

import styles from "./projects.module.css";
import { EmptyState } from "./empty-state";
import { formatDateTime, getTaskStatusLabel, getUserLabel } from "./project-utils";

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  return readString(metadata[key]);
}

function readNestedString(
  metadata: Record<string, unknown>,
  containerKey: string,
  valueKey: string,
) {
  const container = metadata[containerKey];
  if (!container || typeof container !== "object" || Array.isArray(container)) {
    return undefined;
  }
  return readString((container as Record<string, unknown>)[valueKey]);
}

function extractBracketValues(message: string) {
  return [...message.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]?.trim()).filter(Boolean) as string[];
}

function normalizeTaskStatusCode(value: string | undefined): TaskStatus | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "todo" || normalized === "in_progress" || normalized === "blocked" || normalized === "done") {
    return normalized as TaskStatus;
  }
  return undefined;
}

function formatActivityMessage(
  activity: ProjectActivityItem,
  t: ReturnType<typeof useTranslations>,
) {
  const operator = getUserLabel(activity.operator, t("activity.operatorFallback"));
  const brackets = extractBracketValues(activity.message);
  const taskTitle =
    activity.task_title ||
    readNestedString(activity.metadata, "after", "title") ||
    readNestedString(activity.metadata, "before", "title") ||
    brackets[0];
  const projectName =
    readNestedString(activity.metadata, "after", "name") ||
    readNestedString(activity.metadata, "before", "name") ||
    (activity.action_type === "member_removed" ? brackets[1] : undefined) ||
    (activity.action_type === "member_added" || activity.action_type.startsWith("project_")
      ? brackets[0]
      : undefined) ||
    (activity.action_type === "attachment_uploaded" || activity.action_type === "attachment_deleted"
      ? brackets[1]
      : undefined);
  const milestoneName = readMetadataString(activity.metadata, "milestone_name") || brackets[0];
  const fileName = readMetadataString(activity.metadata, "file_name") || brackets[0];
  const targetTaskName = activity.task_title || readMetadataString(activity.metadata, "task_title");
  const targetProjectName = projectName || brackets[1];
  const targetLabel = targetTaskName
    ? t("activity.targets.task", { name: targetTaskName })
    : targetProjectName
      ? t("activity.targets.project", { name: targetProjectName })
      : t("common.states.none");
  const fromStatus = getTaskStatusLabel(
    t,
    normalizeTaskStatusCode(readMetadataString(activity.metadata, "from")) || "todo",
  );
  const toStatus = getTaskStatusLabel(
    t,
    normalizeTaskStatusCode(
      readMetadataString(activity.metadata, "to") || readMetadataString(activity.metadata, "to_status"),
    ) || "todo",
  );

  switch (activity.action_type) {
    case "project_created":
    case "project_updated":
    case "project_deleted":
      if (projectName) {
        return t(`activity.actions.${activity.action_type}`, {
          operator,
          project: projectName,
        });
      }
      break;
    case "member_added":
    case "member_removed":
      if (projectName) {
        return t(`activity.actions.${activity.action_type}`, {
          operator,
          project: projectName,
        });
      }
      break;
    case "task_created":
    case "task_updated":
    case "task_deleted":
      if (taskTitle) {
        return t(`activity.actions.${activity.action_type}`, {
          operator,
          task: taskTitle,
        });
      }
      break;
    case "task_status_changed":
      if (taskTitle) {
        return t("activity.actions.task_status_changed", {
          operator,
          task: taskTitle,
          from: fromStatus,
          to: toStatus,
        });
      }
      break;
    case "task_moved":
      if (taskTitle) {
        return t("activity.actions.task_moved", {
          operator,
          task: taskTitle,
          to: toStatus,
        });
      }
      break;
    case "milestone_created":
    case "milestone_updated":
    case "milestone_deleted":
      if (milestoneName) {
        return t(`activity.actions.${activity.action_type}`, {
          operator,
          milestone: milestoneName,
        });
      }
      break;
    case "attachment_uploaded":
    case "attachment_deleted":
      if (fileName) {
        return t(`activity.actions.${activity.action_type}`, {
          operator,
          file: fileName,
          target: targetLabel,
        });
      }
      break;
    default:
      break;
  }

  return activity.message;
}

export function ActivityTimeline({
  activities,
  emptyText,
}: {
  activities: ProjectActivityItem[];
  emptyText?: string;
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;

  if (!activities.length) {
    return (
      <EmptyState
        description={emptyText || t("activity.emptyDescription")}
        title={t("activity.emptyTitle")}
      />
    );
  }

  return (
    <div className={styles.timeline}>
      {activities.map((activity) => (
        <article className={styles.timelineItem} key={activity.id}>
          <div className={styles.metaRow}>
            <strong>{formatActivityMessage(activity, t)}</strong>
          </div>
          <div className={styles.secondaryText}>
            {getUserLabel(activity.operator, t("activity.operatorFallback"))} |{" "}
            {formatDateTime(activity.created_at, locale, t("common.states.none"))}
          </div>
          {activity.task_title ? (
            <div className={styles.secondaryText}>
              {t("activity.taskLabel", { task: activity.task_title })}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
