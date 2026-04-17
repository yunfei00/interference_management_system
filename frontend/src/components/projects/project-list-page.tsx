"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import type {
  PaginatedPayload,
  ProjectDetail,
  ProjectListItem,
  ProjectSummaryPayload,
} from "@/lib/contracts";
import type { AppLocale } from "@/i18n/config";
import { archiveProject, fetchProjectSummary, fetchProjects } from "@/lib/api/projects";
import { ApiResponseError } from "@/lib/api-client";

import { DepartmentAccessGuard } from "../department-access-guard";
import { useDashboardSession } from "../dashboard-session-provider";
import styles from "./projects.module.css";
import { ConfirmDialog } from "./confirm-dialog";
import { EmptyState } from "./empty-state";
import { MemberAvatarGroup } from "./member-avatar-group";
import { PriorityBadge } from "./priority-badge";
import { ProjectForm } from "./project-form";
import {
  formatDate,
  formatDateTime,
  getProjectPriorityLabel,
  getProjectStatusLabel,
  getUserLabel,
  PROJECT_PRIORITY_VALUES,
  PROJECT_STATUS_VALUES,
} from "./project-utils";
import { StatusBadge } from "./status-badge";
import { ToastBanner, type ToastState } from "./toast-banner";

type ResourceState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "error"; message: string };

const SUMMARY_KEYS: Array<keyof ProjectSummaryPayload> = [
  "total_projects",
  "in_progress_projects",
  "completed_projects",
  "my_projects",
  "my_pending_tasks",
  "upcoming_tasks",
  "blocked_tasks",
];

