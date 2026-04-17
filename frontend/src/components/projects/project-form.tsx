"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { ProjectDetail, UserBrief } from "@/lib/contracts";
import {
  createProject,
  fetchProjectMemberOptions,
  type ProjectWriteInput,
  updateProject,
} from "@/lib/api/projects";
import { ApiResponseError, extractApiErrorMessage } from "@/lib/api-client";

import styles from "./projects.module.css";
import { EmptyState } from "./empty-state";
import {
  getProjectPriorityLabel,
  getProjectStatusLabel,
  getUserLabel,
  joinTags,
  parseTags,
  PROJECT_PRIORITY_VALUES,
  PROJECT_STATUS_VALUES,
} from "./project-utils";

function mergeUniqueUsers(...groups: Array<UserBrief[]>) {
  const map = new Map<number, UserBrief>();
  for (const group of groups) {
    for (const user of group) {
      map.set(user.id, user);
    }
  }
  return [...map.values()].sort((left, right) =>
    getUserLabel(left).localeCompare(getUserLabel(right)),
  );
}

export function ProjectForm({
  mode,
  project,
  defaultOwnerId,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  project?: ProjectDetail | null;
  defaultOwnerId: number;
  onClose: () => void;
  onSaved: (project: ProjectDetail, message: string) => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState(project?.status ?? "not_started");
  const [priority, setPriority] = useState(project?.priority ?? "medium");
  const [ownerId, setOwnerId] = useState<number>(project?.owner?.id ?? defaultOwnerId);
  const [memberIds, setMemberIds] = useState<number[]>(
    project?.members.map((member) => member.id) ?? [],
  );
  const [startDate, setStartDate] = useState(project?.start_date ?? "");
  const [endDate, setEndDate] = useState(project?.end_date ?? "");
  const [tagsInput, setTagsInput] = useState(joinTags(project?.tags));
  const [memberKeyword, setMemberKeyword] = useState("");
  const deferredKeyword = useDeferredValue(memberKeyword);
  const [memberOptions, setMemberOptions] = useState<UserBrief[]>(
    mergeUniqueUsers(project?.owner ? [project.owner] : [], project?.members ?? []),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      try {
        const options = await fetchProjectMemberOptions(deferredKeyword);
        if (!cancelled) {
          setMemberOptions((current) =>
            mergeUniqueUsers(
              current,
              options,
              project?.owner ? [project.owner] : [],
              project?.members ?? [],
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setMemberOptions((current) =>
            current.length
              ? current
              : mergeUniqueUsers(project?.owner ? [project.owner] : [], project?.members ?? []),
          );
        }
      }
    }
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [deferredKeyword, project]);

  const ownerOptions = useMemo(
    () =>
      mergeUniqueUsers(memberOptions, project?.owner ? [project.owner] : [], project?.members ?? []),
    [memberOptions, project],
  );

  function toggleMember(userId: number) {
    setMemberIds((current) =>
      current.includes(userId)
        ? current.filter((item) => item !== userId)
        : [...current, userId],
    );
  }

  async function submit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage(t("validation.projectNameRequired"));
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setErrorMessage(t("validation.endDateBeforeStart"));
      return;
    }

    const payload: ProjectWriteInput = {
      name: trimmedName,
      description: description.trim(),
      status,
      priority,
      owner: ownerId,
      members: memberIds.filter((item) => item !== ownerId),
      start_date: startDate || null,
      end_date: endDate || null,
      tags: parseTags(tagsInput),
    };

    setErrorMessage("");
    try {
      const saved =
        mode === "create"
          ? await createProject(payload)
          : await updateProject(project!.id, payload);
      onSaved(
        saved,
        mode === "create"
          ? t("projects.form.createSuccess", { name: saved.name })
          : t("projects.form.updateSuccess", { name: saved.name }),
      );
    } catch (error) {
      setErrorMessage(resolveProjectError(error, t("projects.form.saveFailed")));
    }
  }

  return (
    <div className={styles.overlay} role="presentation">
      <div className={`surface ${styles.modalPanel}`} role="dialog" aria-modal="true">
        <div className={styles.sectionHeader}>
          <div>
            <div className="eyebrow">
              {mode === "create"
                ? t("projects.form.createEyebrow")
                : t("projects.form.editEyebrow")}
            </div>
            <h2 className={styles.projectTitle}>
              {mode === "create"
                ? t("projects.form.createTitle")
                : t("projects.form.editTitle")}
            </h2>
          </div>
          <button className="buttonGhost" onClick={onClose} type="button">
            {t("common.actions.close")}
          </button>
        </div>

        {errorMessage ? (
          <EmptyState
            description={errorMessage}
            title={t("projects.form.saveFailed")}
            tone="error"
          />
        ) : null}

        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>{t("projects.form.name")}</span>
            <input
              className={styles.input}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("projects.form.namePlaceholder")}
              value={name}
            />
          </label>

          <label className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>{t("projects.form.description")}</span>
            <textarea
              className={styles.textarea}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("projects.form.descriptionPlaceholder")}
              value={description}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("projects.form.status")}</span>
            <select
              className={styles.select}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              value={status}
            >
              {PROJECT_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {getProjectStatusLabel(t, value)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("projects.form.priority")}</span>
            <select
              className={styles.select}
              onChange={(event) => setPriority(event.target.value as typeof priority)}
              value={priority}
            >
              {PROJECT_PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {getProjectPriorityLabel(t, value)}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("projects.form.owner")}</span>
            <select
              className={styles.select}
              onChange={(event) => setOwnerId(Number(event.target.value))}
              value={ownerId}
            >
              {ownerOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.display_name || user.username}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("projects.form.tags")}</span>
            <input
              className={styles.input}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder={t("projects.form.tagsPlaceholder")}
              value={tagsInput}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("projects.form.startDate")}</span>
            <input
              className={styles.input}
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("projects.form.endDate")}</span>
            <input
              className={styles.input}
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>

          <div className={`${styles.field} ${styles.fullSpan}`}>
            <span className={styles.fieldLabel}>{t("projects.form.members")}</span>
            <input
              className={styles.input}
              onChange={(event) => setMemberKeyword(event.target.value)}
              placeholder={t("projects.form.memberSearchPlaceholder")}
              value={memberKeyword}
            />
            <div className={styles.pickerPanel}>
              {ownerOptions.length ? (
                <div className={styles.pickerList}>
                  {ownerOptions.map((user) => {
                    const checked = user.id === ownerId || memberIds.includes(user.id);
                    return (
                      <label className={styles.checkboxRow} key={user.id}>
                        <span>
                          <strong>{user.display_name || user.username}</strong>
                          <span className={styles.secondaryText}>
                            {user.email ? ` | ${user.email}` : ""}
                            {user.department_full_name ? ` | ${user.department_full_name}` : ""}
                          </span>
                        </span>
                        <input
                          checked={checked}
                          onChange={() => toggleMember(user.id)}
                          type="checkbox"
                        />
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.placeholder}>{t("projects.form.noMembersFound")}</div>
              )}
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
              : mode === "create"
                ? t("projects.form.submitCreate")
                : t("common.actions.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

function resolveProjectError(error: unknown, fallback: string) {
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
