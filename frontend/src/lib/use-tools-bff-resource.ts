"use client";

import { useEffect, useState } from "react";

import type { ToolDetailPayload, ToolListItem } from "@/lib/contracts";
import type {
  PaginatedResourceState,
  QueryParams,
  ResourceState,
} from "@/lib/browser-bff";
import {
  fetchToolDetailWithFallback,
  fetchToolsListWithFallback,
} from "@/lib/tools-bff-client";

const DEFAULT_PAGE_SIZE = 10;

export function useToolsPaginatedResource({
  query,
  enabled,
}: {
  query: QueryParams;
  enabled: boolean;
}): PaginatedResourceState<ToolListItem> {
  const page =
    typeof query.page === "number"
      ? query.page
      : Number.parseInt(String(query.page ?? 1), 10) || 1;
  const pageSize =
    typeof query.page_size === "number"
      ? query.page_size
      : Number.parseInt(String(query.page_size ?? DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE;

  const requestKey = JSON.stringify({ page, pageSize, enabled });

  const [resolvedState, setResolvedState] = useState<{
    requestKey: string;
    value: PaginatedResourceState<ToolListItem>;
  }>({
    requestKey: "",
    value: { kind: "loading" },
  });

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      const next = await fetchToolsListWithFallback(page, pageSize);
      if (!cancelled) {
        setResolvedState({ requestKey, value: next });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, page, pageSize, requestKey]);

  if (!enabled) {
    return { kind: "loading" };
  }

  if (resolvedState.requestKey !== requestKey) {
    return { kind: "loading" };
  }

  return resolvedState.value;
}

export function useToolDetailBffResource({
  toolId,
  enabled,
}: {
  toolId: string;
  enabled: boolean;
}): ResourceState<ToolDetailPayload> {
  const requestKey = JSON.stringify({ toolId, enabled });

  const [resolvedState, setResolvedState] = useState<{
    requestKey: string;
    value: ResourceState<ToolDetailPayload>;
  }>({
    requestKey: "",
    value: { kind: "loading" },
  });

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !toolId) {
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      const next = await fetchToolDetailWithFallback(toolId);
      if (!cancelled) {
        setResolvedState({ requestKey, value: next });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, toolId, requestKey]);

  if (!enabled || !toolId) {
    return { kind: "loading" };
  }

  if (resolvedState.requestKey !== requestKey) {
    return { kind: "loading" };
  }

  return resolvedState.value;
}
