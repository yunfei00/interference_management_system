"use client";

import { useState } from "react";

import type {
  AdminDepartmentOption,
  AdminUserRow,
  ApiEnvelope,
  PaginatedPayload,
  UserAuditLogItem,
  UserRole,
  UserStatus,
} from "@/lib/contracts";
import { apiFetch, extractApiErrorMessage } from "@/lib/api-client";

import styles from "./admin-users.module.css";
import pageStyles from "./management-page.module.css";

type ToastState = {
  kind: "success" | "error";
  text: string;
};

type UserFormValues = {
  username: string;
  email: string;
  real_name: string;
  phone: string;
  company: string;
  title: string;
  department: string;
  role: UserRole;
  status: UserStatus;
  rejection_reason: string;
  password: string;
  must_change_password: boolean;
};

function defaultCreateValues(): UserFormValues {
  return {
    username: "",
    email: "",
    real_name: "",
    phone: "",
    company: "",
    title: "",
    department: "",
    role: "user",
    status: "approved",
    rejection_reason: "",
    password: "",
    must_change_password: true,
  };
}

function valuesFromUser(user: AdminUserRow): UserFormValues {
  return {
    username: user.username,
    email: user.email || "",
    real_name: user.real_name || "",
    phone: user.phone || "",
    company: user.company || "",
    title: user.title || "",
    department: user.department ? String(user.department) : "",
    role: user.role,
    status: user.status,
    rejection_reason: user.rejection_reason || "",
    password: "",
    must_change_password: user.must_change_password,
  };
}

async function parseEnvelope<T>(response: Response) {
  return (await response.json()) as ApiEnvelope<T | null>;
}

function resolveEnvelopeError(payload: ApiEnvelope<unknown> | null, fallback: string) {
  return payload?.message || extractApiErrorMessage(payload?.data) || fallback;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function roleLabel(role: UserRole): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "User";
}

export function statusLabel(status: UserStatus): string {
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Disabled";
}

export function ToastBanner({ toast }: { toast: ToastState }) {
  return (
    <div
      className={toast.kind === "success" ? styles.toastSuccess : styles.toastError}
      role="status"
    >
      {toast.text}
    </div>
  );
}

export function PaginationRow({
  pagination,
  onPrev,
  onNext,
}: {
  pagination:
    | {
        page: number;
        pages: number;
        count: number;
        next: string | null;
        previous: string | null;
      }
    | undefined;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!pagination) return null;
  return (
    <div className={styles.paginationRow}>
      <span>
        Page {pagination.page} / {pagination.pages || 1} • {pagination.count} records
      </span>
      <div className={styles.actions}>
        <button className="buttonGhost" disabled={!pagination.previous} onClick={onPrev} type="button">Previous</button>
        <button className="buttonGhost" disabled={!pagination.next} onClick={onNext} type="button">Next</button>
      </div>
    </div>
  );
}

