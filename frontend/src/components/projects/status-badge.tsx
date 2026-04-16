"use client";

import type { MilestoneStatus, ProjectStatus, TaskStatus } from "@/lib/contracts";

import styles from "./projects.module.css";
import {
  MILESTONE_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "./project-utils";

type StatusBadgeProps =
  | { kind: "project"; value: ProjectStatus }
  | { kind: "task"; value: TaskStatus }
  | { kind: "milestone"; value: MilestoneStatus };

function classNameFor(value: string) {
  const classMap: Record<string, string> = {
    not_started: styles.statusNotStarted,
    in_progress: styles.statusInProgress,
    on_hold: styles.statusOnHold,
    completed: styles.statusCompleted,
    cancelled: styles.statusCancelled,
    todo: styles.statusTodo,
    blocked: styles.statusBlocked,
    done: styles.statusDone,
    pending: styles.statusPending,
    delayed: styles.statusDelayed,
  };
  return classMap[value] || styles.statusTodo;
}

function labelFor(kind: StatusBadgeProps["kind"], value: string) {
  if (kind === "project") {
    return PROJECT_STATUS_LABELS[value as ProjectStatus];
  }
  if (kind === "milestone") {
    return MILESTONE_STATUS_LABELS[value as MilestoneStatus];
  }
  return TASK_STATUS_LABELS[value as TaskStatus];
}

export function StatusBadge(props: StatusBadgeProps) {
  return (
    <span className={`${styles.statusBadge} ${classNameFor(props.value)}`}>
      {labelFor(props.kind, props.value)}
    </span>
  );
}
