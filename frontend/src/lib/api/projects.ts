import type {
  AttachmentItem,
  MilestoneItem,
  PaginatedPayload,
  ProjectActivityItem,
  ProjectDashboardPayload,
  ProjectDetail,
  ProjectListItem,
  ProjectSummaryPayload,
  SubTaskItem,
  TaskDependencyItem,
  TaskDetail,
  TaskListItem,
  UserBrief,
} from "@/lib/contracts";
import { apiFetch, parseApiResponse } from "@/lib/api-client";

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

async function read<T>(path: string, fallback: string) {
  const response = await apiFetch(path, { cache: "no-store" });
  return parseApiResponse<T>(response, fallback);
}

async function write<T>(path: string, init: RequestInit, fallback: string) {
  const response = await apiFetch(path, init);
  return parseApiResponse<T>(response, fallback);
}

export type ProjectWriteInput = {
  name: string;
  description: string;
  status: string;
  priority: string;
  owner: number;
  members: number[];
  start_date: string | null;
  end_date: string | null;
  tags: string[];
};

export type TaskWriteInput = {
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: number | null;
  collaborators: number[];
  milestone: number | null;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: string | null;
  actual_hours: string | null;
  progress: number;
  parent_task?: number | null;
  subtasks: Array<{
    id?: number;
    title: string;
    is_done: boolean;
    sort_order: number;
  }>;
  dependencies: number[];
};

export type MilestoneWriteInput = {
  name: string;
  description: string;
  due_date: string | null;
  status: string;
  sort_order: number;
};

export async function fetchProjects(query: Record<string, QueryValue>) {
  return read<PaginatedPayload<ProjectListItem>>(
    `/api/projects${buildQuery(query)}`,
    "Unable to load the project list.",
  );
}

export async function fetchProjectSummary() {
  return read<ProjectSummaryPayload>(
    "/api/projects/summary",
    "Unable to load the project summary.",
  );
}

export async function fetchProject(id: string | number) {
  return read<ProjectDetail>(
    `/api/projects/${id}`,
    "Unable to load the project detail.",
  );
}

export async function fetchProjectDashboard(id: string | number) {
  return read<ProjectDashboardPayload>(
    `/api/projects/${id}/dashboard`,
    "Unable to load the project dashboard.",
  );
}

export async function fetchProjectTasks(
  projectId: string | number,
  query: Record<string, QueryValue>,
) {
  return read<PaginatedPayload<TaskListItem>>(
    `/api/projects/${projectId}/tasks${buildQuery(query)}`,
    "Unable to load the task list.",
  );
}

export async function fetchTaskDetail(id: string | number) {
  return read<TaskDetail>(
    `/api/tasks/${id}`,
    "Unable to load the task detail.",
  );
}

export async function fetchProjectMilestones(projectId: string | number) {
  return read<MilestoneItem[]>(
    `/api/projects/${projectId}/milestones`,
    "Unable to load milestones.",
  );
}

export async function fetchProjectAttachments(
  projectId: string | number,
  query: Record<string, QueryValue>,
) {
  return read<PaginatedPayload<AttachmentItem>>(
    `/api/projects/${projectId}/attachments${buildQuery(query)}`,
    "Unable to load attachments.",
  );
}

export async function fetchProjectActivities(
  projectId: string | number,
  query: Record<string, QueryValue>,
) {
  return read<PaginatedPayload<ProjectActivityItem>>(
    `/api/projects/${projectId}/activities${buildQuery(query)}`,
    "Unable to load project activity.",
  );
}

export async function fetchProjectMemberOptions(keyword: string) {
  return read<UserBrief[]>(
    `/api/projects/member-options${buildQuery({ q: keyword })}`,
    "Unable to load project members.",
  );
}

export async function createProject(input: ProjectWriteInput) {
  return write<ProjectDetail>(
    "/api/projects",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Unable to create the project.",
  );
}

export async function updateProject(id: string | number, input: Partial<ProjectWriteInput>) {
  return write<ProjectDetail>(
    `/api/projects/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Unable to update the project.",
  );
}

export async function archiveProject(id: string | number) {
  return write<null>(
    `/api/projects/${id}`,
    { method: "DELETE" },
    "Unable to archive the project.",
  );
}

export async function addProjectMembers(
  id: string | number,
  userIds: number[],
) {
  return write<ProjectDetail>(
    `/api/projects/${id}/members`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: userIds }),
    },
    "Unable to add project members.",
  );
}

export async function removeProjectMember(id: string | number, userId: number) {
  return write<ProjectDetail>(
    `/api/projects/${id}/members/${userId}`,
    { method: "DELETE" },
    "Unable to remove the project member.",
  );
}

export async function createTask(projectId: string | number, input: TaskWriteInput) {
  return write<TaskDetail>(
    `/api/projects/${projectId}/tasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Unable to create the task.",
  );
}

export async function updateTask(id: string | number, input: Partial<TaskWriteInput>) {
  return write<TaskDetail>(
    `/api/tasks/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Unable to update the task.",
  );
}

export async function deleteTask(id: string | number) {
  return write<null>(
    `/api/tasks/${id}`,
    { method: "DELETE" },
    "Unable to delete the task.",
  );
}

export async function moveTask(id: string | number, statusValue: string, orderIndex: number) {
  return write<{ task: TaskDetail; column_orders: Record<string, number[]> }>(
    `/api/tasks/${id}/move`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusValue, order_index: orderIndex }),
    },
    "Unable to move the task.",
  );
}

export async function updateTaskProgress(id: string | number, progress: number) {
  return write<TaskDetail>(
    `/api/tasks/${id}/progress`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    },
    "Unable to update task progress.",
  );
}

export async function createTaskSubtask(id: string | number, input: Omit<SubTaskItem, "id" | "created_at" | "updated_at">) {
  return write<SubTaskItem>(
    `/api/tasks/${id}/subtasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Unable to create the subtask.",
  );
}

export async function createTaskDependency(id: string | number, dependsOn: number) {
  return write<TaskDependencyItem>(
    `/api/tasks/${id}/dependencies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depends_on: dependsOn }),
    },
    "Unable to create the dependency.",
  );
}

export async function removeTaskDependency(id: string | number, dependencyId: number) {
  return write<null>(
    `/api/tasks/${id}/dependencies/${dependencyId}`,
    { method: "DELETE" },
    "Unable to remove the dependency.",
  );
}

export async function createMilestone(projectId: string | number, input: MilestoneWriteInput) {
  return write<MilestoneItem>(
    `/api/projects/${projectId}/milestones`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Unable to create the milestone.",
  );
}

export async function updateMilestone(id: string | number, input: Partial<MilestoneWriteInput>) {
  return write<MilestoneItem>(
    `/api/milestones/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Unable to update the milestone.",
  );
}

export async function deleteMilestone(id: string | number) {
  return write<null>(
    `/api/milestones/${id}`,
    { method: "DELETE" },
    "Unable to delete the milestone.",
  );
}

export async function uploadAttachment(
  projectId: string | number,
  file: File,
  taskId?: number | null,
) {
  const formData = new FormData();
  formData.append("file", file);
  if (taskId) {
    formData.append("task", String(taskId));
  }
  return write<AttachmentItem>(
    `/api/projects/${projectId}/attachments`,
    {
      method: "POST",
      body: formData,
    },
    "Unable to upload the attachment.",
  );
}

export async function deleteAttachment(id: string | number) {
  return write<null>(
    `/api/attachments/${id}`,
    { method: "DELETE" },
    "Unable to delete the attachment.",
  );
}
