import type {
  AttachmentItem,
  MilestoneStatus,
  ProjectPriority,
  ProjectStatus,
  TaskDetail,
  TaskListItem,
  TaskPriority,
  TaskStatus,
  UserBrief,
} from "@/lib/contracts";
import type { AppLocale } from "@/i18n/config";
import { toIntlLocale } from "@/i18n/config";

export type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export const PROJECT_STATUS_VALUES: ProjectStatus[] = [
  "not_started",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

export const TASK_STATUS_VALUES: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export const MILESTONE_STATUS_VALUES: MilestoneStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "delayed",
];

export const PROJECT_PRIORITY_VALUES: ProjectPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export const TASK_PRIORITY_VALUES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

export function getProjectStatusLabel(t: TranslateFn, value: ProjectStatus): string {
  return t(`projects.status.${value}`);
}

export function getTaskStatusLabel(t: TranslateFn, value: TaskStatus): string {
  return t(`tasks.status.${value}`);
}

export function getMilestoneStatusLabel(t: TranslateFn, value: MilestoneStatus): string {
  return t(`milestones.status.${value}`);
}

export function getProjectPriorityLabel(t: TranslateFn, value: ProjectPriority): string {
  return t(`projects.priority.${value}`);
}

export function getTaskPriorityLabel(t: TranslateFn, value: TaskPriority): string {
  return t(`tasks.priority.${value}`);
}

export function getUserLabel(
  user: UserBrief | null | undefined,
  fallback = "--",
): string {
  if (!user) {
    return fallback;
  }
  return user.display_name || user.username;
}

export function getInitials(user: UserBrief | null | undefined): string {
  const label = getUserLabel(user, "").trim();
  if (!label) {
    return "--";
  }
  const clean = label.replace(/\s+/g, " ").trim();
  const parts = clean.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function formatDate(
  value: string | null | undefined,
  locale: AppLocale,
  fallback = "--",
): string {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function formatDateTime(
  value: string | null | undefined,
  locale: AppLocale,
  fallback = "--",
): string {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatFileSize(value: number | null | undefined): string {
  if (!value || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinTags(tags: string[] | null | undefined): string {
  return (tags || []).join(", ");
}

function taskStatusRank(status: TaskStatus): number {
  return TASK_STATUS_ORDER.indexOf(status);
}

export function sortTasksForBoard(tasks: TaskListItem[]): TaskListItem[] {
  return [...tasks].sort((left, right) => {
    const statusDelta = taskStatusRank(left.status) - taskStatusRank(right.status);
    if (statusDelta !== 0) {
      return statusDelta;
    }
    if (left.order_index !== right.order_index) {
      return left.order_index - right.order_index;
    }
    return left.id - right.id;
  });
}

export function groupTasksByStatus(tasks: TaskListItem[]): Record<TaskStatus, TaskListItem[]> {
  const grouped: Record<TaskStatus, TaskListItem[]> = {
    todo: [],
    in_progress: [],
    blocked: [],
    done: [],
  };
  for (const task of sortTasksForBoard(tasks)) {
    grouped[task.status].push(task);
  }
  return grouped;
}

export function optimisticMoveTasks(
  tasks: TaskListItem[],
  taskId: number,
  targetStatus: TaskStatus,
  targetIndex: number,
): TaskListItem[] {
  const columns = groupTasksByStatus(tasks);
  let draggedTask: TaskListItem | null = null;

  for (const status of TASK_STATUS_ORDER) {
    const nextColumn: TaskListItem[] = [];
    for (const task of columns[status]) {
      if (task.id === taskId) {
        draggedTask = {
          ...task,
          status: targetStatus,
          progress: targetStatus === "done" ? 100 : task.progress,
        };
        continue;
      }
      nextColumn.push(task);
    }
    columns[status] = nextColumn;
  }

  if (!draggedTask) {
    return tasks;
  }

  const destination = [...columns[targetStatus]];
  const safeIndex = Math.max(0, Math.min(targetIndex, destination.length));
  destination.splice(safeIndex, 0, draggedTask);
  columns[targetStatus] = destination;

  const flattened: TaskListItem[] = [];
  for (const status of TASK_STATUS_ORDER) {
    columns[status].forEach((task, index) => {
      flattened.push({
        ...task,
        status,
        order_index: index,
      });
    });
  }
  return flattened;
}

export function applyServerTaskOrder(
  tasks: TaskListItem[],
  updatedTask: TaskDetail | TaskListItem,
  columnOrders: Record<string, number[]>,
): TaskListItem[] {
  const taskMap = new Map<number, TaskListItem>();
  for (const task of tasks) {
    taskMap.set(task.id, task);
  }
  taskMap.set(updatedTask.id, {
    ...taskMap.get(updatedTask.id),
    ...updatedTask,
  } as TaskListItem);

  const ordered: TaskListItem[] = [];
  const usedIds = new Set<number>();

  for (const status of TASK_STATUS_ORDER) {
    const ids = columnOrders[status] || [];
    ids.forEach((taskId, index) => {
      const task = taskMap.get(taskId);
      if (!task) {
        return;
      }
      usedIds.add(taskId);
      ordered.push({
        ...task,
        status,
        order_index: index,
      });
    });
  }

  for (const task of taskMap.values()) {
    if (usedIds.has(task.id)) {
      continue;
    }
    ordered.push(task);
  }

  return sortTasksForBoard(ordered);
}

export function attachmentDownloadHref(attachment: AttachmentItem): string {
  return `/api/attachments/${attachment.id}/download`;
}