export function UserTable({
  state,
  tab,
  isSuperAdmin,
  onViewDetail,
  onEdit,
  onApprove,
  onReject,
  onResetPassword,
  onDisableToggle,
  onDelete,
}: {
  state:
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; data: PaginatedPayload<AdminUserRow> };
  tab: "pending" | "all";
  isSuperAdmin: boolean;
  onViewDetail: (user: AdminUserRow) => void;
  onEdit: (user: AdminUserRow) => void;
  onApprove: (user: AdminUserRow) => void;
  onReject: (user: AdminUserRow) => void;
  onResetPassword: (user: AdminUserRow) => void;
  onDisableToggle: (user: AdminUserRow) => void;
  onDelete: (user: AdminUserRow) => void;
}) {
  if (state.kind === "loading") return <div className={pageStyles.empty}>Loading users...</div>;
  if (state.kind === "error") return <div className={pageStyles.error}>{state.message}</div>;
  if (state.data.items.length === 0) {
    return <div className={pageStyles.empty}>{tab === "pending" ? "No pending registrations right now." : "No users match the current filters."}</div>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>User</th>
            <th>Department</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {state.data.items.map((user) => {
            const canManageSuper = user.role !== "super_admin" || isSuperAdmin;
            return (
              <tr key={user.id}>
                <td>
                  <div className={styles.primaryCell}>
                    <strong>{user.username}</strong>
                    <span className={styles.muted}>{user.real_name || "-"}</span>
                    <span className={styles.muted}>{user.email || "-"}</span>
                  </div>
                </td>
                <td>{user.department_full_name || "-"}</td>
                <td><span className={`${styles.rolePill} ${styles[`role_${user.role}`]}`}>{roleLabel(user.role)}</span></td>
                <td><span className={`${styles.statusPill} ${styles[`status_${user.status}`]}`}>{statusLabel(user.status)}</span></td>
                <td>{formatTime(user.last_login)}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.linkBtn} onClick={() => onViewDetail(user)} type="button">Details</button>
                    {tab === "pending" ? (
                      <>
                        <button className={styles.linkBtn} onClick={() => onApprove(user)} type="button">Approve</button>
                        <button className={styles.linkBtn} onClick={() => onReject(user)} type="button">Reject</button>
                      </>
                    ) : (
                      <>
                        <button className={`${styles.linkBtn} ${!canManageSuper ? styles.linkBtnMuted : ""}`} disabled={!canManageSuper} onClick={() => onEdit(user)} type="button">Edit</button>
                        <button className={`${styles.linkBtn} ${!canManageSuper ? styles.linkBtnMuted : ""}`} disabled={!canManageSuper} onClick={() => onResetPassword(user)} type="button">Reset Password</button>
                        <button className={`${styles.linkBtn} ${!canManageSuper ? styles.linkBtnMuted : ""}`} disabled={!canManageSuper} onClick={() => onDisableToggle(user)} type="button">{user.status === "disabled" ? "Enable" : "Disable"}</button>
                        {isSuperAdmin ? <button className={styles.linkBtnDanger} onClick={() => onDelete(user)} type="button">Delete</button> : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AuditTable({
  state,
}: {
  state:
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; data: PaginatedPayload<UserAuditLogItem> };
}) {
  if (state.kind === "loading") return <div className={pageStyles.empty}>Loading audit logs...</div>;
  if (state.kind === "error") return <div className={pageStyles.error}>{state.message}</div>;
  if (state.data.items.length === 0) return <div className={pageStyles.empty}>No audit logs match the current filters.</div>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Time</th><th>Action</th><th>User</th><th>Operator</th><th>IP</th></tr></thead>
        <tbody>
          {state.data.items.map((item) => (
            <tr key={item.id}>
              <td>{formatTime(item.created_at)}</td>
              <td>{item.action}</td>
              <td>{item.username || "-"}</td>
              <td>{item.operator_username || "-"}</td>
              <td>{item.ip || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className={styles.modalBackdrop} onClick={onClose} role="presentation">
      <div className={`surface ${styles.modalPanel}`} onClick={(event) => event.stopPropagation()} role="dialog">
        {children}
      </div>
    </div>
  );
}

export function UserDetailDrawer({ user, loading, onClose }: { user: AdminUserRow | null; loading: boolean; onClose: () => void }) {
  return (
    <div className={styles.drawerBackdrop} onClick={onClose} role="presentation">
      <aside className={`surface ${styles.drawer}`} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHead}>
          <div><div className="eyebrow">User Detail</div><h2 className={styles.modalTitle}>{loading ? "Loading..." : user?.username || "User Detail"}</h2></div>
          <button className={styles.modalClose} onClick={onClose} type="button">Close</button>
        </div>
        {loading || !user ? <div className={pageStyles.empty}>Loading user detail...</div> : <div className={styles.detailGrid}>
          <DetailItem label="Real Name" value={user.real_name || "-"} />
          <DetailItem label="Email" value={user.email || "-"} />
          <DetailItem label="Phone" value={user.phone || "-"} />
          <DetailItem label="Department" value={user.department_full_name || "-"} />
          <DetailItem label="Role" value={roleLabel(user.role)} />
          <DetailItem label="Status" value={statusLabel(user.status)} />
          <DetailItem label="Last Login" value={formatTime(user.last_login)} />
          <DetailItem label="Last Login IP" value={user.last_login_ip || "-"} />
          <DetailItem label="Approved At" value={formatTime(user.approved_at)} />
          <DetailItem label="Must Change Password" value={user.must_change_password ? "Yes" : "No"} />
          <DetailItem label="Rejection Reason" value={user.rejection_reason || "-"} />
        </div>}
      </aside>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className={styles.detailItem}><span className={styles.detailLabel}>{label}</span><span className={styles.detailValue}>{value}</span></div>;
}

export function UserFormModal({
  mode,
  user,
  departments,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  user: AdminUserRow | null;
  departments: AdminDepartmentOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [values, setValues] = useState<UserFormValues>(
    mode === "edit" && user ? valuesFromUser(user) : defaultCreateValues(),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<Key extends keyof UserFormValues>(key: Key, value: UserFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    if (!values.real_name.trim()) {
      setError("Real name is required.");
      return;
    }
    if (mode === "create" && !values.username.trim()) {
      setError("Username is required.");
      return;
    }

    setSubmitting(true);
    const body: Record<string, unknown> = {
      email: values.email.trim() || null,
      real_name: values.real_name.trim(),
      phone: values.phone.trim(),
      company: values.company.trim(),
      title: values.title.trim(),
      role: values.role,
      status: values.status,
      must_change_password: values.must_change_password,
      rejection_reason: values.rejection_reason.trim(),
      department: values.department ? Number(values.department) : null,
    };
    if (mode === "create") {
      body.username = values.username.trim();
      if (values.password.trim()) {
        body.password = values.password;
      }
    }

    const response = await apiFetch(mode === "create" ? "/api/admin/users" : `/api/admin/users/${user?.id}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await parseEnvelope<AdminUserRow>(response);
    setSubmitting(false);
    if (!response.ok || !payload.success || !payload.data) {
      setError(resolveEnvelopeError(payload, "Unable to save the user."));
      return;
    }

    const temp = payload.data.temporary_password;
    onSaved(temp ? `${mode === "create" ? "User created." : "User updated."} Temporary password: ${temp}` : mode === "create" ? "User created successfully." : "User updated successfully.");
  }

  return (
    <ModalShell onClose={onClose}>
      <div className={styles.modalHead}>
        <div><div className="eyebrow">User Form</div><h2 className={styles.modalTitle}>{mode === "create" ? "Create User" : `Edit ${user?.username}`}</h2></div>
        <button className={styles.modalClose} onClick={onClose} type="button">Close</button>
      </div>
      {error ? <div className={styles.feedbackErr}>{error}</div> : null}
      <div className={styles.formGrid}>
        {mode === "create" ? <label className={pageStyles.field}><span className={pageStyles.label}>Username</span><input className={pageStyles.input} onChange={(event) => updateField("username", event.target.value)} value={values.username} /></label> : null}
        <label className={pageStyles.field}><span className={pageStyles.label}>Real Name</span><input className={pageStyles.input} onChange={(event) => updateField("real_name", event.target.value)} value={values.real_name} /></label>
        <label className={pageStyles.field}><span className={pageStyles.label}>Email</span><input className={pageStyles.input} onChange={(event) => updateField("email", event.target.value)} type="email" value={values.email} /></label>
        <label className={pageStyles.field}><span className={pageStyles.label}>Phone</span><input className={pageStyles.input} onChange={(event) => updateField("phone", event.target.value)} value={values.phone} /></label>
        <label className={pageStyles.field}><span className={pageStyles.label}>Company</span><input className={pageStyles.input} onChange={(event) => updateField("company", event.target.value)} value={values.company} /></label>
        <label className={pageStyles.field}><span className={pageStyles.label}>Title</span><input className={pageStyles.input} onChange={(event) => updateField("title", event.target.value)} value={values.title} /></label>
        <label className={pageStyles.field}><span className={pageStyles.label}>Department</span><select className={pageStyles.select} onChange={(event) => updateField("department", event.target.value)} value={values.department}><option value="">Not assigned</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.full_name}</option>)}</select></label>
        <label className={pageStyles.field}><span className={pageStyles.label}>Role</span><select className={pageStyles.select} onChange={(event) => updateField("role", event.target.value as UserRole)} value={values.role}><option value="user">User</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></label>
        <label className={pageStyles.field}><span className={pageStyles.label}>Status</span><select className={pageStyles.select} onChange={(event) => updateField("status", event.target.value as UserStatus)} value={values.status}><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="disabled">Disabled</option></select></label>
        {values.status === "rejected" ? <label className={pageStyles.field}><span className={pageStyles.label}>Rejection Reason</span><input className={pageStyles.input} onChange={(event) => updateField("rejection_reason", event.target.value)} value={values.rejection_reason} /></label> : null}
        {mode === "create" ? <label className={pageStyles.field}><span className={pageStyles.label}>Temporary Password</span><input className={pageStyles.input} onChange={(event) => updateField("password", event.target.value)} placeholder="Leave blank to auto-generate" type="password" value={values.password} /></label> : null}
        <label className={styles.checkboxRow}><input checked={values.must_change_password} onChange={(event) => updateField("must_change_password", event.target.checked)} type="checkbox" />Force password change on next login</label>
      </div>
      <div className={styles.footerRow}>
        <button className="buttonGhost" onClick={onClose} type="button">Cancel</button>
        <button className="button" disabled={submitting} onClick={handleSubmit} type="button">{submitting ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}</button>
      </div>
    </ModalShell>
  );
}

export function ResetPasswordModal({
  user,
  onClose,
  onSubmitted,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}) {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    const response = await apiFetch(`/api/admin/users/${user.id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = await parseEnvelope<{ temporary_password?: string }>(response);
    setSubmitting(false);
    if (!response.ok || !payload.success || !payload.data) {
      setError(resolveEnvelopeError(payload, "Unable to reset the password."));
      return;
    }
    const password = payload.data.temporary_password || null;
    setTemporaryPassword(password);
    onSubmitted(password ? `Password reset for ${user.username}. Temporary password: ${password}` : `Password reset for ${user.username}.`);
  }

  return (
    <ModalShell onClose={onClose}>
      <div className={styles.modalHead}>
        <h2 className={styles.modalTitle}>Reset Password</h2>
        <button className={styles.modalClose} onClick={onClose} type="button">Close</button>
      </div>
      {error ? <div className={styles.feedbackErr}>{error}</div> : null}
      <p className={styles.helperText}>Confirm the password reset for <strong>{user.username}</strong>. The backend will return a temporary password and force a password change at next login.</p>
      {temporaryPassword ? <div className={styles.feedbackOk}>Temporary password: {temporaryPassword}</div> : null}
      <div className={styles.footerRow}>
        <button className="buttonGhost" onClick={onClose} type="button">Cancel</button>
        <button className="button" disabled={submitting} onClick={handleConfirm} type="button">{submitting ? "Resetting..." : "Confirm Reset"}</button>
      </div>
    </ModalShell>
  );
}

export function ConfirmModal({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (confirmError) {
      setError(String(confirmError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className={styles.modalHead}>
        <h2 className={styles.modalTitle}>{title}</h2>
        <button className={styles.modalClose} onClick={onClose} type="button">Close</button>
      </div>
      {error ? <div className={styles.feedbackErr}>{error}</div> : null}
      <p className={styles.helperText}>{description}</p>
      <div className={styles.footerRow}>
        <button className="buttonGhost" onClick={onClose} type="button">Cancel</button>
        <button className="button" disabled={submitting} onClick={handleConfirm} type="button">{submitting ? "Submitting..." : confirmLabel}</button>
      </div>
    </ModalShell>
  );
}

export function RejectModal({
  user,
  onClose,
  onSubmitted,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const response = await apiFetch(`/api/admin/users/${user.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const payload = await parseEnvelope<AdminUserRow>(response);
    setSubmitting(false);
    if (!response.ok || !payload.success) {
      setError(resolveEnvelopeError(payload, "Unable to reject the user."));
      return;
    }
    onSubmitted(`Rejected ${user.username}.`);
  }

  return (
    <ModalShell onClose={onClose}>
      <div className={styles.modalHead}>
        <h2 className={styles.modalTitle}>Reject User</h2>
        <button className={styles.modalClose} onClick={onClose} type="button">Close</button>
      </div>
      {error ? <div className={styles.feedbackErr}>{error}</div> : null}
      <label className={pageStyles.field}>
        <span className={pageStyles.label}>Rejection Reason</span>
        <input className={pageStyles.input} onChange={(event) => setReason(event.target.value)} value={reason} />
      </label>
      <div className={styles.footerRow}>
        <button className="buttonGhost" onClick={onClose} type="button">Cancel</button>
        <button className="button" disabled={submitting} onClick={handleSubmit} type="button">{submitting ? "Submitting..." : "Submit Rejection"}</button>
      </div>
    </ModalShell>
  );
}
