"use client";

import { useState, useTransition } from "react";

import type { AttachmentItem, ProjectActivityItem, TaskDetail } from "@/lib/contracts";
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

  async function uploadSelectedFile() {
    if (!task || !selectedFile) {
      return;
    }
    try {
      await uploadAttachment(task.project.id, selectedFile, task.id);
      setSelectedFile(null);
      onAttachmentChanged();
    } catch (error) {
      setErrorMessage(resolveDrawerError(error));
    }
  }

  async function removeAttachment(attachment: AttachmentItem) {
    try {
      await deleteAttachment(attachment.id);
      onAttachmentChanged();
    } catch (error) {
      setErrorMessage(resolveDrawerError(error));
    }
  }

  return (
    <div className={styles.drawerWrap} role="presentation">
      <aside className={`surface ${styles.drawerPanel}`} role="dialog" aria-modal="true">
        <div className={styles.sectionHeader}>
          <div>
            <div className="eyebrow">Task Detail</div>
            <h2 className={styles.projectTitle}>{task?.title || "Loading task..."}</h2>
          </div>
          <button className="buttonGhost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {loading ? <div className={styles.placeholder}>Loading task details...</div> : null}

        {!loading && !task ? (
          <EmptyState
            description="The selected task could not be loaded."
            title="Task Unavailable"
            tone="error"
          />
        ) : null}

        {task ? (
          <>
            {errorMessage ? (
              <EmptyState
                description={errorMessage}
                title="Action failed"
                tone="error"
              />
            ) : null}

            <div className={styles.metaRow}>
              <StatusBadge kind="task" value={task.status} />
              <PriorityBadge kind="task" value={task.priority} />
              <span className={styles.chip}>{task.progress}% progress</span>
            </div>

            <div className={styles.detailList}>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>Assignee</span>
                <span>{getUserLabel(task.assignee)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>Milestone</span>
                <span>{task.milestone?.name || "--"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>Start</span>
                <span>{formatDate(task.start_date)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>Due</span>
                <span>{formatDate(task.due_date)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>Estimated</span>
                <span>{task.estimated_hours || "--"}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.fieldLabel}>Actual</span>
                <span>{task.actual_hours || "--"}</span>
              </div>
            </div>

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>Description</h3>
            </div>
            <div className={styles.placeholder}>{task.description || "No description provided."}</div>

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>Subtasks</h3>
            </div>
            {task.subtasks.length ? (
              <div className={styles.taskList}>
                {task.subtasks.map((subtask) => (
                  <div className={styles.listRow} key={subtask.id}>
                    <span>{subtask.title}</span>
                    <span className={styles.chip}>{subtask.is_done ? "Done" : "Open"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>No subtasks.</div>
            )}

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>Dependencies</h3>
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
              <div className={styles.placeholder}>No dependencies.</div>
            )}

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>Attachments</h3>
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
                {isPending ? "Uploading..." : "Upload Attachment"}
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
                        {formatFileSize(attachment.file_size)} | {getUserLabel(attachment.uploaded_by)}
                      </span>
                    </div>
                    <button
                      className={styles.smallButton}
                      onClick={() => {
                        void removeAttachment(attachment);
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.placeholder}>No attachments uploaded for this task.</div>
            )}

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>Recent Activity</h3>
            </div>
            <ActivityTimeline
              activities={activities}
              emptyText="No recent task activity recorded yet."
            />

            <div className={styles.sectionHeader}>
              <h3 className={styles.projectTitle}>Comments</h3>
            </div>
            <div className={styles.placeholder}>
              Comments will be added in a future iteration. The drawer keeps this space reserved for the extension.
            </div>

            <div className={styles.actionBar}>
              <button className="buttonGhost" onClick={() => onEdit(task)} type="button">
                Edit Task
              </button>
              <button className="button" onClick={() => onDelete(task)} type="button">
                Delete Task
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}

function resolveDrawerError(error: unknown) {
  if (error instanceof ApiResponseError) {
    return (
      error.message ||
      extractApiErrorMessage(error.data) ||
      "Unable to complete the task action."
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to complete the task action.";
}
