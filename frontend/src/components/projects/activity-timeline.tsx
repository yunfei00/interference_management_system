"use client";

import type { ProjectActivityItem } from "@/lib/contracts";

import styles from "./projects.module.css";
import { EmptyState } from "./empty-state";
import { formatDateTime, getUserLabel } from "./project-utils";

export function ActivityTimeline({
  activities,
  emptyText = "No project activity yet.",
}: {
  activities: ProjectActivityItem[];
  emptyText?: string;
}) {
  if (!activities.length) {
    return (
      <EmptyState
        description={emptyText}
        title="No Activity"
      />
    );
  }

  return (
    <div className={styles.timeline}>
      {activities.map((activity) => (
        <article className={styles.timelineItem} key={activity.id}>
          <div className={styles.metaRow}>
            <strong>{activity.message}</strong>
          </div>
          <div className={styles.secondaryText}>
            {getUserLabel(activity.operator)} | {formatDateTime(activity.created_at)}
          </div>
          {activity.task_title ? (
            <div className={styles.secondaryText}>Task: {activity.task_title}</div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
