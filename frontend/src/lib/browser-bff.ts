import type { ApiEnvelope, PaginatedPayload } from "@/lib/contracts";

export type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryParamValue>;

export type ResourceState<T> =
  | { kind: "loading" }
  | { kind: "ready"; data: T }
  | { kind: "error"; message: string };

export type BffFetchMessages = {
  expired: string;
  forbidden: string;
  failed: string;
  network: string;
};

export type PaginatedFetchMessages = BffFetchMessages;
export type PaginatedResourceState<T> = ResourceState<PaginatedPayload<T>>;

export async function fetchBffResource<T>(
  endpoint: string,
  query: QueryParams,
  messages: BffFetchMessages,
): Promise<ResourceState<T>> {
  const search = buildSearchParams(query).toString();
  const path = search ? `${endpoint}?${search}` : endpoint;

  try {
    const response = await fetch(path, {
      cache: "no-store",
      credentials: "include",
    });
    const payload = (await response.json()) as ApiEnvelope<T | null>;

    if (response.status === 401) {
      return { kind: "error", message: messages.expired };
    }

    if (response.status === 403) {
      return { kind: "error", message: messages.forbidden };
    }

    if (!response.ok || !payload.success || !payload.data) {
      return {
        kind: "error",
        message: payload.message || messages.failed,
      };
    }

    return {
      kind: "ready",
      data: payload.data,
    };
  } catch {
    return {
      kind: "error",
      message: messages.network,
    };
  }
}

export async function fetchPaginatedBffResource<T>(
  endpoint: string,
  query: QueryParams,
  messages: PaginatedFetchMessages,
): Promise<PaginatedResourceState<T>> {
  return fetchBffResource<PaginatedPayload<T>>(endpoint, query, messages);
}

export function buildSearchParams(query: QueryParams) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  return params;
}
