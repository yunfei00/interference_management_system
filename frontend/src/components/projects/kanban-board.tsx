"use client";

import { Fragment, useMemo, useState } from "react";

import type { TaskListItem, TaskStatus } from "@/lib/contracts";

import styles from "./projects.module.css";
import { EmptyState } from "./empty-state";
import { MemberAvatarGroup } from "./member-avatar-group";
import { PriorityBadge } from "./priority-badge";
import { groupTasksByStatus, TASK_STATUS_LABELS } from "./project-utils";
import { StatusBadge } from "./status-badge";

type DragState = {
  taskId: number;
  sourceStatus: TaskStatus;
} | null;

export function KanbanBoard({
  tasks,
  disabled = false,
  movingTaskId,
  onMove,
  onOpenTask,
}: {
  tasks: TaskListItem[];
  disabled?: boolean;
  movingTaskId?: number | null;
  onMove: (taskId: number, targetStatus: TaskStatus, targetIndex: number) => Promise<void>;
  onOpenTask: (taskId: number) => void;
}) {
  const grouped = useMemo(() => groupTasksByStatus(tasks), [tasks]);
  const [dragState, setDragState] = useState<DragState>(null);
  const [activeDrop, setActiveDrop] = useState<{ status: TaskStatus; index: number } | null>(null);

  if (!tasks.length) {
    return (
      <EmptyState
        description="Create the first task to start tracking work on the board."
        title="No Tasks Yet"
      />
    );
  }

  async function handleDrop(status: TaskStatus, index: number) {
    if (!dragState || disabled) {
      return;
    }
    const currentColumn = grouped[dragState.sourceStatus];
    const sourceIndex = currentColumn.findIndex((task) => task.id === dragState.taskId);
    if (dragState.sourceStatus === status && sourceIndex === index) {
      setDragState(null);
      setActiveDrop(null);
      return;
    }
    const adjustedIndex =
      dragState.sourceStatus === status && sourceIndex >= 0 && sourceIndex < index
        ? index - 1
        : index;
    setDragState(null);
    setActiveDrop(null);
    await onMove(dragState.taskId, status, adjustedIndex);
  }

  return (
    <div className={styles.kanbanGrid}>
      {(
        ["todo", "in_progress", "blocked", "done"] as TaskStatus[]
      ).map((status) => (
        <section className={styles.kanbanColumn} key={status}>
          <div className={styles.sectionHeader}>
            <div>
              <h3 className={styles.projectTitle}>{TASK_STATUS_LABELS[status]}</h3>
              <p className={styles.secondaryText}>{grouped[status].length} tasks</p>
            </div>
            <StatusBadge kind="task" value={status} />
          </div>

          <div className={styles.kanbanCards}>
            <DropZone
              active={activeDrop?.status === status && activeDrop.index === 0}
              disabled={disabled}
              onDragEnter={() => setActiveDrop({ status, index: 0 })}
              onDrop={() => void handleDrop(status, 0)}
            />

            {grouped[status].map((task, index) => (
              <Fragment key={task.id}>
                <article
                  className={`${styles.kanbanCard} ${dragState?.taskId === task.id ? styles.kanbanCardDragging : ""} ${movingTaskId === task.id ? styles.cardDisabled : ""}`}
                  draggable={!disabled && movingTaskId == null && task.can_edit}
                  onClick={() => onOpenTask(task.id)}
                  onDragEnd={() => {
                    setDragState(null);
                    setActiveDrop(null);
                  }}
                  onDragStart={() => {
                    setDragState({ taskId: task.id, sourceStatus: task.status });
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.sectionHeader}>
                    <strong>{task.title}</strong>
                    <PriorityBadge kind="task" value={task.priority} />
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.chip}>{task.progress}%</span>
                    {task.milestone_name ? (
                      <span className={styles.chip}>{task.milestone_name}</span>
                    ) : null}
                  </div>
                  <div className={styles.secondaryText}>
                    Due {task.due_date || "--"}
                  </div>
                  <div className={styles.secondaryText}>
                    Subtasks {task.subtask_done}/{task.subtask_total}
                  </div>
                  {task.assignee ? (
                    <MemberAvatarGroup members={[task.assignee]} maxVisible={1} />
                  ) : (
                    <div className={styles.secondaryText}>Unassigned</div>
                  )}
                </article>
                <DropZone
                  active={
                    activeDrop?.status === status && activeDrop.index === index + 1
                  }
                  disabled={disabled}
                  onDragEnter={() => setActiveDrop({ status, index: index + 1 })}
                  onDrop={() => void handleDrop(status, index + 1)}
                />
              </Fragment>
            ))}

            {!grouped[status].length ? (
              <div className={styles.placeholder}>Drag tasks here.</div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

function DropZone({
  active,
  disabled,
  onDragEnter,
  onDrop,
}: {
  active: boolean;
  disabled: boolean;
  onDragEnter: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      className={`${styles.dropZone} ${active ? styles.dropZoneActive : ""} ${disabled ? styles.cardDisabled : ""}`}
      onDragEnter={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        onDragEnter();
      }}
      onDragOver={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        onDrop();
      }}
    />
  );
}