export function ProjectListPage() {
  const { state: session } = useDashboardSession();
  const ready = session.kind === "ready";
  const currentUserId = ready ? session.data.user.id : 0;
  const t = useTranslations();
  const locale = useLocale() as AppLocale;

  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [reloadKey, setReloadKey] = useState(0);
  const [projectsState, setProjectsState] =
    useState<ResourceState<PaginatedPayload<ProjectListItem>>>({ kind: "loading" });
  const [summaryState, setSummaryState] =
    useState<ResourceState<ProjectSummaryPayload>>({ kind: "loading" });
  const [toast, setToast] = useState<ToastState>(null);
  const [editingProject, setEditingProject] = useState<ProjectDetail | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProjectListItem | null>(null);

  const query = useMemo(
    () => ({
      page,
      ...(keyword ? { keyword } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(priorityFilter ? { priority: priorityFilter } : {}),
      ...(mineOnly ? { mine: 1 } : {}),
      ordering: "-updated_at",
    }),
    [keyword, mineOnly, page, priorityFilter, statusFilter],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }
    let cancelled = false;

    async function loadProjects() {
      setProjectsState({ kind: "loading" });
      try {
        const data = await fetchProjects(query);
        if (!cancelled) {
          setProjectsState({ kind: "ready", data });
        }
      } catch (error) {
        if (!cancelled) {
          setProjectsState({
            kind: "error",
            message: resolveError(error, t("projects.errors.list")),
          });
        }
      }
    }

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, [query, ready, reloadKey, t]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    let cancelled = false;
    async function loadSummary() {
      setSummaryState({ kind: "loading" });
      try {
        const data = await fetchProjectSummary();
        if (!cancelled) {
          setSummaryState({ kind: "ready", data });
        }
      } catch (error) {
        if (!cancelled) {
          setSummaryState({
            kind: "error",
            message: resolveError(error, t("projects.errors.summary")),
          });
        }
      }
    }
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [ready, reloadKey, t]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function refresh() {
    setReloadKey((current) => current + 1);
  }

  function applyFilters() {
    setPage(1);
    setKeyword(searchInput.trim());
  }

  return (
    <DepartmentAccessGuard
      description={t("projects.accessDeniedDescription")}
      requiredPermissions={["projects.module.view"]}
      title={t("projects.accessDeniedTitle")}
    >
      <div className={styles.page}>
        <section className={`surface ${styles.hero}`}>
          <div className={styles.sectionHeader}>
            <div>
              <div className="eyebrow">{t("projects.title")}</div>
              <h1 className={styles.heroTitle}>{t("projects.portfolioTitle")}</h1>
              <p className={styles.heroText}>{t("projects.heroSubtitle")}</p>
            </div>
            <button
              className="button"
              onClick={() => {
                setEditingProject(null);
                setFormMode("create");
              }}
              type="button"
            >
              {t("projects.actions.createProject")}
            </button>
          </div>

          {summaryState.kind === "ready" ? (
            <div className={styles.summaryGrid}>
              {SUMMARY_KEYS.map((item) => (
                <article className={styles.summaryCard} key={item}>
                  <span className={styles.summaryLabel}>{t(`projects.summary.${item}`)}</span>
                  <strong className={styles.summaryValue}>
                    {summaryState.data[item]}
                  </strong>
                </article>
              ))}
            </div>
          ) : summaryState.kind === "error" ? (
            <EmptyState
              description={summaryState.message}
              title={t("projects.errors.summary")}
              tone="error"
            />
          ) : (
            <div className={styles.summaryGrid}>
              {SUMMARY_KEYS.map((item) => (
                <article className={styles.summaryCard} key={item}>
                  <span className={styles.summaryLabel}>{t(`projects.summary.${item}`)}</span>
                  <strong className={styles.summaryValue}>...</strong>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={`surface ${styles.sectionPanel}`}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarStart}>
              <label className={styles.fieldWide}>
                <span className={styles.fieldLabel}>{t("projects.filters.search")}</span>
                <input
                  className={styles.input}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyFilters();
                    }
                  }}
                  placeholder={t("projects.filters.searchPlaceholder")}
                  value={searchInput}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t("projects.filters.status")}</span>
                <select
                  className={styles.select}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  value={statusFilter}
                >
                  <option value="">{t("common.states.allStatuses")}</option>
                  {PROJECT_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {getProjectStatusLabel(t, status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t("projects.filters.priority")}</span>
                <select
                  className={styles.select}
                  onChange={(event) => {
                    setPriorityFilter(event.target.value);
                    setPage(1);
                  }}
                  value={priorityFilter}
                >
                  <option value="">{t("common.states.allPriorities")}</option>
                  {PROJECT_PRIORITY_VALUES.map((priority) => (
                    <option key={priority} value={priority}>
                      {getProjectPriorityLabel(t, priority)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.switchRow}>
                <input
                  checked={mineOnly}
                  onChange={(event) => {
                    setMineOnly(event.target.checked);
                    setPage(1);
                  }}
                  type="checkbox"
                />
                {t("projects.filters.mineOnly")}
              </label>
            </div>

            <div className={styles.toolbarEnd}>
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewButton} ${viewMode === "table" ? styles.viewButtonActive : ""}`}
                  onClick={() => setViewMode("table")}
                  type="button"
                >
                  {t("projects.view.table")}
                </button>
                <button
                  className={`${styles.viewButton} ${viewMode === "cards" ? styles.viewButtonActive : ""}`}
                  onClick={() => setViewMode("cards")}
                  type="button"
                >
                  {t("projects.view.cards")}
                </button>
              </div>
              <button className="buttonGhost" onClick={applyFilters} type="button">
                {t("common.actions.apply")}
              </button>
              <button className="buttonGhost" onClick={refresh} type="button">
                {t("common.actions.refresh")}
              </button>
            </div>
          </div>

          <ProjectListBody
            locale={locale}
            onArchive={(project) => setArchiveTarget(project)}
            onEdit={(project) => {
              setEditingProject(project as ProjectDetail);
              setFormMode("edit");
            }}
            state={projectsState}
            viewMode={viewMode}
          />

          <PaginationFooter
            onNext={() => setPage((current) => current + 1)}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            state={projectsState}
          />
        </section>

        {formMode ? (
          <ProjectForm
            defaultOwnerId={currentUserId}
            mode={formMode}
            onClose={() => {
              setFormMode(null);
              setEditingProject(null);
            }}
            onSaved={(_, message) => {
              setToast({ kind: "success", message });
              setFormMode(null);
              setEditingProject(null);
              refresh();
            }}
            project={editingProject}
          />
        ) : null}

        {archiveTarget ? (
          <ConfirmDialog
            confirmLabel={t("projects.actions.archiveProject")}
            description={t("projects.toasts.archiveDescription", { name: archiveTarget.name })}
            onClose={() => setArchiveTarget(null)}
            onConfirm={async () => {
              await archiveProject(archiveTarget.id);
              setToast({
                kind: "success",
                message: t("projects.toasts.archiveSuccess", { name: archiveTarget.name }),
              });
              setArchiveTarget(null);
              refresh();
            }}
            title={t("projects.toasts.archiveTitle")}
          />
        ) : null}

        {toast ? <ToastBanner toast={toast} /> : null}
      </div>
    </DepartmentAccessGuard>
  );
}

function ProjectListBody({
  state,
  viewMode,
  onEdit,
  onArchive,
  locale,
}: {
  state: ResourceState<PaginatedPayload<ProjectListItem>>;
  viewMode: "table" | "cards";
  onEdit: (project: ProjectListItem) => void;
  onArchive: (project: ProjectListItem) => void;
  locale: AppLocale;
}) {
  const t = useTranslations();

  if (state.kind === "loading") {
    return <div className={styles.placeholder}>{t("common.states.loading")}</div>;
  }

  if (state.kind === "error") {
    return (
      <EmptyState
        description={state.message}
        title={t("projects.errors.list")}
        tone="error"
      />
    );
  }

  if (!state.data.items.length) {
    return (
      <EmptyState
        description={t("projects.empty.description")}
        title={t("projects.empty.title")}
      />
    );
  }

  if (viewMode === "cards") {
    return (
      <div className={styles.cardGrid}>
        {state.data.items.map((project) => (
          <article className={`surface ${styles.projectCard}`} key={project.id}>
            <div className={styles.projectCardHeader}>
              <div>
                <Link className={styles.projectTitleLink} href={`/dashboard/projects/${project.id}`}>
                  {project.name}
                </Link>
                <div className={styles.secondaryText}>{project.code}</div>
              </div>
              <StatusBadge kind="project" value={project.status} />
            </div>
            <div className={styles.metaRow}>
              <PriorityBadge kind="project" value={project.priority} />
              <span className={styles.chip}>
                {t("projects.card.progress", { value: project.progress })}
              </span>
            </div>
            <p className={styles.secondaryText}>
              {project.description || t("common.states.noDescription")}
            </p>
            <MemberAvatarGroup members={project.members} />
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${project.progress}%` }} />
            </div>
            <div className={styles.secondaryText}>
              {t("projects.card.deadline", {
                date: formatDate(project.end_date, locale, t("common.states.none")),
              })}
            </div>
            <div className={styles.actionBar}>
              <Link className="buttonGhost" href={`/dashboard/projects/${project.id}`}>
                {t("common.actions.open")}
              </Link>
              {project.can_edit ? (
                <>
                  <button className={styles.smallButton} onClick={() => onEdit(project)} type="button">
                    {t("common.actions.edit")}
                  </button>
                  <button className={styles.smallButton} onClick={() => onArchive(project)} type="button">
                    {t("projects.actions.archiveProject")}
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t("projects.table.project")}</th>
            <th>{t("projects.table.status")}</th>
            <th>{t("projects.table.priority")}</th>
            <th>{t("projects.table.owner")}</th>
            <th>{t("projects.table.members")}</th>
            <th>{t("projects.table.progress")}</th>
            <th>{t("projects.table.start")}</th>
            <th>{t("projects.table.deadline")}</th>
            <th>{t("projects.table.updated")}</th>
            <th>{t("projects.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {state.data.items.map((project) => (
            <tr key={project.id}>
              <td>
                <div className={styles.primaryCell}>
                  <Link className={styles.projectTitleLink} href={`/dashboard/projects/${project.id}`}>
                    {project.name}
                  </Link>
                  <span className={styles.secondaryText}>{project.code}</span>
                </div>
              </td>
              <td><StatusBadge kind="project" value={project.status} /></td>
              <td><PriorityBadge kind="project" value={project.priority} /></td>
              <td>{getUserLabel(project.owner, t("common.states.unassigned"))}</td>
              <td>
                <div className={styles.primaryCell}>
                  <MemberAvatarGroup members={project.members} />
                  <span className={styles.secondaryText}>
                    {t("projects.card.memberCount", { count: project.member_count })}
                  </span>
                </div>
              </td>
              <td>
                <div className={styles.primaryCell}>
                  <span>{project.progress}%</span>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              </td>
              <td>{formatDate(project.start_date, locale, t("common.states.none"))}</td>
              <td>{formatDate(project.end_date, locale, t("common.states.none"))}</td>
              <td>{formatDateTime(project.updated_at, locale, t("common.states.none"))}</td>
              <td>
                <div className={styles.actionGroup}>
                  <Link className={styles.linkButton} href={`/dashboard/projects/${project.id}`}>
                    {t("common.actions.open")}
                  </Link>
                  {project.can_edit ? (
                    <>
                      <button className={styles.smallButton} onClick={() => onEdit(project)} type="button">
                        {t("common.actions.edit")}
                      </button>
                      <button className={styles.smallButton} onClick={() => onArchive(project)} type="button">
                        {t("projects.actions.archiveProject")}
                      </button>
                    </>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaginationFooter({
  state,
  onPrev,
  onNext,
}: {
  state: ResourceState<PaginatedPayload<ProjectListItem>>;
  onPrev: () => void;
  onNext: () => void;
}) {
  const t = useTranslations();

  if (state.kind !== "ready") {
    return null;
  }
  const { pagination } = state.data;
  return (
    <div className={styles.paginationRow}>
      <span className={styles.secondaryText}>
        {t("common.pagination.summary", {
          page: pagination.page,
          pages: pagination.pages,
          count: pagination.count,
        })}
      </span>
      <div className={styles.actionGroup}>
        <button
          className={styles.smallButton}
          disabled={!pagination.previous}
          onClick={onPrev}
          type="button"
        >
          {t("common.pagination.previous")}
        </button>
        <button
          className={styles.smallButton}
          disabled={!pagination.next}
          onClick={onNext}
          type="button"
        >
          {t("common.pagination.next")}
        </button>
      </div>
    </div>
  );
}

function resolveError(error: unknown, fallback: string) {
  if (error instanceof ApiResponseError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}
