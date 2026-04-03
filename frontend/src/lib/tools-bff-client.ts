import type {
  ApiEnvelope,
  PaginatedPayload,
  ToolDetailPayload,
  ToolListItem,
} from "@/lib/contracts";
import { defaultFetchMessages } from "@/lib/fetch-messages";
import type { PaginatedResourceState, ResourceState } from "@/lib/browser-bff";
import {
  buildMockToolDetail,
  buildMockToolsPaginated,
} from "@/lib/tools-mock-payload";

const LOG_PREFIX = "[tools]";

function forceMock(): boolean {
  return process.env.NEXT_PUBLIC_TOOLS_FORCE_MOCK === "1";
}

export async function fetchToolsListWithFallback(
  page: number,
  pageSizeHint: number = 10,
): Promise<PaginatedResourceState<ToolListItem>> {
  if (forceMock()) {
    console.info(`${LOG_PREFIX} using mock data (NEXT_PUBLIC_TOOLS_FORCE_MOCK=1)`);
    return {
      kind: "ready",
      data: buildMockToolsPaginated(page, pageSizeHint),
    };
  }

  const path =
    pageSizeHint && pageSizeHint !== 10
      ? `/api/tools?page=${page}&page_size=${pageSizeHint}`
      : `/api/tools?page=${page}`;

  try {
    const response = await fetch(path, { cache: "no-store" });
    const payload = (await response.json()) as ApiEnvelope<
      PaginatedPayload<ToolListItem> | null
    >;

    if (response.status === 401) {
      console.warn(`${LOG_PREFIX} fallback to mock data (status 401)`);
      return { kind: "ready", data: buildMockToolsPaginated(page, pageSizeHint) };
    }

    if (response.status === 403) {
      console.warn(`${LOG_PREFIX} fallback to mock data (status 403)`);
      return { kind: "ready", data: buildMockToolsPaginated(page, pageSizeHint) };
    }

    if (
      response.ok &&
      payload.success &&
      payload.data &&
      Array.isArray(payload.data.items)
    ) {
      console.info(`${LOG_PREFIX} using backend api`);
      return { kind: "ready", data: payload.data };
    }

    const inferredSize = payload.data?.pagination?.page_size ?? pageSizeHint;

    console.warn(`${LOG_PREFIX} fallback to mock data`, {
      status: response.status,
      message: payload?.message,
    });
    return {
      kind: "ready",
      data: buildMockToolsPaginated(page, inferredSize),
    };
  } catch (error) {
    console.warn(`${LOG_PREFIX} fallback to mock data (network/parse)`, error);
    return {
      kind: "ready",
      data: buildMockToolsPaginated(page, pageSizeHint),
    };
  }
}

export async function fetchToolDetailWithFallback(
  toolId: string,
): Promise<ResourceState<ToolDetailPayload>> {
  if (forceMock()) {
    const data = buildMockToolDetail(toolId);
    if (!data) {
      return { kind: "error", message: "未找到该工具。" };
    }
    console.info(
      `${LOG_PREFIX} detail using mock data (NEXT_PUBLIC_TOOLS_FORCE_MOCK=1)`,
    );
    return { kind: "ready", data };
  }

  try {
    const response = await fetch(`/api/tools/${toolId}`, { cache: "no-store" });
    const payload = (await response.json()) as ApiEnvelope<ToolDetailPayload | null>;

    if (response.status === 401 || response.status === 403) {
      console.warn(
        `${LOG_PREFIX} detail fallback to mock data (status ${response.status})`,
      );
      const data = buildMockToolDetail(toolId);
      return data
        ? { kind: "ready", data }
        : { kind: "error", message: defaultFetchMessages.forbidden };
    }

    if (
      response.ok &&
      payload.success &&
      payload.data &&
      Array.isArray(payload.data.versions)
    ) {
      console.info(`${LOG_PREFIX} detail using backend api`);
      return { kind: "ready", data: payload.data };
    }

    console.warn(`${LOG_PREFIX} detail fallback to mock data`, {
      status: response.status,
      message: payload.message,
    });
    const mock = buildMockToolDetail(toolId);
    return mock
      ? { kind: "ready", data: mock }
      : {
          kind: "error",
          message: payload.message || "未找到该工具。",
        };
  } catch (error) {
    console.warn(`${LOG_PREFIX} detail fallback to mock data (network)`, error);
    const mock = buildMockToolDetail(toolId);
    return mock
      ? { kind: "ready", data: mock }
      : { kind: "error", message: defaultFetchMessages.network };
  }
}
