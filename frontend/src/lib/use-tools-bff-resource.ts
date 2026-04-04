"use client";

import { useCallback, useEffect, useState } from "react";

import type { ToolDetailPayload, ToolListItem } from "@/lib/contracts";
import type {
  PaginatedResourceState,
  QueryParams,
  ResourceState,
} from "@/lib/browser-bff";
import { fetchToolDetail, fetchToolsList } from "@/lib/tools-bff-client";

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
      const next = await fetchToolsList(page, pageSize);
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

/**
 * 工具详情：初始自动拉取；操作成功后请调用 refetch() 重新从后端取数（不依赖 mock / reloadKey）。
 */
export function useToolDetailBffResource({
  toolId,
  enabled,
}: {
  toolId: string;
  enabled: boolean;
}): {
  state: ResourceState<ToolDetailPayload>;
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<ResourceState<ToolDetailPayload>>({
    kind: "loading",
  });
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refetch = useCallback(async () => {
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !toolId) {
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      const next = await fetchToolDetail(toolId);
      if (!cancelled) {
        setState(next);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, toolId, refreshNonce]);

  return {
    state: !enabled || !toolId ? { kind: "loading" } : state,
    refetch,
  };
}
