"use client";

import { useTranslations } from "next-intl";

import type { MilestoneStatus, ProjectStatus, TaskStatus } from "@/lib/contracts";

import styles from "./projects.module.css";
import {
  getMilestoneStatusLabel,
  getProjectStatusLabel,
  getTaskStatusLabel,
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

export function StatusBadge(props: StatusBadgeProps) {
  const t = useTranslations();
  const label =
    props.kind === "project"
      ? getProjectStatusLabel(t, props.value)
      : props.kind === "milestone"
        ? getMilestoneStatusLabel(t, props.value)
        : getTaskStatusLabel(t, props.value);

  return (
    <span className={`${styles.statusBadge} ${classNameFor(props.value)}`}>
      {label}
    </span>
  );
}
