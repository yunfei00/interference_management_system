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

export type RegistrationDepartmentOption = {
  id: number;
  code: string;
  full_name: string;
};

export type AuthUser = {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  department: number | null;
  department_name: string | null;
  department_code: string | null;
  department_full_name: string | null;
  department_page_path: string | null;
  role: number | null;
  role_name: string | null;
  position: number | null;
  position_name: string | null;
  approve_status: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminDepartmentOption = {
  id: number;
  code: string;
  full_name: string;
};

export type AdminUserRow = {
  id: number;
  username: string;
  display_name: string;
  department: number | null;
  department_full_name: string | null;
  role: "user" | "admin" | "superuser";
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  approve_status: string;
  last_login: string | null;
  date_joined: string;
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

/** 工具版本（列表嵌套或详情子表） */
export type ToolVersionRow = {
  id: number;
  version: string;
  release_notes: string;
  changelog: string;
  file_name: string;
  file_size: number;
  checksum: string;
  is_latest: boolean;
  created_at: string;
  created_by: number | null;
  created_by_username: string | null;
  download_path: string;
  /** 后端可读时返回存储路径，可选 */
  file?: string | null;
};

/** 工具仓库列表行 */
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

/** 工具详情（含版本列表） */
export type ToolDetailPayload = ToolListItem & {
  created_by: number | null;
  versions: ToolVersionRow[];
};

export type ToolUploadTarget = "tool_create" | "tool_version";
export type UploadStatus = "waiting" | "uploading" | "merging" | "completed" | "failed";

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
  progress: number;
  error_message: string;
  merged_file_path: string;
  recommended_chunk_size: number;
};

/** @deprecated 请使用 ToolListItem */
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
