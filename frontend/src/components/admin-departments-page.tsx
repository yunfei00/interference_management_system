"use client";

import { useMemo, useState } from "react";

import { apiFetch, extractApiErrorMessage } from "@/lib/api-client";
import type { AdminDepartmentRow, ApiEnvelope } from "@/lib/contracts";
import { ADMIN_USERS_ACCESS } from "@/lib/admin-permissions";
import { usePaginatedResource } from "@/lib/use-paginated-resource";

import { DepartmentAccessGuard } from "./department-access-guard";
import styles from "./admin-users.module.css";
import pageStyles from "./management-page.module.css";

const fetchMessages = {
  expired: "Your session has expired. Please sign in again.",
  forbidden: "You do not have permission to access this area.",
  failed: "The request failed. Please try again.",
  network: "The frontend gateway cannot reach the backend right now.",
};

type FormState = {
  name: string;
  code: string;
  page_path: string;
  sort: string;
  is_active: boolean;
};

const defaultForm: FormState = {
  name: "",
  code: "",
  page_path: "",
  sort: "0",
  is_active: true,
};

function getError(payload: ApiEnvelope<unknown> | null, fallback: string) {
  return payload?.message || extractApiErrorMessage(payload?.data) || fallback;
}

export function AdminDepartmentsPage() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const query = useMemo(() => ({ page, ...(keyword ? { q: keyword } : {}) }), [keyword, page]);
  const state = usePaginatedResource<AdminDepartmentRow>({
    endpoint: "/api/admin/departments",
    query,
    enabled: true,
    messages: fetchMessages,
    reloadKey,
  });

  function refresh() {
    setReloadKey((value) => value + 1);
  }

  async function createDepartment() {
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toLowerCase(),
        name: form.name.trim(),
        page_path: form.page_path.trim(),
        sort: Number(form.sort || "0"),
        department_type: "department",
      };
      const response = await apiFetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ApiEnvelope<AdminDepartmentRow | null>;
      if (!response.ok || !body.success) {
        setMessage(getError(body, "Unable to create department."));
        return;
      }
      setForm(defaultForm);
      setMessage(`Department ${payload.name} created.`);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleDepartment(item: AdminDepartmentRow) {
    const response = await apiFetch(`/api/admin/departments/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !item.is_active }),
    });
    const body = (await response.json()) as ApiEnvelope<AdminDepartmentRow | null>;
    if (!response.ok || !body.success) {
      setMessage(getError(body, "Unable to update department."));
      return;
    }
    setMessage(`${item.name} has been ${item.is_active ? "disabled" : "enabled"}.`);
    refresh();
  }

  return (
    <DepartmentAccessGuard
      title="Access denied"
      description="Department administration is only available to approved administrators."
      requiredPermissions={[...ADMIN_USERS_ACCESS]}
    >
      <div className={styles.page}>
        <section className={`surface ${pageStyles.panel}`}>
          <div className={styles.headerRow}>
            <div>
              <div className="eyebrow">Administration</div>
              <h1 className={pageStyles.panelTitle}>Department Management</h1>
            </div>
          </div>
          <div className={styles.toolbar}>
            <label className={styles.toolbarField}>
              <span className={styles.toolbarLabel}>Search</span>
              <input
                className={styles.inputSm}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && setKeyword(searchInput.trim())}
                placeholder="Search name or code"
              />
            </label>
            <button className="buttonGhost" type="button" onClick={() => setKeyword(searchInput.trim())}>
              Apply
            </button>
          </div>
        </section>

        <section className={`surface ${pageStyles.panel}`}>
          <h2 className={pageStyles.panelTitle}>Create Department</h2>
          <div className={styles.toolbar}>
            <input className={styles.inputSm} placeholder="Name" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
            <input className={styles.inputSm} placeholder="Code" value={form.code} onChange={(event) => setForm((value) => ({ ...value, code: event.target.value }))} />
            <input className={styles.inputSm} placeholder="Page path" value={form.page_path} onChange={(event) => setForm((value) => ({ ...value, page_path: event.target.value }))} />
            <input className={styles.inputSm} placeholder="Sort" value={form.sort} onChange={(event) => setForm((value) => ({ ...value, sort: event.target.value }))} />
            <button className="button" type="button" onClick={() => void createDepartment()} disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
          {message ? <p className={pageStyles.panelText}>{message}</p> : null}
        </section>

        <section className={`surface ${pageStyles.panel}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Path</th>
                <th>Sort</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {state.kind === "ready" && state.data.items.length ? (
                state.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.code}</td>
                    <td>{item.page_path || "-"}</td>
                    <td>{item.sort}</td>
                    <td>{item.is_active ? "Active" : "Disabled"}</td>
                    <td>
                      <button className="buttonGhost" type="button" onClick={() => void toggleDepartment(item)}>
                        {item.is_active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>{state.kind === "loading" ? "Loading..." : "No departments found."}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className={styles.paginationRow}>
            <button className="buttonGhost" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))}>
              Prev
            </button>
            <span>Page {page}</span>
            <button className="buttonGhost" type="button" onClick={() => setPage((value) => value + 1)}>
              Next
            </button>
          </div>
        </section>
      </div>
    </DepartmentAccessGuard>
  );
}
