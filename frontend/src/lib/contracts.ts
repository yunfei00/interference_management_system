export type ApiEnvelope<T> = {
  success: boolean;
  code: string;
  message: string;
  data: T;
};

export type BackendCheck = {
  ok: boolean;
  detail: string;
};

export type BackendReadiness = {
  status: string;
  service: string;
  checks?: Record<string, BackendCheck>;
};

export type PaginationMeta = {
  page: number;
  page_size: number;
  count: number;
  pages: number;
  next: string | null;
  previous: string | null;
};

export type PaginatedPayload<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type ProjectPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "delayed";

export type UserBrief = {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  department_full_name: string | null;
  role: UserRole;
};

export type ProjectListItem = {
  id: number;
  name: string;
  code: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  owner: UserBrief | null;
  members: UserBrief[];
  member_count: number;
  task_total: number;
  task_done: number;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  tags: string[];
  updated_at: string;
  created_at: string;
  is_archived: boolean;
  can_edit: boolean;
};

export type ProjectDetail = ProjectListItem & {
  created_by: UserBrief | null;
};

export type MilestoneItem = {
  id: number;
  project: number;
  name: string;
  description: string;
  due_date: string | null;
  status: MilestoneStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SubTaskItem = {
  id: number;
  title: string;
  is_done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TaskBrief = {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: UserBrief | null;
  progress: number;
  due_date: string | null;
  order_index: number;
  milestone_name: string | null;
};

export type TaskDependencyItem = {
  id: number;
  depends_on: TaskBrief;
};

export type AttachmentItem = {
  id: number;
  project: number;
  task: number | null;
  task_title: string | null;
  file_name: string;
  file_size: number;
  uploaded_by: UserBrief | null;
  created_at: string;
};

export type TaskListItem = {
  id: number;
  project: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: UserBrief | null;
  collaborators: UserBrief[];
  start_date: string | null;
  due_date: string | null;
  estimated_hours: string | null;
  actual_hours: string | null;
  progress: number;
  milestone: number | null;
  milestone_name: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  subtask_total: number;
  subtask_done: number;
  can_edit: boolean;
  can_delete: boolean;
};

export type TaskDetail = TaskListItem & {
  project: ProjectListItem;
  parent_task: TaskBrief | null;
  milestone: MilestoneItem | null;
  subtasks: SubTaskItem[];
  dependencies: TaskDependencyItem[];
  attachments: AttachmentItem[];
};

export type ProjectActivityItem = {
  id: number;
  project: number;
  task: number | null;
  task_title: string | null;
  operator: UserBrief | null;
  action_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ProjectDashboardPayload = {
  project: ProjectDetail;
  task_counts: {
    total: number;
    todo: number;
    in_progress: number;
    blocked: number;
    done: number;
  };
  upcoming_tasks: TaskListItem[];
  recent_activities: ProjectActivityItem[];
  recent_tasks: TaskListItem[];
  milestones: MilestoneItem[];
};

export type ProjectSummaryPayload = {
  total_projects: number;
  in_progress_projects: number;
  completed_projects: number;
  my_projects: number;
  my_pending_tasks: number;
  upcoming_tasks: number;
  blocked_tasks: number;
};

export type RegistrationDepartmentOption = {
  id: number;
  code: string;
  full_name: string;
};

export type UserRole = "super_admin" | "admin" | "user";
export type UserStatus = "pending" | "approved" | "rejected" | "disabled";

export type AuthUser = {
  id: number;
  username: string;
  email: string | null;
  real_name: string;
  display_name: string;
  phone: string | null;
  company: string | null;
  title: string;
  department: number | null;
  department_name: string | null;
  department_code: string | null;
  department_full_name: string | null;
  department_page_path: string | null;
  role: UserRole;
  role_name: string;
  status: UserStatus;
  status_name: string;
  approve_status: UserStatus;
  must_change_password: boolean;
  rejection_reason: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
  last_login_ip: string | null;
  last_login_user_agent: string;
  approved_by: number | null;
  approved_at: string | null;
  created_by: number | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  date_joined: string;
};

export type AdminDepartmentOption = {
  id: number;
  code: string;
  full_name: string;
};

export type AdminDepartmentRow = {
  id: number;
  name: string;
  code: string;
  department_type: "division" | "department";
  parent: number | null;
  parent_name: string | null;
  page_path: string;
  sort: number;
  is_active: boolean;
  full_name: string;
};

export type AdminUserRow = {
  id: number;
  username: string;
  email: string | null;
  real_name: string;
  display_name: string;
  phone: string | null;
  company: string | null;
  title: string;
  department: number | null;
  department_name: string | null;
  department_code: string | null;
  department_full_name: string | null;
  role: UserRole;
  role_name: string;
  status: UserStatus;
  status_name: string;
  approve_status: UserStatus;
  must_change_password: boolean;
  rejection_reason: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  approved_by: number | null;
  approved_at: string | null;
  last_login: string | null;
  last_login_ip: string | null;
  created_at: string;
  updated_at: string;
  temporary_password?: string;
};

export type UserAuditLogItem = {
  id: number;
  user: number | null;
  username: string | null;
  action: string;
  operator: number | null;
  operator_username: string | null;
  detail: Record<string, unknown>;
  ip: string | null;
  created_at: string;
};

export type MenuItem = {
  id: number;
  code: string;
  name: string;
  path: string;
  icon: string | null;
  sort: number;
  status: number;
  visible: boolean;
  is_external: boolean;
  permission_key: string | null;
  children: MenuItem[];
};

export type DataFileItem = {
  id: number;
  original_name: string;
  uploaded_at: string;
};

export type MeasurementItem = {
  id: number;
  device_id: string | null;
  timestamp: string | null;
  x: number;
  y: number;
  value: number;
};

export type DatasetItem = {
  id: number;
  name: string;
  description: string | null;
  owner: number;
  owner_username: string;
  created_at: string;
  file_count: number;
  measurement_count: number;
};

export type DatasetDetail = DatasetItem & {
  files: DataFileItem[];
};

export type ToolVersionRow = {
  id: number;
  version: string;
  release_notes: string;
  changelog: string;
  file_name: string;
  file_size: number;
  checksum: string;
  is_current?: boolean;
  is_latest: boolean;
  created_at: string;
  created_by: number | null;
  created_by_username: string | null;
  download_path: string;
  file?: string | null;
};

export type ToolListItem = {
  id: number;
  name: string;
  code: string;
  category: string;
  department: string;
  summary: string;
  detail: string;
  status: string;
  latest_version: string;
  icon: string;
  tags: string;
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
  versions_count: number;
};

export type ToolDetailPayload = ToolListItem & {
  created_by: number | null;
  versions: ToolVersionRow[];
};

export type ToolUploadTarget = "tool_create" | "tool_version";
export type UploadStatus =
  | "waiting"
  | "uploading"
  | "merging"
  | "completed"
  | "failed";

export type ToolUploadInitPayload = {
  filename: string;
  file_size: number;
  chunk_size: number;
  total_chunks: number;
  checksum?: string;
  target: ToolUploadTarget;
  tool_id?: number;
};

export type ToolUploadProgress = {
  upload_id: string;
  status: UploadStatus;
  uploaded_chunks: number[];
  uploaded_chunks_count: number;
  missing_chunks: number[];
  total_chunks: number;
  uploaded_bytes: number;
  file_size: number;
  progress: number;
  filename: string;
  merged_file_path: string;
  error_message: string;
};

export type ToolUploadSession = {
  upload_id: string;
  status: UploadStatus;
  filename: string;
  file_size: number;
  chunk_size: number;
  total_chunks: number;
  uploaded_chunks_count: number;
  uploaded_chunks: number[];
  missing_chunks: number[];
  progress: number;
  error_message: string;
  merged_file_path: string;
  recommended_chunk_size: number;
};

export type ToolVersionBindUploadPayload = {
  upload_id: string;
  version: string;
  release_notes: string;
  changelog: string;
};

export type ToolItem = ToolListItem;

export type HostMetricItem = {
  id: number;
  ts: string;
  mem_total: number;
  mem_used: number;
  gpu: Array<Record<string, unknown>>;
};

export type HostItem = {
  id: number;
  name: string;
  ip: string;
  port: number;
  token: string;
  is_online: boolean;
  last_heartbeat: string | null;
  note: string | null;
  latest_metric: HostMetricItem | null;
};

export type CommandTaskItem = {
  id: number;
  host: number;
  host_name: string;
  command: string;
  payload: Record<string, unknown>;
  status: string;
  result: string | null;
  created_at: string;
  finished_at: string | null;
  operator: string | null;
};

export type AuthMePayload = {
  user: AuthUser;
  permissions: string[];
  frontend_modes: string[];
};

export type TokenPayload = AuthMePayload & {
  access: string;
  refresh: string;
};

export type RefreshPayload = {
  access: string;
  refresh?: string;
};

export type SessionPayload = AuthMePayload & {
  menus: MenuItem[];
};
