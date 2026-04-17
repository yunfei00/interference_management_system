"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import type {
  AttachmentItem,
  MilestoneItem,
  PaginatedPayload,
  ProjectActivityItem,
  ProjectDashboardPayload,
  ProjectDetail,
  TaskDetail,
  TaskListItem,
  TaskStatus,
} from "@/lib/contracts";
import type { AppLocale } from "@/i18n/config";
import {
  archiveProject,
  deleteAttachment,
  deleteMilestone,
  deleteTask,
  fetchProjectActivities,
  fetchProjectAttachments,
  fetchProjectDashboard,
  fetchProjectMilestones,
  fetchProjectTasks,
  fetchTaskDetail,
  moveTask,
  uploadAttachment,
} from "@/lib/api/projects";
import { ApiResponseError } from "@/lib/api-client";

import { DepartmentAccessGuard } from "../department-access-guard";
import { useDashboardSession } from "../dashboard-session-provider";
import styles from "./projects.module.css";
import { ActivityTimeline } from "./activity-timeline";
import { ConfirmDialog } from "./confirm-dialog";
import { EmptyState } from "./empty-state";
import { KanbanBoard } from "./kanban-board";
import { MemberAvatarGroup } from "./member-avatar-group";
import { MilestoneForm } from "./milestone-form";
import { PriorityBadge } from "./priority-badge";
import { ProjectForm } from "./project-form";
import {
  applyServerTaskOrder,
  attachmentDownloadHref,
  formatDate,
  formatDateTime,
  formatFileSize,
  getTaskPriorityLabel,
  getTaskStatusLabel,
  getUserLabel,
  optimisticMoveTasks,
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
} from "./project-utils";
import { StatusBadge } from "./status-badge";
import { TaskDrawer } from "./task-drawer";
import { TaskForm } from "./task-form";
import { ToastBanner, type ToastState } from "./toast-banner";

type ResourceState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "error"; message: string };

type DetailTab = "overview" | "kanban" | "tasks" | "milestones" | "attachments" | "activity";

const DETAIL_TABS: DetailTab[] = [
  "overview",
  "kanban",
  "tasks",
  "milestones",
  "attachments",
  "activity",
];

