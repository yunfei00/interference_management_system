"use client";

import type { PaginatedPayload } from "@/lib/contracts";
import type {
  PaginatedFetchMessages,
  PaginatedResourceState,
  QueryParams,
} from "@/lib/browser-bff";
import { useBffResource } from "@/lib/use-bff-resource";

export function usePaginatedResource<T>({
  endpoint,
  query,
  enabled,
  messages,
  reloadKey = 0,
}: {
  endpoint: string;
  query: QueryParams;
  enabled: boolean;
  messages: PaginatedFetchMessages;
  reloadKey?: number;
}) {
  return useBffResource<PaginatedPayload<T>>({
    endpoint,
    query,
    enabled,
    messages,
    reloadKey,
  }) as PaginatedResourceState<T>;
}
