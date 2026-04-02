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
}: {
  endpoint: string;
  query: QueryParams;
  enabled: boolean;
  messages: PaginatedFetchMessages;
}) {
  return useBffResource<PaginatedPayload<T>>({
    endpoint,
    query,
    enabled,
    messages,
  }) as PaginatedResourceState<T>;
}
