"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { PaginatedPayload, ProjectDetail, ProjectListItem, ProjectSummaryPayload } from "@/lib/contracts";
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
import { formatDate, formatDateTime } from "./project-utils";
import { StatusBadge } from "./status-badge";
import { ToastBanner, type ToastState } from "./toast-banner";

type ResourceState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "error"; message: string };

const SUMMARY_ITEMS: Array<{
  key: keyof ProjectSummaryPayload;
  label: string;
}> = [
  { key: "total_projects", label: "Total Projects" },
  { key: "in_progress_projects", label: "In Progress" },
  { key: "completed_projects", label: "Completed" },
  { key: "my_projects", label: "My Projects" },
  { key: "my_pending_tasks", label: "My Pending Tasks" },
  { key: "upcoming_tasks", label: "Due Soon" },
  { key: "blocked_tasks", label: "Blocked Tasks" },
];

export function ProjectListPage() {
  const { state: session } = useDashboardSession();
  const ready = session.kind === "ready";
  const currentUserId = ready ? session.data.user.id : 0;

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
            message: resolveError(error, "Unable to load projects."),
          });
        }
      }
    }

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, [query, ready, reloadKey]);

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
            message: resolveError(error, "Unable to load project summary."),
          });
        }
      }
    }
    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [ready, reloadKey]);

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
      description="Project management is only available to approved users."
      requiredPermissions={["projects.module.view"]}
      title="Access denied"
    >
      <div className={styles.page}>
        <section className={`surface ${styles.hero}`}>
          <div className={styles.sectionHeader}>
            <div>
              <div className="eyebrow">Project Management</div>
              <h1 className={styles.heroTitle}>Project Portfolio</h1>
              <p className={styles.heroText}>
                Track cross-team delivery with projects, milestones, tasks, Kanban flow,
                attachments, and activity history in one place.
              </p>
            </div>
            <button
              className="button"
              onClick={() => {
                setEditingProject(null);
                setFormMode("create");
              }}
              type="button"
            >
              Create Project
            </button>
          </div>

          {summaryState.kind === "ready" ? (
            <div className={styles.summaryGrid}>
              {SUMMARY_ITEMS.map((item) => (
                <article className={styles.summaryCard} key={item.key}>
                  <span className={styles.summaryLabel}>{item.label}</span>
                  <strong className={styles.summaryValue}>
                    {summaryState.data[item.key]}
                  </strong>
                </article>
              ))}
            </div>
          ) : summaryState.kind === "error" ? (
            <EmptyState
              description={summaryState.message}
              title="Summary unavailable"
              tone="error"
            />
          ) : (
            <div className={styles.summaryGrid}>
              {SUMMARY_ITEMS.map((item) => (
                <article className={styles.summaryCard} key={item.key}>
                  <span className={styles.summaryLabel}>{item.label}</span>
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
                <span className={styles.fieldLabel}>Search</span>
                <input
                  className={styles.input}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyFilters();
                    }
                  }}
                  placeholder="Search by project name or code"
                  value={searchInput}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Status</span>
                <select
                  className={styles.select}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  value={statusFilter}
                >
                  <option value="">All statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Priority</span>
                <select
                  className={styles.select}
                  onChange={(event) => {
                    setPriorityFilter(event.target.value);
                    setPage(1);
                  }}
                  value={priorityFilter}
                >
                  <option value="">All priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
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
                Only my projects
              </label>
            </div>

            <div className={styles.toolbarEnd}>
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewButton} ${viewMode === "table" ? styles.viewButtonActive : ""}`}
                  onClick={() => setViewMode("table")}
                  type="button"
                >
                  Table
                </button>
                <button
                  className={`${styles.viewButton} ${viewMode === "cards" ? styles.viewButtonActive : ""}`}
                  onClick={() => setViewMode("cards")}
                  type="button"
                >
                  Cards
                </button>
              </div>
              <button className="buttonGhost" onClick={applyFilters} type="button">
                Apply Filters
              </button>
              <button className="buttonGhost" onClick={refresh} type="button">
                Refresh
              </button>
            </div>
          </div>

          <ProjectListBody
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
            confirmLabel="Archive Project"
            description={`Archive ${archiveTarget.name}. Members will still see history, but it will be removed from active project views.`}
            onClose={() => setArchiveTarget(null)}
            onConfirm={async () => {
              await archiveProject(archiveTarget.id);
              setToast({
                kind: "success",
                message: `Archived project ${archiveTarget.name}.`,
              });
              setArchiveTarget(null);
              refresh();
            }}
            title="Archive Project"
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
}: {
  state: ResourceState<PaginatedPayload<ProjectListItem>>;
  viewMode: "table" | "cards";
  onEdit: (project: ProjectListItem) => void;
  onArchive: (project: ProjectListItem) => void;
}) {
  if (state.kind === "loading") {
    return <div className={styles.placeholder}>Loading projects...</div>;
  }

  if (state.kind === "error") {
    return <EmptyState description={state.message} title="Unable to load projects" tone="error" />;
  }

  if (!state.data.items.length) {
    return (
      <EmptyState
        description="Try broadening the filters or create your first project."
        title="No Projects Found"
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
              <span className={styles.chip}>{project.progress}% complete</span>
            </div>
            <p className={styles.secondaryText}>
              {project.description || "No description available for this project yet."}
            </p>
            <MemberAvatarGroup members={project.members} />
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${project.progress}%` }} />
            </div>
            <div className={styles.secondaryText}>
              Deadline {formatDate(project.end_date)}
            </div>
            <div className={styles.actionBar}>
              <Link className="buttonGhost" href={`/dashboard/projects/${project.id}`}>
                Open
              </Link>
              {project.can_edit ? (
                <>
                  <button className={styles.smallButton} onClick={() => onEdit(project)} type="button">
                    Edit
                  </button>
                  <button className={styles.smallButton} onClick={() => onArchive(project)} type="button">
                    Archive
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
            <th>Project</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Owner</th>
            <th>Members</th>
            <th>Progress</th>
            <th>Start</th>
            <th>Deadline</th>
            <th>Updated</th>
            <th>Actions</th>
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
              <td>{project.owner?.display_name || project.owner?.username || "--"}</td>
              <td>
                <div className={styles.primaryCell}>
                  <MemberAvatarGroup members={project.members} />
                  <span className={styles.secondaryText}>{project.member_count} people</span>
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
              <td>{formatDate(project.start_date)}</td>
              <td>{formatDate(project.end_date)}</td>
              <td>{formatDateTime(project.updated_at)}</td>
              <td>
                <div className={styles.actionGroup}>
                  <Link className={styles.linkButton} href={`/dashboard/projects/${project.id}`}>
                    Open
                  </Link>
                  {project.can_edit ? (
                    <>
                      <button className={styles.smallButton} onClick={() => onEdit(project)} type="button">
                        Edit
                      </button>
                      <button className={styles.smallButton} onClick={() => onArchive(project)} type="button">
                        Archive
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
  if (state.kind !== "ready") {
    return null;
  }
  const { pagination } = state.data;
  return (
    <div className={styles.paginationRow}>
      <span className={styles.secondaryText}>
        Page {pagination.page} / {pagination.pages} | {pagination.count} projects
      </span>
      <div className={styles.actionGroup}>
        <button
          className={styles.smallButton}
          disabled={!pagination.previous}
          onClick={onPrev}
          type="button"
        >
          Previous
        </button>
        <button
          className={styles.smallButton}
          disabled={!pagination.next}
          onClick={onNext}
          type="button"
        >
          Next
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
