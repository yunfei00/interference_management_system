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

export type ToolItem = {
  id: number;
  name: string;
  version: string;
  description: string;
  file: string;
  filename: string;
  download_path: string;
  uploaded_by: number | null;
  uploaded_by_username: string | null;
  uploaded_at: string;
};

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
