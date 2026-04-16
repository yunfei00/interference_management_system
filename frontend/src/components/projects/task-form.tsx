"use client";

import { useMemo, useState, useTransition } from "react";

import type {
  MilestoneItem,
  ProjectDetail,
  TaskDetail,
  TaskListItem,
  UserBrief,
} from "@/lib/contracts";
import {
  createTask,
  type TaskWriteInput,
  updateTask,
} from "@/lib/api/projects";
import { ApiResponseError, extractApiErrorMessage } from "@/lib/api-client";

import styles from "./projects.module.css";
import { EmptyState } from "./empty-state";
import { PriorityBadge } from "./priority-badge";
import {
  getUserLabel,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "./project-utils";
import { StatusBadge } from "./status-badge";

type EditableSubtask = {
  id?: number;
  title: string;
  is_done: boolean;
  sort_order: number;
};

function buildTeam(project: ProjectDetail): UserBrief[] {
  const map = new Map<number, UserBrief>();
  if (project.owner) {
    map.set(project.owner.id, project.owner);
  }
  project.members.forEach((member) => map.set(member.id, member));
  return [...map.values()].sort((left, right) =>
    getUserLabel(left).localeCompare(getUserLabel(right)),
  );
}

export function TaskForm({
  project,
  task,
  milestones,
  allTasks,
  defaultStatus,
  onClose,
  onSaved,
}: {
  project: ProjectDetail;
  task?: TaskDetail | null;
  milestones: MilestoneItem[];
  allTasks: TaskListItem[];
  defaultStatus?: TaskWriteInput["status"];
  onClose: () => void;
  onSaved: (task: TaskDetail, message: string) => void;
}) {
  const team = useMemo(() => buildTeam(project), [project]);
  const dependencyOptions = useMemo(
    () => allTasks.filter((candidate) => candidate.id !== task?.id),
    [allTasks, task?.id],
  );

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskWriteInput["status"]>(
    task?.status ?? defaultStatus ?? "todo",
  );
  const [priority, setPriority] = useState<TaskWriteInput["priority"]>(
    task?.priority ?? "medium",
  );
  const [assigneeId, setAssigneeId] = useState<number | "">(
    task?.assignee?.id ?? "",
  );
  const [collaboratorIds, setCollaboratorIds] = useState<number[]>(
    task?.collaborators.map((member) => member.id) ?? [],
  );
  const [milestoneId, setMilestoneId] = useState<number | "">(
    task?.milestone?.id ?? "",
  );
  const [parentTaskId, setParentTaskId] = useState<number | "">(
    task?.parent_task?.id ?? "",
  );
  const [startDate, setStartDate] = useState(task?.start_date ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours ?? "");
  const [actualHours, setActualHours] = useState(task?.actual_hours ?? "");
  const [progress, setProgress] = useState(String(task?.progress ?? 0));
  const [subtasks, setSubtasks] = useState<EditableSubtask[]>(
    task?.subtasks.map((item) => ({
      id: item.id,
      title: item.title,
      is_done: item.is_done,
      sort_order: item.sort_order,
    })) ?? [],
  );
  const [dependencyIds, setDependencyIds] = useState<number[]>(
    task?.dependencies.map((item) => item.depends_on.id) ?? [],
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleId(current: number[], value: number) {
    return current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
  }

  function updateSubtask(index: number, patch: Partial<EditableSubtask>) {
    setSubtasks((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeSubtask(index: number) {
    setSubtasks((current) =>
      current
        .filter((_, currentIndex) => currentIndex !== index)
        .map((item, currentIndex) => ({
          ...item,
          sort_order: currentIndex,
        })),
    );
  }

  async function submit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Task title is required.");
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setErrorMessage("Due date cannot be earlier than start date.");
      return;
    }

    const normalizedSubtasks = subtasks
      .map((item, index) => ({
        ...item,
        title: item.title.trim(),
        sort_order: index,
      }))
      .filter((item) => item.title);

    const payload: TaskWriteInput = {
      title: trimmedTitle,
      description: description.trim(),
      status,
      priority,
      assignee: assigneeId === "" ? null : assigneeId,
      collaborators: collaboratorIds.filter((item) => item !== assigneeId),
      milestone: milestoneId === "" ? null : milestoneId,
      start_date: startDate || null,
      due_date: dueDate || null,
      estimated_hours: estimatedHours || null,
      actual_hours: actualHours || null,
      progress: Math.max(0, Math.min(100, Number(progress) || 0)),
      parent_task: parentTaskId === "" ? null : parentTaskId,
      subtasks: normalizedSubtasks,
      dependencies: dependencyIds,
    };

    setErrorMessage("");
    try {
      const saved = task
        ? await updateTask(task.id, payload)
        : await createTask(project.id, payload);
      onSaved(
        saved,
        task ? `Updated task ${saved.title}.` : `Created task ${saved.title}.`,
      );
    } catch (error) {
      setErrorMessage(resolveTaskError(error));
    }
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={`surface ${styles.modalPanel}`} role="dialog" aria-modal="true">
        <div className={styles.sectionHeader}>
          <div>
            <div className="eyebrow">{task ? "Edit" : "Create"}</div>
            <h2 className={styles.projectTitle}>Task</h2>
          </div>
          <button className="buttonGhost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {errorMessage ? (
          <EmptyState
            description={errorMessage}
            title="Unable to save task"
            tone="error"
          />
        ) : null}

        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>Task Title</span>
            <input
              className={styles.input}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>

          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>Description</span>
            <textarea
              className={styles.textarea}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Status</span>
            <select
              className={styles.select}
              onChange={(event) => setStatus(event.target.value as TaskWriteInput["status"])}
              value={status}
            >
              {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Priority</span>
            <select
              className={styles.select}
              onChange={(event) => setPriority(event.target.value as TaskWriteInput["priority"])}
              value={priority}
            >
              {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Assignee</span>
            <select
              className={styles.select}
              onChange={(event) =>
                setAssigneeId(event.target.value ? Number(event.target.value) : "")
              }
              value={assigneeId}
            >
              <option value="">Unassigned</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {getUserLabel(member)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Milestone</span>
            <select
              className={styles.select}
              onChange={(event) =>
                setMilestoneId(event.target.value ? Number(event.target.value) : "")
              }
              value={milestoneId}
            >
              <option value="">No milestone</option>
              {milestones.map((milestoneOption) => (
                <option key={milestoneOption.id} value={milestoneOption.id}>
                  {milestoneOption.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Parent Task</span>
            <select
              className={styles.select}
              onChange={(event) =>
                setParentTaskId(event.target.value ? Number(event.target.value) : "")
              }
              value={parentTaskId}
            >
              <option value="">No parent task</option>
              {dependencyOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Start Date</span>
            <input
              className={styles.input}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Due Date</span>
            <input
              className={styles.input}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Estimated Hours</span>
            <input
              className={styles.input}
              min={0}
              onChange={(event) => setEstimatedHours(event.target.value)}
              step="0.5"
              type="number"
              value={estimatedHours}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Actual Hours</span>
            <input
              className={styles.input}
              min={0}
              onChange={(event) => setActualHours(event.target.value)}
              step="0.5"
              type="number"
              value={actualHours}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Progress</span>
            <input
              className={styles.input}
              max={100}
              min={0}
              onChange={(event) => setProgress(event.target.value)}
              type="number"
              value={progress}
            />
          </label>

          <div className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>Collaborators</span>
            <div className={styles.pickerPanel}>
              <div className={styles.pickerList}>
                {team.map((member) => (
                  <label className={styles.checkboxRow} key={member.id}>
                    <span>{getUserLabel(member)}</span>
                    <input
                      checked={collaboratorIds.includes(member.id)}
                      onChange={() =>
                        setCollaboratorIds((current) => toggleId(current, member.id))
                      }
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>Dependencies</span>
            <div className={styles.pickerPanel}>
              {dependencyOptions.length ? (
                <div className={styles.pickerList}>
                  {dependencyOptions.map((candidate) => (
                    <label className={styles.checkboxRow} key={candidate.id}>
                      <span className={styles.primaryCell}>
                        <strong>{candidate.title}</strong>
                        <span className={styles.metaRow}>
                          <StatusBadge kind="task" value={candidate.status} />
                          <PriorityBadge kind="task" value={candidate.priority} />
                        </span>
                      </span>
                      <input
                        checked={dependencyIds.includes(candidate.id)}
                        onChange={() =>
                          setDependencyIds((current) => toggleId(current, candidate.id))
                        }
                        type="checkbox"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className={styles.placeholder}>No dependency candidates yet.</div>
              )}
            </div>
          </div>

          <div className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>Subtasks</span>
            <div className={styles.detailList}>
              {subtasks.map((subtask, index) => (
                <div className={styles.listRow} key={subtask.id ?? `draft-${index}`}>
                  <input
                    checked={subtask.is_done}
                    onChange={(event) =>
                      updateSubtask(index, { is_done: event.target.checked })
                    }
                    type="checkbox"
                  />
                  <input
                    className={styles.input}
                    onChange={(event) =>
                      updateSubtask(index, { title: event.target.value })
                    }
                    placeholder={`Subtask ${index + 1}`}
                    value={subtask.title}
                  />
                  <button
                    className={styles.smallButton}
                    onClick={() => removeSubtask(index)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                className="buttonGhost"
                onClick={() =>
                  setSubtasks((current) => [
                    ...current,
                    {
                      title: "",
                      is_done: false,
                      sort_order: current.length,
                    },
                  ])
                }
                type="button"
              >
                Add Subtask
              </button>
            </div>
          </div>
        </div>

        <div className={styles.actionBar}>
          <button className="buttonGhost" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await submit();
              })
            }
            type="button"
          >
            {isPending ? "Saving..." : task ? "Save Task" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveTaskError(error: unknown) {
  if (error instanceof ApiResponseError) {
    return (
      error.message ||
      extractApiErrorMessage(error.data) ||
      "Unable to save the task."
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to save the task.";
}
