"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { MilestoneItem } from "@/lib/contracts";
import {
  createMilestone,
  type MilestoneWriteInput,
  updateMilestone,
} from "@/lib/api/projects";
import { ApiResponseError, extractApiErrorMessage } from "@/lib/api-client";

import styles from "./projects.module.css";
import { EmptyState } from "./empty-state";
import {
  getMilestoneStatusLabel,
  MILESTONE_STATUS_VALUES,
} from "./project-utils";

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
  const t = useTranslations();
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
      setErrorMessage(t("validation.milestoneNameRequired"));
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
        milestone
          ? t("milestones.form.updateSuccess", { name: saved.name })
          : t("milestones.form.createSuccess", { name: saved.name }),
      );
    } catch (error) {
      setErrorMessage(resolveMilestoneError(error, t("milestones.form.saveFailed")));
    }
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={`surface ${styles.modalPanel}`} role="dialog" aria-modal="true">
        <div className={styles.sectionHeader}>
          <div>
            <div className="eyebrow">
              {milestone ? t("milestones.form.editEyebrow") : t("milestones.form.createEyebrow")}
            </div>
            <h2 className={styles.projectTitle}>{t("milestones.form.title")}</h2>
          </div>
          <button className="buttonGhost" onClick={onClose} type="button">
            {t("common.actions.close")}
          </button>
        </div>

        {errorMessage ? (
          <EmptyState
            description={errorMessage}
            title={t("milestones.form.saveFailed")}
            tone="error"
          />
        ) : null}

        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>{t("milestones.form.name")}</span>
            <input
              className={styles.input}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>

          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>{t("milestones.form.description")}</span>
            <textarea
              className={styles.textarea}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("milestones.form.status")}</span>
            <select
              className={styles.select}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              value={status}
            >
              {MILESTONE_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {getMilestoneStatusLabel(t, value)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("milestones.form.dueDate")}</span>
            <input
              className={styles.input}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("milestones.form.sortOrder")}</span>
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
              : milestone
                ? t("milestones.form.submitUpdate")
                : t("milestones.form.submitCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveMilestoneError(error: unknown, fallback: string) {
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
