"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AdminDepartmentOption,
  AdminUserRow,
  ApiEnvelope,
  UserAuditLogItem,
  UserRole,
  UserStatus,
} from "@/lib/contracts";
import { apiFetch, extractApiErrorMessage } from "@/lib/api-client";
import { ADMIN_USERS_ACCESS } from "@/lib/admin-permissions";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { usePaginatedResource } from "@/lib/use-paginated-resource";

import {
  AuditTable,
  ConfirmModal,
  PaginationRow,
  RejectModal,
  ResetPasswordModal,
  ToastBanner,
  UserDetailDrawer,
  UserFormModal,
  UserTable,
} from "./admin-users-support";
import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./admin-users.module.css";
import pageStyles from "./management-page.module.css";

type ToastState = {
  kind: "success" | "error";
  text: string;
} | null;

const fetchMessages = {
  expired: "Your session has expired. Please sign in again.",
  forbidden: "You do not have permission to access this area.",
  failed: "The request failed. Please try again.",
  network: "The frontend gateway cannot reach the backend right now.",
};

async function parseEnvelope<T>(response: Response) {
  const payload = (await response.json()) as ApiEnvelope<T | null>;
  return payload;
}

function resolveEnvelopeError(payload: ApiEnvelope<unknown> | null, fallback: string) {
  return payload?.message || extractApiErrorMessage(payload?.data) || fallback;
}