export function ProjectDetailPage({ projectId }: { projectId: number }) {
  const { state: session } = useDashboardSession();
  const ready = session.kind === "ready";
  const currentUserId = ready ? session.data.user.id : 0;
  const t = useTranslations();
  const locale = useLocale() as AppLocale;

  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [toast, setToast] = useState<ToastState>(null);

  const [dashboardState, setDashboardState] =
    useState<ResourceState<ProjectDashboardPayload>>({ kind: "loading" });
  const [boardState, setBoardState] =
    useState<ResourceState<TaskListItem[]>>({ kind: "loading" });
  const [milestonesState, setMilestonesState] =
    useState<ResourceState<MilestoneItem[]>>({ kind: "loading" });

  const [taskListState, setTaskListState] =
    useState<ResourceState<PaginatedPayload<TaskListItem>>>({ kind: "loading" });
  const [attachmentsState, setAttachmentsState] =
    useState<ResourceState<PaginatedPayload<AttachmentItem>>>({ kind: "loading" });
  const [activityState, setActivityState] =
    useState<ResourceState<PaginatedPayload<ProjectActivityItem>>>({ kind: "loading" });

  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [selectedTaskActivities, setSelectedTaskActivities] = useState<ProjectActivityItem[]>([]);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskDrawerLoading, setTaskDrawerLoading] = useState(false);

  const [taskFormTarget, setTaskFormTarget] = useState<TaskDetail | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormDefaultStatus, setTaskFormDefaultStatus] = useState<TaskStatus | undefined>();
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [milestoneFormTarget, setMilestoneFormTarget] = useState<MilestoneItem | null>(null);
  const [milestoneFormOpen, setMilestoneFormOpen] = useState(false);

  const [archiveTarget, setArchiveTarget] = useState<ProjectDetail | null>(null);
  const [taskDeleteTarget, setTaskDeleteTarget] = useState<TaskDetail | null>(null);
  const [milestoneDeleteTarget, setMilestoneDeleteTarget] = useState<MilestoneItem | null>(null);
  const [attachmentDeleteTarget, setAttachmentDeleteTarget] = useState<AttachmentItem | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);

  const [taskSearchInput, setTaskSearchInput] = useState("");
  const [taskKeyword, setTaskKeyword] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [taskPriority, setTaskPriority] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskMilestone, setTaskMilestone] = useState("");
  const [taskMineOnly, setTaskMineOnly] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [attachmentPage, setAttachmentPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [attachmentTaskId, setAttachmentTaskId] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [coreReloadKey, setCoreReloadKey] = useState(0);
  const [taskReloadKey, setTaskReloadKey] = useState(0);
  const [attachmentReloadKey, setAttachmentReloadKey] = useState(0);
  const activityReloadKey = 0;
  const [drawerReloadKey, setDrawerReloadKey] = useState(0);

  const project = dashboardState.kind === "ready" ? dashboardState.data.project : null;
  const boardTasks = boardState.kind === "ready" ? boardState.data : [];
  const milestones = milestonesState.kind === "ready" ? milestonesState.data : [];

  const teamMembers = useMemo(() => {
    if (!project) {
      return [];
    }
    const map = new Map<number, typeof project.owner>();
    if (project.owner) {
      map.set(project.owner.id, project.owner);
    }
    project.members.forEach((member) => map.set(member.id, member));
    return [...map.values()].filter(
      (
        member,
      ): member is NonNullable<ProjectDetail["owner"]> => Boolean(member),
    );
  }, [project]);

  const taskListQuery = useMemo(
    () => ({
      page: taskPage,
      page_size: 20,
      ...(taskKeyword ? { keyword: taskKeyword } : {}),
      ...(taskStatus ? { status: taskStatus } : {}),
      ...(taskPriority ? { priority: taskPriority } : {}),
      ...(taskAssignee ? { assignee: taskAssignee } : {}),
      ...(taskMilestone ? { milestone: taskMilestone } : {}),
      ...(taskMineOnly ? { mine: 1 } : {}),
      order: "status,order_index",
    }),
    [taskAssignee, taskKeyword, taskMilestone, taskMineOnly, taskPage, taskPriority, taskStatus],
  );

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    let cancelled = false;

    async function loadCore() {
      setDashboardState({ kind: "loading" });
      setBoardState({ kind: "loading" });
      setMilestonesState({ kind: "loading" });

      const [dashboardResult, boardResult, milestonesResult] = await Promise.allSettled([
        fetchProjectDashboard(projectId),
        fetchProjectTasks(projectId, { page: 1, page_size: 200, order: "status,order_index" }),
        fetchProjectMilestones(projectId),
      ]);

      if (cancelled) {
        return;
      }

      setDashboardState(resolveSettled(dashboardResult, t("projects.errors.overview")));
      setBoardState(
        boardResult.status === "fulfilled"
          ? { kind: "ready", data: boardResult.value.items }
          : { kind: "error", message: resolveError(boardResult.reason, t("projects.errors.kanban")) },
      );
      setMilestonesState(
        milestonesResult.status === "fulfilled"
          ? { kind: "ready", data: milestonesResult.value }
          : { kind: "error", message: resolveError(milestonesResult.reason, t("projects.errors.milestones")) },
      );
    }

    void loadCore();
    return () => {
      cancelled = true;
    };
  }, [coreReloadKey, projectId, ready, t]);

  useEffect(() => {
    if (!ready || activeTab !== "tasks") {
      return;
    }
    let cancelled = false;
    async function loadTaskList() {
      setTaskListState({ kind: "loading" });
      try {
        const data = await fetchProjectTasks(projectId, taskListQuery);
        if (!cancelled) {
          setTaskListState({ kind: "ready", data });
        }
      } catch (error) {
        if (!cancelled) {
          setTaskListState({ kind: "error", message: resolveError(error, t("projects.errors.tasks")) });
        }
      }
    }
    void loadTaskList();
    return () => {
      cancelled = true;
    };
  }, [activeTab, projectId, ready, t, taskListQuery, taskReloadKey]);

  useEffect(() => {
    if (!ready || activeTab !== "attachments") {
      return;
    }
    let cancelled = false;
    async function loadAttachments() {
      setAttachmentsState({ kind: "loading" });
      try {
        const data = await fetchProjectAttachments(projectId, { page: attachmentPage, page_size: 20 });
        if (!cancelled) {
          setAttachmentsState({ kind: "ready", data });
        }
      } catch (error) {
        if (!cancelled) {
          setAttachmentsState({ kind: "error", message: resolveError(error, t("projects.errors.attachments")) });
        }
      }
    }
    void loadAttachments();
    return () => {
      cancelled = true;
    };
  }, [activeTab, attachmentPage, attachmentReloadKey, projectId, ready, t]);

  useEffect(() => {
    if (!ready || activeTab !== "activity") {
      return;
    }
    let cancelled = false;
    async function loadActivities() {
      setActivityState({ kind: "loading" });
      try {
        const data = await fetchProjectActivities(projectId, { page: activityPage, page_size: 20 });
        if (!cancelled) {
          setActivityState({ kind: "ready", data });
        }
      } catch (error) {
        if (!cancelled) {
          setActivityState({ kind: "error", message: resolveError(error, t("projects.errors.activity")) });
        }
      }
    }
    void loadActivities();
    return () => {
      cancelled = true;
    };
  }, [activeTab, activityPage, activityReloadKey, projectId, ready, t]);

  useEffect(() => {
    if (!ready || !taskDrawerOpen || !activeTaskId) {
      return;
    }
    const taskId = activeTaskId;
    let cancelled = false;
    async function loadDrawer() {
      setTaskDrawerLoading(true);
      try {
        const [task, activity] = await Promise.all([
          fetchTaskDetail(taskId),
          fetchProjectActivities(projectId, { page: 1, page_size: 10, task: taskId }),
        ]);
        if (!cancelled) {
          setSelectedTask(task);
          setSelectedTaskActivities(activity.items);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ kind: "error", message: resolveError(error, t("tasks.toasts.detailFailed")) });
        }
      } finally {
        if (!cancelled) {
          setTaskDrawerLoading(false);
        }
      }
    }
    void loadDrawer();
    return () => {
      cancelled = true;
    };
  }, [activeTaskId, drawerReloadKey, projectId, ready, t, taskDrawerOpen]);

  async function openTaskDrawer(taskId: number) {
    setActiveTaskId(taskId);
    setSelectedTask(null);
    setTaskDrawerOpen(true);
    setDrawerReloadKey((current) => current + 1);
  }

  async function openTaskForm(taskId?: number, defaultStatus?: TaskStatus) {
    if (!taskId) {
      setTaskFormTarget(null);
      setTaskFormDefaultStatus(defaultStatus);
      setTaskFormOpen(true);
      return;
    }
    try {
      const detail = await fetchTaskDetail(taskId);
      setTaskFormTarget(detail);
      setTaskFormDefaultStatus(undefined);
      setTaskFormOpen(true);
    } catch (error) {
      setToast({ kind: "error", message: resolveError(error, t("tasks.toasts.editLoadFailed")) });
    }
  }

  async function handleMove(taskId: number, targetStatus: TaskStatus, targetIndex: number) {
    if (boardState.kind !== "ready") {
      return;
    }
    const previousTasks = boardState.data;
    setMovingTaskId(taskId);
    setBoardState({
      kind: "ready",
      data: optimisticMoveTasks(previousTasks, taskId, targetStatus, targetIndex),
    });
    try {
      const result = await moveTask(taskId, targetStatus, targetIndex);
      setBoardState((current) => {
        if (current.kind !== "ready") {
          return current;
        }
        return {
          kind: "ready",
          data: applyServerTaskOrder(current.data, result.task, result.column_orders),
        };
      });
      setToast({ kind: "success", message: t("tasks.toasts.moveSuccess", { name: result.task.title }) });
      setCoreReloadKey((current) => current + 1);
      setTaskReloadKey((current) => current + 1);
      if (activeTaskId === taskId) {
        setDrawerReloadKey((current) => current + 1);
      }
    } catch (error) {
      setBoardState({ kind: "ready", data: previousTasks });
      setToast({ kind: "error", message: resolveError(error, t("tasks.toasts.moveFailed")) });
    } finally {
      setMovingTaskId(null);
    }
  }

  async function handleAttachmentUpload() {
    if (!project || !attachmentFile) {
      return;
    }
    setUploadingAttachment(true);
    try {
      await uploadAttachment(project.id, attachmentFile, attachmentTaskId ? Number(attachmentTaskId) : null);
      setAttachmentFile(null);
      setAttachmentTaskId("");
      setToast({ kind: "success", message: t("tasks.toasts.uploadAttachmentSuccess") });
      setAttachmentReloadKey((current) => current + 1);
      setCoreReloadKey((current) => current + 1);
    } catch (error) {
      setToast({ kind: "error", message: resolveError(error, t("tasks.toasts.uploadAttachmentFailed")) });
    } finally {
      setUploadingAttachment(false);
    }
  }

  const canDeleteAttachment = (attachment: AttachmentItem) =>
    Boolean(project?.can_edit || attachment.uploaded_by?.id === currentUserId);

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
              <div className="eyebrow">{t("projects.workspaceEyebrow")}</div>
              <h1 className={styles.heroTitle}>{project?.name || t("projects.workspaceFallbackTitle")}</h1>
              <p className={styles.heroText}>
                {project?.description ||
                  t("projects.workspaceFallbackDescription")}
              </p>
            </div>
            <div className={styles.actionBar}>
              <Link className="buttonGhost" href="/dashboard/projects">
                {t("projects.actions.backToProjects")}
              </Link>
              {project?.can_edit ? (
                <>
                  <button className="buttonGhost" onClick={() => setProjectFormOpen(true)} type="button">
                    {t("projects.actions.editProject")}
                  </button>
                  <button className="button" onClick={() => setArchiveTarget(project)} type="button">
                    {t("projects.actions.archiveProject")}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {project ? (
            <>
              <div className={styles.metaRow}>
                <span className={styles.chip}>{project.code}</span>
                <StatusBadge kind="project" value={project.status} />
                <PriorityBadge kind="project" value={project.priority} />
                <span className={styles.chip}>{project.progress}%</span>
              </div>

              <div className={styles.statsGrid}>
                <article className={styles.statCard}>
                  <span className={styles.statLabel}>{t("projects.detail.stats.owner")}</span>
                  <strong className={styles.statValue}>{getUserLabel(project.owner, t("common.states.unassigned"))}</strong>
                </article>
                <article className={styles.statCard}>
                  <span className={styles.statLabel}>{t("projects.detail.stats.members")}</span>
                  <strong className={styles.statValue}>{project.member_count}</strong>
                </article>
                <article className={styles.statCard}>
                  <span className={styles.statLabel}>{t("projects.detail.stats.startDate")}</span>
                  <strong className={styles.statValue}>{formatDate(project.start_date, locale, t("common.states.none"))}</strong>
                </article>
                <article className={styles.statCard}>
                  <span className={styles.statLabel}>{t("projects.detail.stats.deadline")}</span>
                  <strong className={styles.statValue}>{formatDate(project.end_date, locale, t("common.states.none"))}</strong>
                </article>
              </div>
            </>
          ) : dashboardState.kind === "error" ? (
            <EmptyState description={dashboardState.message} title={t("projects.errors.detail")} tone="error" />
          ) : (
            <div className={styles.placeholder}>{t("common.states.loading")}</div>
          )}
        </section>

        <section className={`surface ${styles.sectionPanel}`}>
          <div className={styles.tabsRow}>
            {DETAIL_TABS.map((tab) => (
              <button
                className={`${styles.tabButton} ${activeTab === tab ? styles.tabButtonActive : ""}`}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {t(`projects.detail.tabs.${tab}`)}
              </button>
            ))}
          </div>

          {activeTab === "overview" ? (
            <OverviewTab dashboardState={dashboardState} project={project} />
          ) : null}

          {activeTab === "kanban" ? (
            <div className={styles.stack}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.projectTitle}>{t("tasks.kanban.title")}</h2>
                  <p className={styles.secondaryText}>{t("tasks.kanban.subtitle")}</p>
                </div>
                <button
                  className="button"
                  onClick={() => {
                    void openTaskForm(undefined, "todo");
                  }}
                  type="button"
                >
                  {t("tasks.newTask")}
                </button>
              </div>
              {boardState.kind === "error" ? (
                <EmptyState description={boardState.message} title={t("projects.errors.kanban")} tone="error" />
              ) : boardState.kind === "loading" ? (
                <div className={styles.placeholder}>{t("common.states.loading")}</div>
              ) : (
                <KanbanBoard
                  movingTaskId={movingTaskId}
                  onMove={handleMove}
                  onOpenTask={(taskId) => {
                    void openTaskDrawer(taskId);
                  }}
                  tasks={boardState.data}
                />
              )}
            </div>
          ) : null}

          {activeTab === "tasks" ? (
            <TasksTab
              milestones={milestones}
              onApplyFilters={() => {
                setTaskPage(1);
                setTaskKeyword(taskSearchInput.trim());
              }}
              onCreateTask={() => {
                void openTaskForm(undefined, "todo");
              }}
              onDeleteTask={(task) => setTaskDeleteTarget(task as TaskDetail)}
              onEditTask={(taskId) => {
                void openTaskForm(taskId);
              }}
              onOpenTask={(taskId) => {
                void openTaskDrawer(taskId);
              }}
              onRefresh={() => setTaskReloadKey((current) => current + 1)}
              paginationState={taskListState}
              searchInput={taskSearchInput}
              setAssignee={setTaskAssignee}
              setMilestone={setTaskMilestone}
              setMineOnly={setTaskMineOnly}
              setPage={setTaskPage}
              setPriority={setTaskPriority}
              setSearchInput={setTaskSearchInput}
              setStatus={setTaskStatus}
              taskAssignee={taskAssignee}
              taskMilestone={taskMilestone}
              taskMineOnly={taskMineOnly}
              taskPriority={taskPriority}
              taskStatus={taskStatus}
              teamMembers={teamMembers}
            />
          ) : null}

          {activeTab === "milestones" ? (
            <MilestonesTab
              milestonesState={milestonesState}
              onCreate={() => {
                setMilestoneFormTarget(null);
                setMilestoneFormOpen(true);
              }}
              onDelete={(milestone) => setMilestoneDeleteTarget(milestone)}
              onEdit={(milestone) => {
                setMilestoneFormTarget(milestone);
                setMilestoneFormOpen(true);
              }}
              projectCanEdit={Boolean(project?.can_edit)}
            />
          ) : null}

          {activeTab === "attachments" ? (
            <AttachmentsTab
              attachmentFile={attachmentFile}
              attachmentTaskId={attachmentTaskId}
              attachmentsState={attachmentsState}
              boardTasks={boardTasks}
              canDeleteAttachment={canDeleteAttachment}
              onDelete={setAttachmentDeleteTarget}
              onFileChange={setAttachmentFile}
              onPageChange={setAttachmentPage}
              onTaskChange={setAttachmentTaskId}
              onUpload={handleAttachmentUpload}
              uploading={uploadingAttachment}
            />
          ) : null}

          {activeTab === "activity" ? (
            <ActivityTab onPageChange={setActivityPage} state={activityState} />
          ) : null}
        </section>

        {projectFormOpen && project ? (
          <ProjectForm
            defaultOwnerId={currentUserId}
            mode="edit"
            onClose={() => setProjectFormOpen(false)}
            onSaved={(_, message) => {
              setProjectFormOpen(false);
              setToast({ kind: "success", message });
              setCoreReloadKey((current) => current + 1);
            }}
            project={project}
          />
        ) : null}

        {taskFormOpen && project ? (
          <TaskForm
            allTasks={boardTasks}
            defaultStatus={taskFormDefaultStatus}
            milestones={milestones}
            onClose={() => {
              setTaskFormOpen(false);
              setTaskFormTarget(null);
              setTaskFormDefaultStatus(undefined);
            }}
            onSaved={(savedTask, message) => {
              setToast({ kind: "success", message });
              setTaskFormOpen(false);
              setTaskFormTarget(null);
              setTaskFormDefaultStatus(undefined);
              setCoreReloadKey((current) => current + 1);
              setTaskReloadKey((current) => current + 1);
              if (activeTaskId === savedTask.id) {
                setSelectedTask(savedTask);
                setDrawerReloadKey((current) => current + 1);
              }
            }}
            project={project}
            task={taskFormTarget}
          />
        ) : null}

        {milestoneFormOpen && project ? (
          <MilestoneForm
            milestone={milestoneFormTarget}
            onClose={() => {
              setMilestoneFormOpen(false);
              setMilestoneFormTarget(null);
            }}
            onSaved={(_, message) => {
              setMilestoneFormOpen(false);
              setMilestoneFormTarget(null);
              setToast({ kind: "success", message });
              setCoreReloadKey((current) => current + 1);
            }}
            projectId={project.id}
          />
        ) : null}

        {taskDrawerOpen ? (
          <TaskDrawer
            activities={selectedTaskActivities}
            key={selectedTask?.id ?? "task-drawer"}
            loading={taskDrawerLoading}
            onAttachmentChanged={() => {
              setDrawerReloadKey((current) => current + 1);
              setAttachmentReloadKey((current) => current + 1);
              setCoreReloadKey((current) => current + 1);
            }}
            onClose={() => {
              setTaskDrawerOpen(false);
              setActiveTaskId(null);
              setSelectedTask(null);
              setSelectedTaskActivities([]);
            }}
            onDelete={(task) => setTaskDeleteTarget(task)}
            onEdit={(task) => {
              setTaskFormTarget(task);
              setTaskFormDefaultStatus(undefined);
              setTaskFormOpen(true);
            }}
            task={selectedTask}
          />
        ) : null}

        {archiveTarget ? (
          <ConfirmDialog
            confirmLabel={t("projects.actions.archiveProject")}
            description={t("projects.toasts.archiveDescription", { name: archiveTarget.name })}
            onClose={() => setArchiveTarget(null)}
            onConfirm={async () => {
              await archiveProject(archiveTarget.id);
              setArchiveTarget(null);
              setToast({ kind: "success", message: t("projects.toasts.archiveSuccess", { name: archiveTarget.name }) });
              setCoreReloadKey((current) => current + 1);
            }}
            title={t("projects.toasts.archiveTitle")}
          />
        ) : null}

        {taskDeleteTarget ? (
          <ConfirmDialog
            confirmLabel={t("common.actions.delete")}
            description={t("tasks.toasts.deleteDescription", { name: taskDeleteTarget.title })}
            onClose={() => setTaskDeleteTarget(null)}
            onConfirm={async () => {
              await deleteTask(taskDeleteTarget.id);
              setTaskDeleteTarget(null);
              setTaskDrawerOpen(false);
              setActiveTaskId(null);
              setToast({ kind: "success", message: t("tasks.toasts.deleteSuccess", { name: taskDeleteTarget.title }) });
              setCoreReloadKey((current) => current + 1);
              setTaskReloadKey((current) => current + 1);
            }}
            title={t("tasks.toasts.deleteTitle")}
          />
        ) : null}

        {milestoneDeleteTarget ? (
          <ConfirmDialog
            confirmLabel={t("common.actions.delete")}
            description={t("milestones.toasts.deleteDescription", { name: milestoneDeleteTarget.name })}
            onClose={() => setMilestoneDeleteTarget(null)}
            onConfirm={async () => {
              await deleteMilestone(milestoneDeleteTarget.id);
              setMilestoneDeleteTarget(null);
              setToast({ kind: "success", message: t("milestones.toasts.deleteSuccess", { name: milestoneDeleteTarget.name }) });
              setCoreReloadKey((current) => current + 1);
            }}
            title={t("milestones.toasts.deleteTitle")}
          />
        ) : null}

        {attachmentDeleteTarget ? (
          <ConfirmDialog
            confirmLabel={t("common.actions.delete")}
            description={t("projects.attachments.deleteDescription", { name: attachmentDeleteTarget.file_name })}
            onClose={() => setAttachmentDeleteTarget(null)}
            onConfirm={async () => {
              await deleteAttachment(attachmentDeleteTarget.id);
              setAttachmentDeleteTarget(null);
              setToast({
                kind: "success",
                message: t("projects.attachments.deleteSuccess", { name: attachmentDeleteTarget.file_name }),
              });
              setAttachmentReloadKey((current) => current + 1);
              setDrawerReloadKey((current) => current + 1);
              setCoreReloadKey((current) => current + 1);
            }}
            title={t("projects.attachments.deleteTitle")}
          />
        ) : null}

        {toast ? <ToastBanner toast={toast} /> : null}
      </div>
    </DepartmentAccessGuard>
  );
}

