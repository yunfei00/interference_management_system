"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import type { AttachmentItem, ProjectActivityItem, TaskDetail } from "@/lib/contracts";
import type { AppLocale } from "@/i18n/config";
import { deleteAttachment, uploadAttachment } from "@/lib/api/projects";
import { ApiResponseError, extractApiErrorMessage } from "@/lib/api-client";

import styles from "./projects.module.css";
import { ActivityTimeline } from "./activity-timeline";
import { EmptyState } from "./empty-state";
import {
  attachmentDownloadHref,
  formatDate,
  formatFileSize,
  getUserLabel,
} from "./project-utils";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";

export function TaskDrawer({
  task,
  loading,
  activities,
  onClose,
  onEdit,
  onDelete,
  onAttachmentChanged,
}: {
  task: TaskDetail | null;
  loading: boolean;
  activities: ProjectActivityItem[];
  onClose: () => void;
  onEdit: (task: TaskDetail) => void;
  onDelete: (task: TaskDetail) => void;
  onAttachmentChanged: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const t = useTranslations();
  const locale = useLocale() as AppLocale;

  async function uploadSelectedFile() {
    if (!task || !selectedFile) {
      return;
    }
    try {
      await uploadAttachment(task.project.id, selectedFile, task.id);
      setSelectedFile(null);
      onAttachmentChanged();
    } catch (error) {
      setErrorMessage(resolveDrawerError(error, t("tasks.drawer.actionFailed")));
    }
  }

  async function removeAttachment(attachment: AttachmentItem) {
    try {
      await deleteAttachment(attachment.id);
      onAttachmentChanged();
    } catch (error) {
      setErrorMessage(resolveDrawerError(error, t("tasks.drawer.actionFailed")));
    }
  }

  return (
    <div className={styles.drawerWrap} role="presentation">
      <aside className={`surface ${styles.drawerPanel}`} role="dialog" aria-modal="true">
        <div className={styles.sectionHeader}>
          <div>
            <div className="eyebrow">{t("tasks.drawer.eyebrow")}</div>
            <h2 className={styles.projectTitle}>
              {task?.title || t("tasks.drawer.loadingTitle")}
            </h2>
          </div>
          <button className="buttonGhost" onClick={onClose} type="button">
            {t("common.actions.close")}
          </button>
        </div>

        {loading ? <div className={styles.placeholder}>{t("tasks.drawer.loading")}</div> : null}

        {!loading && !task ? (
          <EmptyState
            description={t("tasks.drawer.unavailableDescription")}
            title={t("tasks.drawer.unavailableTitle")}
            tone="error"
          />
        ) : null}

        {task ? (
          <>
            {errorMessage ? (
              <EmptyState
                description={errorMessage}
                title={t("tasks.drawer.actionFailedTitle")}
                tone="error"
              />
            ) : null}

            <div className={styles.metaRow}>
              <StatusBadge kind="task" value={task.status} />
              <PriorityBadge kind="task" value={task.priority} />
              <span className={styles.chip}>
                {t("tasks.drawer.progress", { value: task.progress })}
              </span>
            </div>

            <div className={styles.detailList}>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>{t("tasks.drawer.assignee")}</span>
                <span>{getUserLabel(task.assignee, t("common.states.unassigned"))}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>{t("tasks.drawer.milestone")}</span>
                <span>{task.milestone?.name || t("common.states.none")}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>{t("tasks.drawer.start")}</span>
                <span>{formatDate(task.start_date, locale, t("common.states.none"))}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>{t("tasks.drawer.due")}</span>
                <span>{formatDate(task.due_date, locale, t("common.states.none"))}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>{t("tasks.drawer.estimated")}</span>
                <span>{task.estimated_hours || t("common.states.none")}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>{t("tasks.drawer.actual")}</span>
                <span>{task.actual_hours || t("common.states.none")}</span>
              </div>
            </div>

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>{t("tasks.drawer.description")}</h3>
            </div>
            <div className={styles.placeholder}>{task.description || t("tasks.drawer.descriptionEmpty")}</div>

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>{t("tasks.drawer.subtasks")}</h3>
            </div>
            {task.subtasks.length ? (
              <div className={styles.taskList}>
                {task.subtasks.map((subtask) => (
                  <div className={styles.listRow} key={subtask.id}>
                    <span>{subtask.title}</span>
                    <span className={styles.chip}>
                      {subtask.is_done
                        ? t("tasks.drawer.subtaskDone")
                        : t("tasks.drawer.subtaskOpen")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>{t("tasks.drawer.subtasksEmpty")}</div>
            )}

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>{t("tasks.drawer.dependencies")}</h3>
            </div>
            {task.dependencies.length ? (
              <div className={styles.taskList}>
                {task.dependencies.map((dependency) => (
                  <div className={styles.listRow} key={dependency.id}>
                    <span>{dependency.depends_on.title}</span>
                    <StatusBadge kind="task" value={dependency.depends_on.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>{t("tasks.drawer.dependenciesEmpty")}</div>
            )}

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>{t("tasks.drawer.attachments")}</h3>
            </div>
            <div className={styles.actionBar}>
              <input
                className={styles.input}
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <button
                className="button"
                disabled={!selectedFile || isPending}
                onClick={() =>
                  startTransition(async () => {
                    await uploadSelectedFile();
                  })
                }
                type="button"
              >
                {isPending ? t("tasks.drawer.uploading") : t("tasks.drawer.upload")}
              </button>
            </div>

            {task.attachments.length ? (
              <div className={styles.attachmentList}>
                {task.attachments.map((attachment) => (
                  <div className={styles.listRow} key={attachment.id}>
                    <div className={styles.primaryCell}>
                      <a
                        className={styles.linkButton}
                        href={attachmentDownloadHref(attachment)}
                        target="_blank"
                      >
                        {attachment.file_name}
                      </a>
                      <span className={styles.secondaryText}>
                        {formatFileSize(attachment.file_size)} |{" "}
                        {getUserLabel(attachment.uploaded_by, t("common.states.unassigned"))}
                      </span>
                    </div>
                    <button
                      className={styles.smallButton}
                      onClick={() => {
                        void removeAttachment(attachment);
                      }}
                      type="button"
                    >
                      {t("common.actions.delete")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>{t("tasks.drawer.attachmentsEmpty")}</div>
            )}

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>{t("tasks.drawer.recentActivity")}</h3>
            </div>
            <ActivityTimeline
              activities={activities}
              emptyText={t("activity.emptyDescription")}
            />

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>{t("tasks.drawer.comments")}</h3>
            </div>
            <div className={styles.placeholder}>
              {t("tasks.drawer.commentsPlaceholder")}
            </div>

            <div className={styles.actionBar}>
              <button className="buttonGhost" onClick={() => onEdit(task)} type="button">
                {t("tasks.drawer.editTask")}
              </button>
              <button className="button" onClick={() => onDelete(task)} type="button">
                {t("tasks.drawer.deleteTask")}
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function resolveDrawerError(error: unknown, fallback: string) {
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
