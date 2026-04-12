import type {
  ToolDetailPayload,
  ToolVersionBindUploadPayload,
  ToolVersionRow,
} from "@/lib/contracts";
import {
  ApiResponseError,
  apiFetch,
  apiUrl,
  parseApiResponse,
} from "@/lib/api-client";
import { runChunkedUpload, type UploadState } from "@/lib/tool-upload";

const VERSION_BIND_RECOVERY_TIMEOUT_MS = 30 * 1000;
const VERSION_BIND_RECOVERY_INTERVAL_MS = 1500;

export type ToolSummaryModel = {
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
  tags: string[];
  owner_name: string | null;
  created_at: string;
  updated_at: string;
  versions_count: number;
};

export type ToolVersionModel = {
  id: number;
  version: string;
  release_notes: string;
  changelog: string;
  file_name: string;
  file_size: number;
  checksum: string;
  is_current: boolean;
  created_at: string;
  created_by: number | null;
  created_by_name: string | null;
  download_path: string;
  download_url: string;
};

export type ToolDetailPageModel = {
  tool: ToolSummaryModel;
  versions: ToolVersionModel[];
  current_version: ToolVersionModel | null;
};

export type ToolUpdateInput = {
  name: string;
  code: string;
  category: string;
  department: string;
  summary: string;
  detail: string;
  status: string;
  icon: string;
  tags: string;
};

export type ToolVersionCreateInput = {
  version: string;
  release_notes: string;
  changelog: string;
  file: File | null;
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function splitTags(tags: string | null | undefined): string[] {
  return String(tags ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeVersion(version: ToolVersionRow): ToolVersionModel {
  const download_path = version.download_path || "";
  return {
    id: version.id,
    version: version.version,
    release_notes: version.release_notes,
    changelog: version.changelog,
    file_name: version.file_name,
    file_size: version.file_size,
    checksum: version.checksum,
    is_current: version.is_current ?? version.is_latest,
    created_at: version.created_at,
    created_by: version.created_by,
    created_by_name: version.created_by_username,
    download_path,
    download_url: download_path ? apiUrl(download_path) : "",
  };
}

function normalizeTool(tool: ToolDetailPayload): ToolSummaryModel {
  return {
    id: tool.id,
    name: tool.name,
    code: tool.code,
    category: tool.category,
    department: tool.department,
    summary: tool.summary,
    detail: tool.detail,
    status: tool.status,
    latest_version: tool.latest_version,
    icon: tool.icon,
    tags: splitTags(tool.tags),
    owner_name: tool.created_by_username,
    created_at: tool.created_at,
    updated_at: tool.updated_at,
    versions_count: tool.versions_count,
  };
}

function buildDetailPageModel(
  tool: ToolDetailPayload,
  versions: ToolVersionRow[],
): ToolDetailPageModel {
  const normalizedVersions = versions.map(normalizeVersion);
  return {
    tool: normalizeTool(tool),
    versions: normalizedVersions,
    current_version:
      normalizedVersions.find((row) => row.is_current) ?? normalizedVersions[0] ?? null,
  };
}

function isBackendTimeoutError(error: unknown) {
  if (error instanceof ApiResponseError) {
    return error.status === 504 || error.code === "backend_timeout";
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const normalized = `${error.name} ${error.message}`.toLowerCase();
  return (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("aborted")
  );
}

async function waitForVersionBinding(
  toolId: string,
  versionNumber: string,
  existingVersionIds: Set<number>,
) {
  const deadline = Date.now() + VERSION_BIND_RECOVERY_TIMEOUT_MS;

  while (true) {
    try {
      const versions = await fetchToolVersions(toolId);
      const recovered = versions.find(
        (row) =>
          row.version.trim() === versionNumber.trim() &&
          !existingVersionIds.has(row.id),
      );
      if (recovered) {
        return recovered;
      }
    } catch {
      // Ignore transient polling failures until the deadline is reached.
    }

    if (Date.now() >= deadline) {
      return null;
    }

    await delay(VERSION_BIND_RECOVERY_INTERVAL_MS);
  }
}

export async function fetchToolDetail(toolId: string) {
  const response = await apiFetch(`/api/tools/${toolId}`, { cache: "no-store" });
  return parseApiResponse<ToolDetailPayload>(response);
}

export async function fetchToolVersions(toolId: string) {
  const response = await apiFetch(`/api/tools/${toolId}/versions`, {
    cache: "no-store",
  });
  const data = await parseApiResponse<ToolVersionRow[]>(response);
  return data.map(normalizeVersion);
}

export async function fetchToolDetailPage(toolId: string) {
  const [tool, versions] = await Promise.all([
    fetchToolDetail(toolId),
    apiFetch(`/api/tools/${toolId}/versions`, { cache: "no-store" }).then((response) =>
      parseApiResponse<ToolVersionRow[]>(response),
    ),
  ]);
  return buildDetailPageModel(tool, versions);
}

export async function updateTool(toolId: string, payload: ToolUpdateInput) {
  const response = await apiFetch(`/api/tools/${toolId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseApiResponse<ToolDetailPayload>(response);
  return normalizeTool(data);
}

export async function deleteTool(toolId: string) {
  const response = await apiFetch(`/api/tools/${toolId}`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
}

export async function deleteVersion(versionId: number) {
  const response = await apiFetch(`/api/versions/${versionId}`, {
    method: "DELETE",
  });
  await parseApiResponse(response);
}

export async function setCurrentVersion(versionId: number) {
  const response = await apiFetch(`/api/versions/${versionId}/set_current`, {
    method: "POST",
  });
  const data = await parseApiResponse<ToolVersionRow>(response);
  return normalizeVersion(data);
}

export async function createToolVersion(args: {
  toolId: string;
  values: ToolVersionCreateInput;
  existingVersionIds: Set<number>;
  onUploadState: (state: UploadState) => void;
}) {
  const { toolId, values, existingVersionIds, onUploadState } = args;
  let uploadId = "";

  if (values.file) {
    const uploadResult = await runChunkedUpload({
      file: values.file,
      target: "tool_version",
      toolId: Number(toolId),
      onState: onUploadState,
    });
    uploadId = uploadResult.uploadId;
  }

  if (uploadId) {
    const payload: ToolVersionBindUploadPayload = {
      version: values.version.trim(),
      release_notes: values.release_notes.trim(),
      changelog: values.changelog.trim(),
      upload_id: uploadId,
    };

    try {
      const response = await apiFetch(`/api/tools/${toolId}/versions/bind-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse<ToolVersionRow>(response);
      return normalizeVersion(data);
    } catch (error) {
      if (isBackendTimeoutError(error)) {
        const recovered = await waitForVersionBinding(
          toolId,
          payload.version,
          existingVersionIds,
        );
        if (recovered) {
          return recovered;
        }
      }
      throw error;
    }
  }

  const formData = new FormData();
  formData.append("version", values.version.trim());
  formData.append("release_notes", values.release_notes.trim());
  formData.append("changelog", values.changelog.trim());
  if (values.file) {
    formData.append("file", values.file);
  }

  const response = await apiFetch(`/api/tools/${toolId}/versions`, {
    method: "POST",
    body: formData,
  });
  const data = await parseApiResponse<ToolVersionRow>(response);
  return normalizeVersion(data);
}