function MilestonesTab({
  milestonesState,
  projectCanEdit,
  onCreate,
  onEdit,
  onDelete,
}: {
  milestonesState: ResourceState<MilestoneItem[]>;
  projectCanEdit: boolean;
  onCreate: () => void;
  onEdit: (milestone: MilestoneItem) => void;
  onDelete: (milestone: MilestoneItem) => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;

  return (
    <div className={styles.stack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.projectTitle}>{t("projects.milestones.title")}</h2>
          <p className={styles.secondaryText}>{t("projects.milestones.subtitle")}</p>
        </div>
        {projectCanEdit ? (
          <button className="button" onClick={onCreate} type="button">
            {t("projects.milestones.newMilestone")}
          </button>
        ) : null}
      </div>
      {milestonesState.kind === "loading" ? (
        <div className={styles.placeholder}>{t("common.states.loading")}</div>
      ) : milestonesState.kind === "error" ? (
        <EmptyState description={milestonesState.message} title={t("projects.milestones.unavailable")} tone="error" />
      ) : milestonesState.data.length ? (
        <div className={styles.cardGrid}>
          {milestonesState.data.map((milestone) => (
            <article className={`surface ${styles.projectCard}`} key={milestone.id}>
              <div className={styles.sectionHeader}>
                <div>
                  <strong>{milestone.name}</strong>
                  <div className={styles.secondaryText}>
                    {t("projects.milestones.due", {
                      date: formatDate(milestone.due_date, locale, t("common.states.none")),
                    })}
                  </div>
                </div>
                <StatusBadge kind="milestone" value={milestone.status} />
              </div>
              <p className={styles.secondaryText}>{milestone.description || t("common.states.noDescription")}</p>
              {projectCanEdit ? (
                <div className={styles.actionBar}>
                  <button className={styles.smallButton} onClick={() => onEdit(milestone)} type="button">
                    {t("common.actions.edit")}
                  </button>
                  <button className={styles.smallButton} onClick={() => onDelete(milestone)} type="button">
                    {t("common.actions.delete")}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          description={t("projects.milestones.empty")}
          title={t("projects.detail.tabs.milestones")}
        />
      )}
    </div>
  );
}

function AttachmentsTab({
  attachmentsState,
  boardTasks,
  attachmentTaskId,
  attachmentFile,
  uploading,
  canDeleteAttachment,
  onTaskChange,
  onFileChange,
  onUpload,
  onDelete,
  onPageChange,
}: {
  attachmentsState: ResourceState<PaginatedPayload<AttachmentItem>>;
  boardTasks: TaskListItem[];
  attachmentTaskId: string;
  attachmentFile: File | null;
  uploading: boolean;
  canDeleteAttachment: (attachment: AttachmentItem) => boolean;
  onTaskChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  onDelete: (attachment: AttachmentItem) => void;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;

  return (
    <div className={styles.stack}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.projectTitle}>{t("projects.attachments.title")}</h2>
          <p className={styles.secondaryText}>{t("projects.attachments.subtitle")}</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{t("projects.attachments.bindTask")}</span>
          <select className={styles.select} onChange={(event) => onTaskChange(event.target.value)} value={attachmentTaskId}>
            <option value="">{t("projects.attachments.projectLevel")}</option>
            {boardTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.fullSpan}`}>
          <span className={styles.fieldLabel}>{t("projects.attachments.file")}</span>
          <input className={styles.input} onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} type="file" />
        </label>
      </div>

      <div className={styles.actionBar}>
        <button className="button" disabled={!attachmentFile || uploading} onClick={onUpload} type="button">
          {uploading ? t("projects.attachments.uploading") : t("projects.attachments.upload")}
        </button>
      </div>

      {attachmentsState.kind === "loading" ? (
        <div className={styles.placeholder}>{t("common.states.loading")}</div>
      ) : attachmentsState.kind === "error" ? (
        <EmptyState description={attachmentsState.message} title={t("projects.attachments.unavailable")} tone="error" />
      ) : attachmentsState.data.items.length ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("projects.attachments.file")}</th>
                  <th>{t("projects.attachments.task")}</th>
                  <th>{t("projects.attachments.size")}</th>
                  <th>{t("projects.attachments.uploader")}</th>
                  <th>{t("projects.attachments.uploaded")}</th>
                  <th>{t("tasks.list.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {attachmentsState.data.items.map((attachment) => (
                  <tr key={attachment.id}>
                    <td>
                      <a className={styles.linkButton} href={attachmentDownloadHref(attachment)} target="_blank">
                        {attachment.file_name}
                      </a>
                    </td>
                    <td>{attachment.task_title || t("common.states.none")}</td>
                    <td>{formatFileSize(attachment.file_size)}</td>
                    <td>{getUserLabel(attachment.uploaded_by, t("activity.operatorFallback"))}</td>
                    <td>{formatDateTime(attachment.created_at, locale, t("common.states.none"))}</td>
                    <td>
                      {canDeleteAttachment(attachment) ? (
                        <button className={styles.smallButton} onClick={() => onDelete(attachment)} type="button">
                          {t("common.actions.delete")}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationActions pagination={attachmentsState.data.pagination} onPageChange={onPageChange} />
        </>
      ) : (
        <EmptyState description={t("projects.attachments.empty")} title={t("projects.attachments.title")} />
      )}
    </div>
  );
}

function ActivityTab({
  state,
  onPageChange,
}: {
  state: ResourceState<PaginatedPayload<ProjectActivityItem>>;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations();

  if (state.kind === "loading") {
    return <div className={styles.placeholder}>{t("activity.loading")}</div>;
  }
  if (state.kind === "error") {
    return <EmptyState description={state.message} title={t("activity.unavailable")} tone="error" />;
  }
  if (!state.data.items.length) {
    return <EmptyState description={t("activity.emptyDescription")} title={t("activity.emptyTitle")} />;
  }
  return (
    <div className={styles.stack}>
      <ActivityTimeline activities={state.data.items} />
      <PaginationActions pagination={state.data.pagination} onPageChange={onPageChange} />
    </div>
  );
}

function TasksTab({
  paginationState,
  milestones,
  teamMembers,
  searchInput,
  taskStatus,
  taskPriority,
  taskAssignee,
  taskMilestone,
  taskMineOnly,
  setSearchInput,
  setStatus,
  setPriority,
  setAssignee,
  setMilestone,
  setMineOnly,
  setPage,
  onApplyFilters,
  onCreateTask,
  onDeleteTask,
  onRefresh,
  onOpenTask,
  onEditTask,
}: {
  paginationState: ResourceState<PaginatedPayload<TaskListItem>>;
  milestones: MilestoneItem[];
  teamMembers: Array<NonNullable<ProjectDetail["owner"]>>;
  searchInput: string;
  taskStatus: string;
  taskPriority: string;
  taskAssignee: string;
  taskMilestone: string;
  taskMineOnly: boolean;
  setSearchInput: (value: string) => void;
  setStatus: (value: string) => void;
  setPriority: (value: string) => void;
  setAssignee: (value: string) => void;
  setMilestone: (value: string) => void;
  setMineOnly: (value: boolean) => void;
  setPage: (page: number | ((current: number) => number)) => void;
  onApplyFilters: () => void;
  onCreateTask: () => void;
  onDeleteTask: (task: TaskListItem) => void;
  onRefresh: () => void;
  onOpenTask: (taskId: number) => void;
  onEditTask: (taskId: number) => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;

  return (
    <div className={styles.stack}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarStart}>
          <label className={styles.fieldWide}>
            <span className={styles.fieldLabel}>{t("tasks.list.search")}</span>
            <input
              className={styles.input}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onApplyFilters()}
              placeholder={t("tasks.list.searchPlaceholder")}
              value={searchInput}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.list.status")}</span>
            <select className={styles.select} onChange={(event) => setStatus(event.target.value)} value={taskStatus}>
              <option value="">{t("common.states.allStatuses")}</option>
              {TASK_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {getTaskStatusLabel(t, value)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.list.priority")}</span>
            <select className={styles.select} onChange={(event) => setPriority(event.target.value)} value={taskPriority}>
              <option value="">{t("common.states.allPriorities")}</option>
              {TASK_PRIORITY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {getTaskPriorityLabel(t, value)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.list.assignee")}</span>
            <select className={styles.select} onChange={(event) => setAssignee(event.target.value)} value={taskAssignee}>
              <option value="">{t("common.states.allAssignees")}</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {getUserLabel(member)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>{t("tasks.list.milestone")}</span>
            <select className={styles.select} onChange={(event) => setMilestone(event.target.value)} value={taskMilestone}>
              <option value="">{t("common.states.allMilestones")}</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.switchRow}>
            <input checked={taskMineOnly} onChange={(event) => setMineOnly(event.target.checked)} type="checkbox" />
            {t("tasks.list.mineOnly")}
          </label>
        </div>
        <div className={styles.toolbarEnd}>
          <button className="buttonGhost" onClick={onApplyFilters} type="button">
            {t("common.actions.apply")}
          </button>
          <button className="buttonGhost" onClick={onRefresh} type="button">
            {t("common.actions.refresh")}
          </button>
          <button className="button" onClick={onCreateTask} type="button">
            {t("tasks.newTask")}
          </button>
        </div>
      </div>

      {paginationState.kind === "loading" ? (
        <div className={styles.placeholder}>{t("common.states.loading")}</div>
      ) : paginationState.kind === "error" ? (
        <EmptyState description={paginationState.message} title={t("projects.errors.tasks")} tone="error" />
      ) : paginationState.data.items.length ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("tasks.list.title")}</th>
                  <th>{t("tasks.list.status")}</th>
                  <th>{t("tasks.list.priority")}</th>
                  <th>{t("tasks.list.assignee")}</th>
                  <th>{t("tasks.list.milestone")}</th>
                  <th>{t("tasks.list.progress")}</th>
                  <th>{t("tasks.list.estimated")}</th>
                  <th>{t("tasks.list.actual")}</th>
                  <th>{t("tasks.list.due")}</th>
                  <th>{t("tasks.list.updated")}</th>
                  <th>{t("tasks.list.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paginationState.data.items.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <div className={styles.primaryCell}>
                        <button className={styles.linkButtonInline} onClick={() => onOpenTask(task.id)} type="button">
                          {task.title}
                        </button>
                        <span className={styles.secondaryText}>{task.description || t("common.states.none")}</span>
                      </div>
                    </td>
                    <td><StatusBadge kind="task" value={task.status} /></td>
                    <td><PriorityBadge kind="task" value={task.priority} /></td>
                    <td>{getUserLabel(task.assignee, t("common.states.unassigned"))}</td>
                    <td>{task.milestone_name || t("common.states.none")}</td>
                    <td>{task.progress}%</td>
                    <td>{task.estimated_hours || t("common.states.none")}</td>
                    <td>{task.actual_hours || t("common.states.none")}</td>
                    <td>{formatDate(task.due_date, locale, t("common.states.none"))}</td>
                    <td>{formatDateTime(task.updated_at, locale, t("common.states.none"))}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button className={styles.smallButton} onClick={() => onOpenTask(task.id)} type="button">
                          {t("common.actions.open")}
                        </button>
                        {task.can_edit ? (
                          <button className={styles.smallButton} onClick={() => onEditTask(task.id)} type="button">
                            {t("common.actions.edit")}
                          </button>
                        ) : null}
                        {task.can_delete ? (
                          <button className={styles.smallButton} onClick={() => onDeleteTask(task)} type="button">
                            {t("common.actions.delete")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationActions pagination={paginationState.data.pagination} onPageChange={setPage} />
        </>
      ) : (
        <EmptyState
          description={t("tasks.list.emptyDescription")}
          title={t("tasks.list.emptyTitle")}
        />
      )}
    </div>
  );
}

function PaginationActions({
  pagination,
  onPageChange,
}: {
  pagination: PaginatedPayload<unknown>["pagination"];
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations();

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
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          type="button"
        >
          {t("common.pagination.previous")}
        </button>
        <button
          className={styles.smallButton}
          disabled={!pagination.next}
          onClick={() => onPageChange(pagination.page + 1)}
          type="button"
        >
          {t("common.pagination.next")}
        </button>
      </div>
    </div>
  );
}

function resolveSettled<T>(
  result: PromiseSettledResult<T>,
  fallback: string,
): ResourceState<T> {
  if (result.status === "fulfilled") {
    return { kind: "ready", data: result.value };
  }
  return { kind: "error", message: resolveError(result.reason, fallback) };
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

function OverviewTab({
  dashboardState,
  project,
}: {
  dashboardState: ResourceState<ProjectDashboardPayload>;
  project: ProjectDetail | null;
}) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;

  if (dashboardState.kind === "loading") {
    return <div className={styles.placeholder}>{t("common.states.loading")}</div>;
  }
  if (dashboardState.kind === "error") {
    return <EmptyState description={dashboardState.message} title={t("projects.errors.overview")} tone="error" />;
  }

  const dashboard = dashboardState.data;

  return (
    <div className={styles.overviewGrid}>
      <section className={`surface ${styles.sectionPanel}`}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.projectTitle}>{t("projects.detail.summaryTitle")}</h2>
            <p className={styles.secondaryText}>{t("projects.detail.summaryDescription")}</p>
          </div>
        </div>
        <div className={styles.detailGrid}>
          <div className={styles.detailList}>
            <div className={styles.detailRow}>
              <span className={styles.fieldLabel}>{t("projects.detail.stats.owner")}</span>
              <span>{getUserLabel(project?.owner, t("common.states.unassigned"))}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.fieldLabel}>{t("projects.detail.stats.members")}</span>
              <MemberAvatarGroup members={project?.members ?? []} maxVisible={6} />
            </div>
            <div className={styles.detailRow}>
              <span className={styles.fieldLabel}>{t("projects.detail.progressLabel")}</span>
              <span>{project?.progress ?? 0}%</span>
            </div>
          </div>
          <div className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>{t("projects.detail.taskStats.total")}</span>
              <strong className={styles.statValue}>{dashboard.task_counts.total}</strong>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>{t("projects.detail.taskStats.todo")}</span>
              <strong className={styles.statValue}>{dashboard.task_counts.todo}</strong>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>{t("projects.detail.taskStats.in_progress")}</span>
              <strong className={styles.statValue}>{dashboard.task_counts.in_progress}</strong>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>{t("projects.detail.taskStats.blocked")}</span>
              <strong className={styles.statValue}>{dashboard.task_counts.blocked}</strong>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>{t("projects.detail.taskStats.done")}</span>
              <strong className={styles.statValue}>{dashboard.task_counts.done}</strong>
            </article>
          </div>
        </div>
      </section>

      <section className={`surface ${styles.sectionPanel}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.projectTitle}>{t("projects.detail.upcomingTasks")}</h2>
        </div>
        {dashboard.upcoming_tasks.length ? (
          <div className={styles.taskList}>
            {dashboard.upcoming_tasks.map((task) => (
              <div className={styles.listRow} key={task.id}>
                <span className={styles.primaryCell}>
                  <strong>{task.title}</strong>
                  <span className={styles.secondaryText}>
                    {t("tasks.kanban.due", {
                      date: formatDate(task.due_date, locale, t("common.states.none")),
                    })}{" "}
                    | {getUserLabel(task.assignee, t("common.states.unassigned"))}
                  </span>
                </span>
                <StatusBadge kind="task" value={task.status} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.placeholder}>{t("projects.detail.upcomingFallback")}</div>
        )}
      </section>

      <section className={`surface ${styles.sectionPanel}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.projectTitle}>{t("projects.detail.recentActivity")}</h2>
        </div>
        <ActivityTimeline activities={dashboard.recent_activities} />
      </section>
    </div>
  );
}
