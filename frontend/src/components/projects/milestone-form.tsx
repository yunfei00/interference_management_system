"use client";

import { useState, useTransition } from "react";

import type { MilestoneItem } from "@/lib/contracts";
import {
  createMilestone,
  type MilestoneWriteInput,
  updateMilestone,
} from "@/lib/api/projects";
import { ApiResponseError, extractApiErrorMessage } from "@/lib/api-client";

import styles from "./projects.module.css";
import { EmptyState } from "./empty-state";
import { MILESTONE_STATUS_LABELS } from "./project-utils";

export function MilestoneForm({
  projectId,
  milestone,
  onClose,
  onSaved,
}: {
  projectId: number;
  milestone?: MilestoneItem | null;
  onClose: () => void;
  onSaved: (milestone: MilestoneItem, message: string) => void;
}) {
  const [name, setName] = useState(milestone?.name ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [dueDate, setDueDate] = useState(milestone?.due_date ?? "");
  const [status, setStatus] = useState(milestone?.status ?? "pending");
  const [sortOrder, setSortOrder] = useState(String(milestone?.sort_order ?? 0));
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Milestone name is required.");
      return;
    }

    const payload: MilestoneWriteInput = {
      name: trimmedName,
      description: description.trim(),
      due_date: dueDate || null,
      status,
      sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
    };

    setErrorMessage("");
    try {
      const saved = milestone
        ? await updateMilestone(milestone.id, payload)
        : await createMilestone(projectId, payload);
      onSaved(
        saved,
        milestone ? `Updated milestone ${saved.name}.` : `Created milestone ${saved.name}.`,
      );
    } catch (error) {
      setErrorMessage(resolveMilestoneError(error));
    }
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={`surface ${styles.modalPanel}`} role="dialog" aria-modal="true">
        <div className={styles.sectionHeader}>
          <div>
            <div className="eyebrow">{milestone ? "Edit" : "Create"}</div>
            <h2 className={styles.projectTitle}>Milestone</h2>
          </div>
          <button className="buttonGhost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {errorMessage ? (
          <EmptyState
            description={errorMessage}
            title="Unable to save milestone"
            tone="error"
          />
        ) : null}

        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>Milestone Name</span>
            <input
              className={styles.input}
              onChange={(event) => setName(event.target.value)}
              value={name}
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
              onChange={(event) => setStatus(event.target.value as typeof status)}
              value={status}
            >
              {Object.entries(MILESTONE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
            <span className={styles.fieldLabel}>Sort Order</span>
            <input
              className={styles.input}
              min={0}
              onChange={(event) => setSortOrder(event.target.value)}
              type="number"
              value={sortOrder}
            />
          </label>
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
            {isPending ? "Saving..." : milestone ? "Save Milestone" : "Create Milestone"}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveMilestoneError(error: unknown) {
  if (error instanceof ApiResponseError) {
    return (
      error.message ||
      extractApiErrorMessage(error.data) ||
      "Unable to save the milestone."
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unable to save the milestone.";
}
