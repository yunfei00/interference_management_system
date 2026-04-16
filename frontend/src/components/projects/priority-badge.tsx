"use client";

import type { ProjectPriority, TaskPriority } from "@/lib/contracts";

import styles from "./projects.module.css";
import {
  PROJECT_PRIORITY_LABELS,
  TASK_PRIORITY_LABELS,
} from "./project-utils";

type PriorityBadgeProps =
  | { kind: "project"; value: ProjectPriority }
  | { kind: "task"; value: TaskPriority };

function classNameFor(value: string) {
  const classMap: Record<string, string> = {
    low: styles.priorityLow,
    medium: styles.priorityMedium,
    high: styles.priorityHigh,
    critical: styles.priorityCritical,
    urgent: styles.priorityUrgent,
  };
  return classMap[value] || styles.priorityLow;
}

export function PriorityBadge(props: PriorityBadgeProps) {
  const label =
    props.kind === "project"
      ? PROJECT_PRIORITY_LABELS[props.value]
      : TASK_PRIORITY_LABELS[props.value];

  return (
    <span className={`${styles.priorityBadge} ${classNameFor(props.value)}`}>
      {label}
    </span>
  );
}
