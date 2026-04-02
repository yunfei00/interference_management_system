"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

import type { ApiEnvelope, SessionPayload } from "@/lib/contracts";

type DashboardSessionState =
  | { kind: "loading" }
  | { kind: "ready"; data: SessionPayload }
  | { kind: "error"; message: string };

type DashboardSessionContextValue = {
  state: DashboardSessionState;
  refreshSession: () => void;
};

const DashboardSessionContext =
  createContext<DashboardSessionContextValue | null>(null);

export function DashboardSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<DashboardSessionState>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const commitReady = useEffectEvent((data: SessionPayload) => {
    setState({ kind: "ready", data });
  });

  const commitError = useEffectEvent((message: string) => {
    setState({ kind: "error", message });
  });

  const redirectToLogin = useEffectEvent(() => {
    const nextPath = pathname || "/dashboard";
    startTransition(() => {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    });
  });

  function refreshSession() {
    setState({ kind: "loading" });
    setReloadKey((value) => value + 1);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/session", {
          cache: "no-store",
        });
        const payload = (await response.json()) as ApiEnvelope<SessionPayload | null>;

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        if (!response.ok || !payload.success || !payload.data) {
          commitError(payload.message || "无法加载当前会话。");
          return;
        }

        commitReady(payload.data);
      } catch {
        if (!cancelled) {
          commitError("前端代理暂时无法连接后端。");
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <DashboardSessionContext.Provider
      value={{
        state,
        refreshSession,
      }}
    >
      {children}
    </DashboardSessionContext.Provider>
  );
}

export function useDashboardSession() {
  const context = useContext(DashboardSessionContext);

  if (!context) {
    throw new Error("useDashboardSession must be used inside DashboardSessionProvider.");
  }

  return context;
}
