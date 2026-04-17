"use client";

import { useTranslations } from "next-intl";

import type { ProjectPriority, TaskPriority } from "@/lib/contracts";

import styles from "./projects.module.css";
import {
  getProjectPriorityLabel,
  getTaskPriorityLabel,
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
  const t = useTranslations();
  const label =
    props.kind === "project"
      ? getProjectPriorityLabel(t, props.value)
      : getTaskPriorityLabel(t, props.value);

  return (
    <span className={`${styles.priorityBadge} ${classNameFor(props.value)}`}>
      {label}
    </span>
  );
}
