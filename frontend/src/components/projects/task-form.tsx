"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

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
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getUserLabel,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
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
  const t = useTranslations();
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
      setErrorMessage(t("validation.taskTitleRequired"));
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setErrorMessage(t("validation.dueDateBeforeStart"));
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
        task
          ? t("tasks.form.updateSuccess", { name: saved.title })
          : t("tasks.form.createSuccess", { name: saved.title }),
      );
    } catch (error) {
      setErrorMessage(resolveTaskError(error, t("tasks.form.saveFailed")));
    }
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={`surface ${styles.modalPanel}`} role="dialog" aria-modal="true">
        <div className={styles.sectionHeader}>
          <div>
            <div className="eyebrow">
              {task ? t("tasks.form.editEyebrow") : t("tasks.form.createEyebrow")}
            </div>
            <h2 className={styles.projectTitle}>{t("tasks.form.title")}</h2>
          </div>
          <button className="buttonGhost" onClick={onClose} type="button">
            {t("common.actions.close")}
          </button>
        </div>

        {errorMessage ? (
          <EmptyState
            description={errorMessage}
            title={t("tasks.form.saveFailed")}
            tone="error"
          />
        ) : null}

        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>{t("tasks.form.taskTitle")}</span>
            <input
              className={styles.input}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>

          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>{t("tasks.form.description")}</span>
            <textarea
              className={styles.textarea}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.form.status")}</span>
            <select
              className={styles.select}
              onChange={(event) => setStatus(event.target.value as TaskWriteInput["status"])}
              value={status}
            >
              {TASK_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {getTaskStatusLabel(t, value)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.form.priority")}</span>
            <select
              className={styles.select}
              onChange={(event) => setPriority(event.target.value as TaskWriteInput["priority"])}
              value={priority}
            >
              {TASK_PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {getTaskPriorityLabel(t, value)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.form.assignee")}</span>
            <select
              className={styles.select}
              onChange={(event) =>
                setAssigneeId(event.target.value ? Number(event.target.value) : "")
              }
              value={assigneeId}
            >
              <option value="">{t("tasks.form.unassigned")}</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {getUserLabel(member)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.form.milestone")}</span>
            <select
              className={styles.select}
              onChange={(event) =>
                setMilestoneId(event.target.value ? Number(event.target.value) : "")
              }
              value={milestoneId}
            >
              <option value="">{t("tasks.form.noMilestone")}</option>
              {milestones.map((milestoneOption) => (
                <option key={milestoneOption.id} value={milestoneOption.id}>
                  {milestoneOption.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.form.parentTask")}</span>
            <select
              className={styles.select}
              onChange={(event) =>
                setParentTaskId(event.target.value ? Number(event.target.value) : "")
              }
              value={parentTaskId}
            >
              <option value="">{t("tasks.form.noParent")}</option>
              {dependencyOptions.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.form.startDate")}</span>
            <input
              className={styles.input}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.form.dueDate")}</span>
            <input
              className={styles.input}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.form.estimatedHours")}</span>
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
            <span className={styles.fieldLabel}>{t("tasks.form.actualHours")}</span>
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
            <span className={styles.fieldLabel}>{t("tasks.form.progress")}</span>
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
            <span className={styles.fieldLabel}>{t("tasks.form.collaborators")}</span>
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
            <span className={styles.fieldLabel}>{t("tasks.form.dependencies")}</span>
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
                <div className={styles.placeholder}>{t("tasks.form.noDependencyCandidates")}</div>
              )}
            </div>
          </div>

          <div className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>{t("tasks.form.subtasks")}</span>
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
                    placeholder={t("tasks.form.subtaskPlaceholder", { index: index + 1 })}
                    value={subtask.title}
                  />
                  <button
                    className={styles.smallButton}
                    onClick={() => removeSubtask(index)}
                    type="button"
                  >
                    {t("tasks.form.removeSubtask")}
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
                {t("tasks.form.addSubtask")}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.actionBar}>
          <button className="buttonGhost" onClick={onClose} type="button">
            {t("common.actions.cancel")}
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
            {isPending
              ? t("common.actions.save")
              : task
                ? t("tasks.form.submitUpdate")
                : t("tasks.form.submitCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveTaskError(error: unknown, fallback: string) {
  if (error instanceof ApiResponseError) {
    return (
      error.message ||
      extractApiErrorMessage(error.data) ||
      fallback
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