export function AdminUsersPage() {
  const { state: session } = useDashboardSession();
  const ready = session.kind === "ready";
  const canUse =
    ready && hasDashboardPermission(session.data.permissions, [...ADMIN_USERS_ACCESS]);
  const isSuperAdmin = ready && session.data.user.role === "super_admin";

  const [tab, setTab] = useState<"pending" | "all" | "audit">("pending");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const [departmentOptions, setDepartmentOptions] = useState<AdminDepartmentOption[]>([]);
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [resetUser, setResetUser] = useState<AdminUserRow | null>(null);
  const [rejectUser, setRejectUser] = useState<AdminUserRow | null>(null);
  const [toggleUser, setToggleUser] = useState<AdminUserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    if (!canUse) {
      return;
    }
    void (async () => {
      const response = await apiFetch("/api/admin/users/department-options", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiEnvelope<AdminDepartmentOption[] | null>;
      if (!cancelled && response.ok && payload.success && payload.data) {
        setDepartmentOptions(payload.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canUse]);

  const userQuery = useMemo(
    () => ({
      page,
      ...(keyword ? { q: keyword } : {}),
      ...(departmentFilter ? { department: departmentFilter } : {}),
      ...(tab === "pending" ? { pending: true } : {}),
      ...(tab !== "pending" && statusFilter ? { status: statusFilter } : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
    }),
    [departmentFilter, keyword, page, roleFilter, statusFilter, tab],
  );

  const auditQuery = useMemo(
    () => ({
      page,
      ...(keyword ? { q: keyword } : {}),
      ...(auditAction ? { action: auditAction } : {}),
    }),
    [auditAction, keyword, page],
  );

  const usersState = usePaginatedResource<AdminUserRow>({
    endpoint: "/api/admin/users",
    query: userQuery,
    enabled: canUse && tab !== "audit",
    messages: fetchMessages,
    reloadKey,
  });

  const auditState = usePaginatedResource<UserAuditLogItem>({
    endpoint: "/api/admin/user-audit-logs",
    query: auditQuery,
    enabled: canUse && tab === "audit",
    messages: fetchMessages,
    reloadKey,
  });

  function refreshCurrentTab() {
    setReloadKey((value) => value + 1);
  }

  function applySearch() {
    setPage(1);
    setKeyword(searchInput.trim());
  }

  async function loadDetail(userId: number) {
    setDetailLoading(true);
    try {
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        cache: "no-store",
      });
      const payload = await parseEnvelope<AdminUserRow>(response);
      if (!response.ok || !payload.success || !payload.data) {
        setToast({
          kind: "error",
          text: resolveEnvelopeError(payload, "Unable to load user details."),
        });
        return;
      }
      setDetailUser(payload.data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function runSimpleAction(
    url: string,
    options: RequestInit,
    successMessage: string,
  ) {
    const response = await apiFetch(url, options);
    const payload = await parseEnvelope<AdminUserRow | { temporary_password?: string }>(response);
    if (!response.ok || !payload.success) {
      throw new Error(resolveEnvelopeError(payload, "Action failed."));
    }
    setToast({ kind: "success", text: successMessage });
    refreshCurrentTab();
    return payload.data;
  }

  return (
    <DepartmentAccessGuard
      description="User administration is only available to approved administrators."
      requiredPermissions={[...ADMIN_USERS_ACCESS]}
      title="Access denied"
    >
      <div className={styles.page}>
        <section className={`surface ${pageStyles.panel}`}>
          <div className={styles.headerRow}>
            <div>
              <div className="eyebrow">Administration</div>
              <h1 className={pageStyles.panelTitle}>User Management</h1>
              <p className={pageStyles.panelText}>
                Review registrations, manage account status, reset passwords, and inspect user audit logs from the same workspace.
              </p>
            </div>
            {tab !== "audit" ? (
              <button
                className="button"
                onClick={() => {
                  setEditingUser(null);
                  setFormMode("create");
                }}
                type="button"
              >
                Create User
              </button>
            ) : null}
          </div>

          <div className={styles.tabRow}>
            <button className={tab === "pending" ? styles.tabActive : styles.tab} onClick={() => { setTab("pending"); setPage(1); }} type="button">Pending Review</button>
            <button className={tab === "all" ? styles.tabActive : styles.tab} onClick={() => { setTab("all"); setPage(1); }} type="button">All Users</button>
            <button className={tab === "audit" ? styles.tabActive : styles.tab} onClick={() => { setTab("audit"); setPage(1); }} type="button">Audit Logs</button>
          </div>

          <div className={styles.toolbar}>
            <label className={styles.toolbarField}>
              <span className={styles.toolbarLabel}>Search</span>
              <input className={styles.inputSm} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applySearch()} placeholder={tab === "audit" ? "Search action, user, or operator" : "Search username, real name, email, or phone"} value={searchInput} />
            </label>

            {tab !== "audit" ? (
              <>
                {tab !== "pending" ? (
                  <label className={styles.toolbarField}>
                    <span className={styles.toolbarLabel}>Status</span>
                    <select className={styles.selectSm} onChange={(event) => { setStatusFilter(event.target.value as UserStatus | ""); setPage(1); }} value={statusFilter}>
                      <option value="">All statuses</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>
                ) : null}
                <label className={styles.toolbarField}>
                  <span className={styles.toolbarLabel}>Role</span>
                  <select className={styles.selectSm} onChange={(event) => { setRoleFilter(event.target.value as UserRole | ""); setPage(1); }} value={roleFilter}>
                    <option value="">All roles</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </label>
                <label className={styles.toolbarField}>
                  <span className={styles.toolbarLabel}>Department</span>
                  <select className={styles.selectSm} onChange={(event) => { setDepartmentFilter(event.target.value); setPage(1); }} value={departmentFilter}>
                    <option value="">All departments</option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.code}>
                        {department.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label className={styles.toolbarField}>
                <span className={styles.toolbarLabel}>Action</span>
                <select className={styles.selectSm} onChange={(event) => { setAuditAction(event.target.value); setPage(1); }} value={auditAction}>
                  <option value="">All actions</option>
                  <option value="register">register</option>
                  <option value="approve">approve</option>
                  <option value="reject">reject</option>
                  <option value="reset_password">reset_password</option>
                  <option value="enable">enable</option>
                  <option value="disable">disable</option>
                  <option value="update_user">update_user</option>
                  <option value="delete_user">delete_user</option>
                </select>
              </label>
            )}

            <button className="buttonGhost" onClick={applySearch} type="button">
              Apply Filters
            </button>
          </div>
        </section>

        {tab === "audit" ? (
          <section className={`surface ${pageStyles.panel}`}>
            <AuditTable state={auditState} />
            <PaginationRow pagination={auditState.kind === "ready" ? auditState.data.pagination : undefined} onNext={() => setPage((value) => value + 1)} onPrev={() => setPage((value) => Math.max(1, value - 1))} />
          </section>
        ) : (
          <section className={`surface ${pageStyles.panel}`}>
            <UserTable
              isSuperAdmin={Boolean(isSuperAdmin)}
              onApprove={async (user) => {
                try {
                  await runSimpleAction(`/api/admin/users/${user.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, `Approved ${user.username}.`);
                } catch (error) {
                  setToast({ kind: "error", text: String(error) });
                }
              }}
              onDelete={(user) => setDeleteUser(user)}
              onDisableToggle={(user) => setToggleUser(user)}
              onEdit={(user) => {
                setEditingUser(user);
                setFormMode("edit");
              }}
              onReject={(user) => setRejectUser(user)}
              onResetPassword={(user) => setResetUser(user)}
              onViewDetail={(user) => void loadDetail(user.id)}
              state={usersState}
              tab={tab}
            />
            <PaginationRow pagination={usersState.kind === "ready" ? usersState.data.pagination : undefined} onNext={() => setPage((value) => value + 1)} onPrev={() => setPage((value) => Math.max(1, value - 1))} />
          </section>
        )}

        {toast ? <ToastBanner toast={toast} /> : null}

        {detailUser || detailLoading ? <UserDetailDrawer loading={detailLoading} onClose={() => setDetailUser(null)} user={detailUser} /> : null}

        {formMode ? <UserFormModal departments={departmentOptions} mode={formMode} onClose={() => { setFormMode(null); setEditingUser(null); }} onSaved={(message) => { setToast({ kind: "success", text: message }); setFormMode(null); setEditingUser(null); refreshCurrentTab(); }} user={editingUser} /> : null}

        {rejectUser ? <RejectModal onClose={() => setRejectUser(null)} onSubmitted={(message) => { setToast({ kind: "success", text: message }); setRejectUser(null); refreshCurrentTab(); }} user={rejectUser} /> : null}

        {resetUser ? <ResetPasswordModal onClose={() => setResetUser(null)} onSubmitted={(message) => { setToast({ kind: "success", text: message }); setResetUser(null); refreshCurrentTab(); }} user={resetUser} /> : null}

        {toggleUser ? (
          <ConfirmModal
            confirmLabel={toggleUser.status === "disabled" ? "Enable User" : "Disable User"}
            description={toggleUser.status === "disabled" ? `Enable ${toggleUser.username} and restore access to the business system.` : `Disable ${toggleUser.username}. They will not be able to sign in until re-enabled.`}
            onClose={() => setToggleUser(null)}
            onConfirm={async () => {
              const endpoint = toggleUser.status === "disabled" ? `/api/admin/users/${toggleUser.id}/enable` : `/api/admin/users/${toggleUser.id}/disable`;
              const successMessage = toggleUser.status === "disabled" ? `Enabled ${toggleUser.username}.` : `Disabled ${toggleUser.username}.`;
              await runSimpleAction(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }, successMessage);
              setToggleUser(null);
            }}
            title={toggleUser.status === "disabled" ? "Enable User" : "Disable User"}
          />
        ) : null}

        {deleteUser ? (
          <ConfirmModal
            confirmLabel="Delete User"
            description={`Soft-delete ${deleteUser.username}. This action is limited to super administrators.`}
            onClose={() => setDeleteUser(null)}
            onConfirm={async () => {
              await runSimpleAction(`/api/admin/users/${deleteUser.id}`, { method: "DELETE" }, `Deleted ${deleteUser.username}.`);
              setDeleteUser(null);
            }}
            title="Delete User"
          />
        ) : null}
      </div>
    </DepartmentAccessGuard>
  );
}
