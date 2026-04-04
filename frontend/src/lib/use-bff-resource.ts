"use client";

import { useEffect, useState } from "react";

import {
  fetchBffResource,
  type BffFetchMessages,
  type QueryParams,
  type ResourceState,
} from "@/lib/browser-bff";

export function useBffResource<T>({
  endpoint,
  query = {},
  enabled,
  messages,
  reloadKey = 0,
}: {
  endpoint: string;
  query?: QueryParams;
  enabled: boolean;
  messages: BffFetchMessages;
  /** 递增则重新请求，不会加入 URL 查询参数 */
  reloadKey?: number;
}) {
  const [resolvedState, setResolvedState] = useState<{
    requestKey: string;
    value: ResourceState<T>;
  }>({
    requestKey: "",
    value: { kind: "loading" },
  });
  const requestKey = JSON.stringify({
    endpoint,
    query,
    messages,
    reloadKey,
  });

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      return () => {
        cancelled = true;
      };
    }

    const request = JSON.parse(requestKey) as {
      endpoint: string;
      query: QueryParams;
      messages: BffFetchMessages;
    };

    async function load() {
      const nextState = await fetchBffResource<T>(
        request.endpoint,
        request.query,
        request.messages,
      );

      if (!cancelled) {
        setResolvedState({
          requestKey,
          value: nextState,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, requestKey]);

  if (!enabled) {
    return { kind: "loading" } satisfies ResourceState<T>;
  }

  if (resolvedState.requestKey !== requestKey) {
    return { kind: "loading" } satisfies ResourceState<T>;
  }

  return resolvedState.value;
}
