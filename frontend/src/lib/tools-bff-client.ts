import type {
  PaginatedPayload,
  ToolDetailPayload,
  ToolListItem,
} from "@/lib/contracts";
import { apiFetch, readJsonBodySafely, unwrapApiEnvelope } from "@/lib/api-client";
import type { PaginatedResourceState, ResourceState } from "@/lib/browser-bff";
import { defaultFetchMessages } from "@/lib/fetch-messages";

const LIST_ERR = "无法加载工具列表，请稍后重试或联系管理员。";
const DETAIL_ERR = "无法加载工具详情，请刷新后重试或联系管理员。";

export async function fetchToolsList(
  page: number,
  pageSize: number = 10,
  keyword: string = "",
): Promise<PaginatedResourceState<ToolListItem>> {
  const params = new URLSearchParams({
    page: String(Math.max(1, page)),
    page_size: String(Math.max(1, pageSize)),
  });
  if (keyword.trim()) {
    params.set("q", keyword.trim());
  }

  try {
    const response = await apiFetch(`/api/tools?${params}`, { cache: "no-store" });
    const { json } = await readJsonBodySafely<unknown>(response);
    const payload = unwrapApiEnvelope<PaginatedPayload<ToolListItem>>(json, response);

    if (response.status === 401) {
      return { kind: "error", message: defaultFetchMessages.expired };
    }
    if (response.status === 403) {
      return { kind: "error", message: defaultFetchMessages.forbidden };
    }
    if (!payload.success || !payload.data || !Array.isArray(payload.data.items)) {
      return {
        kind: "error",
        message: payload.message?.trim() || LIST_ERR,
      };
    }

    return { kind: "ready", data: payload.data };
  } catch {
    return { kind: "error", message: defaultFetchMessages.network };
  }
}

export async function fetchToolDetail(
  toolId: string,
): Promise<ResourceState<ToolDetailPayload>> {
  try {
    const response = await apiFetch(`/api/tools/${toolId}`, { cache: "no-store" });
    const { json } = await readJsonBodySafely<unknown>(response);
    const payload = unwrapApiEnvelope<ToolDetailPayload>(json, response);

    if (response.status === 401) {
      return { kind: "error", message: defaultFetchMessages.expired };
    }
    if (response.status === 403) {
      return { kind: "error", message: defaultFetchMessages.forbidden };
    }
    if (!payload.success || !payload.data || !Array.isArray(payload.data.versions)) {
      return {
        kind: "error",
        message: payload.message?.trim() || DETAIL_ERR,
      };
    }

    return { kind: "ready", data: payload.data };
  } catch {
    return { kind: "error", message: defaultFetchMessages.network };
  }
}
