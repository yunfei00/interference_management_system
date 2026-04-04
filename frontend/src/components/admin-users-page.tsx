"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { AdminDepartmentOption, AdminUserRow, ApiEnvelope } from "@/lib/contracts";
import { ADMIN_USERS_ACCESS } from "@/lib/admin-permissions";
import { apiFetch } from "@/lib/api-client";
import { hasDashboardPermission } from "@/lib/dashboard-navigation";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import { usePaginatedResource } from "@/lib/use-paginated-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import { useDashboardSession } from "./dashboard-session-provider";
import a from "./admin-users.module.css";
import styles from "./department-pages.module.css";
import m from "./management-page.module.css";

function roleLabel(r: AdminUserRow["role"]) {
  if (r === "superuser") return "超级管理员";
  if (r === "admin") return "管理员";
  return "普通用户";
}

function rolePillClass(r: AdminUserRow["role"]) {
  if (r === "superuser") return a.roleSuper;
  if (r === "admin") return a.roleAdmin;
  return a.roleUser;
}

export function AdminUsersPage() {
  const { state: session } = useDashboardSession();
  const ready = session.kind === "ready";
  const isSuper = ready && session.data.user.is_superuser;

  const canUse =
    ready && hasDashboardPermission(session.data.permissions, [...ADMIN_USERS_ACCESS]);

  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [active, setActive] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [deptOptions, setDeptOptions] = useState<AdminDepartmentOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<AdminUserRow | null>(null);
  const [resetRow, setResetRow] = useState<AdminUserRow | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const listQuery = useMemo(
    () => ({
      page,
      ...(q ? { q } : {}),
      ...(dept ? { department: dept } : {}),
      ...(active ? { is_active: active } : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
    }),
    [page, q, dept, active, roleFilter],
  );

  const dataState = usePaginatedResource<AdminUserRow>({
    endpoint: "/api/admin/users",
    query: listQuery,
    enabled: canUse,
    reloadKey,
    messages: defaultFetchMessages,
  });

  useEffect(() => {
    let cancelled = false;
    if (!canUse) {
      return;
    }
    void (async () => {
      const res = await apiFetch("/api/admin/users/department-options");
      const payload = (await res.json()) as ApiEnvelope<AdminDepartmentOption[] | null>;
      if (!cancelled && res.ok && payload.success && payload.data) {
        setDeptOptions(payload.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canUse]);

  function applySearch() {
    setPage(1);
    setQ(qInput.trim());
  }

  function bumpList() {
    setReloadKey((k) => k + 1);
  }

  return (
    <DepartmentAccessGuard
      description="用户管理仅对系统管理员开放。"
      requiredPermissions={[...ADMIN_USERS_ACCESS]}
      title="无权访问用户管理"
    >
      <div className={styles.page}>
        <header className={`surface ${m.panel}`}>
          <h1 className={m.panelTitle}>用户管理</h1>
          <p className={m.panelText}>
            维护企业账号：查询、新增、编辑、启用/禁用与密码重置。用户名创建后原则上不在此修改。
          </p>
          {banner ? (
            <div className={banner.kind === "ok" ? a.feedbackOk : a.feedbackErr}>
              {banner.text}
            </div>
          ) : null}
        </header>

        <section className={`surface ${m.panel}`}>
          <div className={a.toolbar}>
            <div className={a.toolbarField} style={{ flex: "1 1 12rem" }}>
              <span className={a.toolbarLabel}>搜索</span>
              <input
                className={a.inputSm}
                onChange={(e) => setQInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="用户名 / 显示名"
                value={qInput}
              />
            </div>
            <div className={a.toolbarField}>
              <span className={a.toolbarLabel}>部门</span>
              <select
                className={a.selectSm}
                onChange={(e) => {
                  setDept(e.target.value);
                  setPage(1);
                }}
                value={dept}
              >
                <option value="">全部</option>
                {deptOptions.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className={a.toolbarField}>
              <span className={a.toolbarLabel}>状态</span>
              <select
                className={a.selectSm}
                onChange={(e) => {
                  setActive(e.target.value);
                  setPage(1);
                }}
                value={active}
              >
                <option value="">全部</option>
                <option value="true">启用</option>
                <option value="false">禁用</option>
              </select>
            </div>
            <div className={a.toolbarField}>
              <span className={a.toolbarLabel}>角色</span>
              <select
                className={a.selectSm}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                value={roleFilter}
              >
                <option value="">全部</option>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
                <option value="superuser">超级管理员</option>
              </select>
            </div>
            <button className="button" onClick={applySearch} type="button">
              查询
            </button>
            <button
              className="buttonGhost"
              onClick={() => setCreateOpen(true)}
              style={{ marginLeft: "auto" }}
              type="button"
            >
              新增用户
            </button>
          </div>

          {dataState.kind === "loading" ? (
            <div className={m.empty}>加载中...</div>
          ) : null}
          {dataState.kind === "error" ? (
            <div className={m.error}>{dataState.message}</div>
          ) : null}

          {dataState.kind === "ready" ? (
            <>
              <div className={a.tableWrap}>
                <table className={a.table}>
                  <thead>
                    <tr>
                      <th>用户名</th>
                      <th>显示名</th>
                      <th>部门</th>
                      <th>角色</th>
                      <th>状态</th>
                      <th>最近登录</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataState.data.items.map((row) => {
                      const canEdit = !row.is_superuser || Boolean(isSuper);
                      return (
                        <tr key={row.id}>
                          <td>{row.username}</td>
                          <td>{row.display_name?.trim() || "—"}</td>
                          <td>{row.department_full_name || "—"}</td>
                          <td>
                            <span className={`${a.rolePill} ${rolePillClass(row.role)}`}>
                              {roleLabel(row.role)}
                            </span>
                          </td>
                          <td>
                            {row.is_active ? (
                              <span className={a.statusOk}>启用</span>
                            ) : (
                              <span className={a.statusOff}>禁用</span>
                            )}
                          </td>
                          <td className={a.muted}>
                            {row.last_login
                              ? new Date(row.last_login).toLocaleString("zh-CN")
                              : "—"}
                          </td>
                          <td>
                            <div className={a.actions}>
                              <button
                                className={`${a.linkBtn} ${!canEdit ? a.linkBtnMuted : ""}`}
                                disabled={!canEdit}
                                onClick={() => canEdit && setEditRow(row)}
                                type="button"
                              >
                                编辑
                              </button>
                              <button
                                className={`${a.linkBtn} ${!canEdit ? a.linkBtnMuted : ""}`}
                                disabled={!canEdit}
                                onClick={() => canEdit && setResetRow(row)}
                                type="button"
                              >
                                重置密码
                              </button>
                              <ToggleActiveButton
                                bumpList={bumpList}
                                canEdit={canEdit}
                                row={row}
                                setBanner={setBanner}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={a.paginationRow}>
                <span>
                  第 {dataState.data.pagination.page} /{" "}
                  {dataState.data.pagination.pages || 1} 页，共{" "}
                  {dataState.data.pagination.count} 人
                </span>
                <button
                  className="buttonGhost"
                  disabled={!dataState.data.pagination.previous}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  type="button"
                >
                  上一页
                </button>
                <button
                  className="buttonGhost"
                  disabled={!dataState.data.pagination.next}
                  onClick={() => setPage((p) => p + 1)}
                  type="button"
                >
                  下一页
                </button>
              </div>
            </>
          ) : null}
        </section>

        {createOpen ? (
          <CreateUserModal
            departments={deptOptions}
            onClose={() => setCreateOpen(false)}
            onSuccess={() => {
              setCreateOpen(false);
              setBanner({ kind: "ok", text: "用户已创建。" });
              bumpList();
            }}
          />
        ) : null}

        {editRow ? (
          <EditUserModal
            departments={deptOptions}
            onClose={() => setEditRow(null)}
            onSuccess={() => {
              setEditRow(null);
              setBanner({ kind: "ok", text: "已保存。" });
              bumpList();
            }}
            row={editRow}
          />
        ) : null}

        {resetRow ? (
          <ResetPasswordModal
            onClose={() => setResetRow(null)}
            onSuccess={() => {
              setResetRow(null);
              setBanner({ kind: "ok", text: "密码已重置。" });
            }}
            row={resetRow}
          />
        ) : null}
      </div>
    </DepartmentAccessGuard>
  );
}

function ToggleActiveButton({
  row,
  canEdit,
  bumpList,
  setBanner,
}: {
  row: AdminUserRow;
  canEdit: boolean;
  bumpList: () => void;
  setBanner: (b: { kind: "ok" | "err"; text: string } | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const nextActive = !row.is_active;
  const label = row.is_active ? "禁用" : "启用";

  return (
    <button
      className={`${a.linkBtn} ${!canEdit ? a.linkBtnMuted : ""}`}
      disabled={!canEdit || pending}
      onClick={() =>
        startTransition(async () => {
          if (
            !window.confirm(
              nextActive
                ? `确定启用用户「${row.username}」？`
                : `确定禁用用户「${row.username}」？禁用后无法登录。`,
            )
          ) {
            return;
          }
          const res = await apiFetch(`/api/admin/users/${row.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: nextActive }),
          });
          const payload = (await res.json()) as ApiEnvelope<unknown>;
          if (!res.ok || !payload.success) {
            setBanner({ kind: "err", text: payload.message || "操作失败" });
            return;
          }
          setBanner({ kind: "ok", text: nextActive ? "已启用。" : "已禁用。" });
          bumpList();
        })
      }
      type="button"
    >
      {pending ? "…" : label}
    </button>
  );
}

function CreateUserModal({
  departments,
  onClose,
  onSuccess,
}: {
  departments: AdminDepartmentOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={a.modalBackdrop}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className={`surface ${a.modalPanel}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className={a.modalHead}>
          <h2 className={a.modalTitle}>新增用户</h2>
          <button className={a.modalClose} onClick={onClose} type="button">
            关闭
          </button>
        </div>
        {err ? <div className={a.feedbackErr}>{err}</div> : null}
        <div className={a.formGrid}>
          <label className={m.field}>
            <span className={m.label}>用户名</span>
            <input
              className={m.input}
              onChange={(e) => setUsername(e.target.value)}
              value={username}
            />
          </label>
          <label className={m.field}>
            <span className={m.label}>初始密码</span>
            <input
              autoComplete="new-password"
              className={m.input}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              value={password}
            />
          </label>
          <label className={m.field}>
            <span className={m.label}>显示名</span>
            <input
              className={m.input}
              onChange={(e) => setDisplayName(e.target.value)}
              value={displayName}
            />
          </label>
          <label className={m.field}>
            <span className={m.label}>部门</span>
            <select
              className={m.select}
              onChange={(e) =>
                setDepartmentId(e.target.value ? Number(e.target.value) : "")
              }
              value={departmentId === "" ? "" : String(departmentId)}
            >
              <option value="">未分配</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className={m.field}>
            <span className={m.label}>角色</span>
            <select
              className={m.select}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              value={role}
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </label>
          <label className={m.field}>
            <span className={m.label}>状态</span>
            <select
              className={m.select}
              onChange={(e) => setIsActive(e.target.value === "true")}
              value={isActive ? "true" : "false"}
            >
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </label>
        </div>
        <div className={a.footerRow}>
          <button className="buttonGhost" onClick={onClose} type="button">
            取消
          </button>
          <button
            className="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setErr(null);
                const body: Record<string, unknown> = {
                  username: username.trim(),
                  password,
                  display_name: displayName.trim(),
                  role,
                  is_active: isActive,
                };
                if (departmentId !== "") {
                  body.department = departmentId;
                }
                const res = await apiFetch("/api/admin/users", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                const payload = (await res.json()) as ApiEnvelope<unknown>;
                if (!res.ok || !payload.success) {
                  setErr(payload.message || "创建失败");
                  return;
                }
                onSuccess();
              })
            }
            type="button"
          >
            {pending ? "提交中…" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({
  row,
  departments,
  onClose,
  onSuccess,
}: {
  row: AdminUserRow;
  departments: AdminDepartmentOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [displayName, setDisplayName] = useState(row.display_name ?? "");
  const [departmentId, setDepartmentId] = useState<number | "">(
    row.department ?? "",
  );
  const [role, setRole] = useState<"user" | "admin">(
    row.role === "admin" || row.role === "superuser" ? "admin" : "user",
  );
  const [isActive, setIsActive] = useState(row.is_active);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className={a.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={`surface ${a.modalPanel}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className={a.modalHead}>
          <h2 className={a.modalTitle}>编辑用户 · {row.username}</h2>
          <button className={a.modalClose} onClick={onClose} type="button">
            关闭
          </button>
        </div>
        {err ? <div className={a.feedbackErr}>{err}</div> : null}
        <div className={a.formGrid}>
          <label className={m.field}>
            <span className={m.label}>显示名</span>
            <input
              className={m.input}
              onChange={(e) => setDisplayName(e.target.value)}
              value={displayName}
            />
          </label>
          <label className={m.field}>
            <span className={m.label}>部门</span>
            <select
              className={m.select}
              onChange={(e) =>
                setDepartmentId(e.target.value ? Number(e.target.value) : "")
              }
              value={departmentId === "" ? "" : String(departmentId)}
            >
              <option value="">未分配</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </label>
          {row.role !== "superuser" ? (
            <label className={m.field}>
              <span className={m.label}>角色</span>
              <select
                className={m.select}
                onChange={(e) => setRole(e.target.value as "user" | "admin")}
                value={role}
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </label>
          ) : (
            <p className={a.muted}>超级管理员角色不可在此修改。</p>
          )}
          <label className={m.field}>
            <span className={m.label}>状态</span>
            <select
              className={m.select}
              onChange={(e) => setIsActive(e.target.value === "true")}
              value={isActive ? "true" : "false"}
            >
              <option value="true">启用</option>
              <option value="false">禁用</option>
            </select>
          </label>
        </div>
        <div className={a.footerRow}>
          <button className="buttonGhost" onClick={onClose} type="button">
            取消
          </button>
          <button
            className="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setErr(null);
                const body: Record<string, unknown> = {
                  display_name: displayName.trim(),
                  is_active: isActive,
                  department: departmentId === "" ? null : departmentId,
                };
                if (row.role !== "superuser") {
                  body.role = role;
                }
                const res = await apiFetch(`/api/admin/users/${row.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                const payload = (await res.json()) as ApiEnvelope<unknown>;
                if (!res.ok || !payload.success) {
                  setErr(payload.message || "保存失败");
                  return;
                }
                onSuccess();
              })
            }
            type="button"
          >
            {pending ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  row,
  onClose,
  onSuccess,
}: {
  row: AdminUserRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className={a.modalBackdrop} onClick={onClose} role="presentation">
      <div
        className={`surface ${a.modalPanel}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className={a.modalHead}>
          <h2 className={a.modalTitle}>重置密码 · {row.username}</h2>
          <button className={a.modalClose} onClick={onClose} type="button">
            关闭
          </button>
        </div>
        {err ? <div className={a.feedbackErr}>{err}</div> : null}
        <div className={a.formGrid}>
          <label className={m.field}>
            <span className={m.label}>新密码</span>
            <input
              autoComplete="new-password"
              className={m.input}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              value={password}
            />
          </label>
          <label className={m.field}>
            <span className={m.label}>确认新密码</span>
            <input
              autoComplete="new-password"
              className={m.input}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              value={confirm}
            />
          </label>
        </div>
        <div className={a.footerRow}>
          <button className="buttonGhost" onClick={onClose} type="button">
            取消
          </button>
          <button
            className="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setErr(null);
                const res = await apiFetch(
                  `/api/admin/users/${row.id}/reset-password`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password, confirm_password: confirm }),
                  },
                );
                const payload = (await res.json()) as ApiEnvelope<unknown>;
                if (!res.ok || !payload.success) {
                  setErr(payload.message || "重置失败");
                  return;
                }
                onSuccess();
              })
            }
            type="button"
          >
            {pending ? "提交中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
