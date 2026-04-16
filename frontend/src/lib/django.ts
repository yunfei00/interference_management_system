import "server-only";

import { NextResponse } from "next/server";

import type {
  ApiEnvelope,
  AuthMePayload,
  BackendReadiness,
  MenuItem,
  RefreshPayload,
  RegistrationDepartmentOption,
  SessionPayload,
  TokenPayload,
} from "@/lib/contracts";
import { readJsonBodySafely } from "@/lib/api-client";
import { normalizeForwardedContentType } from "@/lib/content-type";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getDjangoBaseUrl,
  isSecureCookie,
} from "@/lib/server-config";

type BackendEnvelopeResult<T> = {
  response: Response;
  payload: ApiEnvelope<T> | null;
};

type SessionAttempt =
  | { ok: true; data: SessionPayload }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      authFailed: boolean;
    };

type LoginResult =
  | { ok: true; status: number; data: TokenPayload }
  | { ok: false; status: number; code: string; message: string };

type RegisterPublicResult =
  | { ok: true; message: string; username: string }
  | { ok: false; status: number; code: string; message: string };

type GenericPublicResult =
  | { ok: true; message: string }
  | { ok: false; status: number; code: string; message: string };

type RegistrationDepartmentsResult =
  | { ok: true; departments: RegistrationDepartmentOption[] }
  | { ok: false; status: number; code: string; message: string };

type RefreshResult =
  | { ok: true; access: string; refresh?: string }
  | { ok: false; status: number; code: string; message: string };

export type ProtectedBackendResult<T> =
  | {
      ok: true;
      status: number;
      data: T;
      refreshedAccess?: string;
      refreshedRefresh?: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      clearCookies: boolean;
    };

export type ProtectedBackendResponseResult =
  | {
      ok: true;
      status: number;
      response: Response;
      refreshedAccess?: string;
      refreshedRefresh?: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      clearCookies: boolean;
    };

export type SessionResolution =
  | {
      ok: true;
      data: SessionPayload;
      refreshedAccess?: string;
      refreshedRefresh?: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      clearCookies: boolean;
    };

export type BackendHealthResult = {
  ok: boolean;
  status: number;
  code: string;
  message: string;
  data: BackendReadiness | null;
};

const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_ERROR_MESSAGE = "无法连接 Django 后端。";

/** 供 `djangoFetch` 使用：`backendTimeoutMs: false` 表示不套默认超时（大文件下载等流式响应）。 */
export type DjangoBackendFetchOptions = RequestInit & {
  backendTimeoutMs?: number | false;
};
const AUTH_FAILURE_CODES = new Set([
  "authentication_failed",
  "not_authenticated",
  "token_not_valid",
]);

export function buildEnvelope<T>(
  data: T,
  options?: {
    success?: boolean;
    code?: string;
    message?: string;
  },
): ApiEnvelope<T> {
  return {
    success: options?.success ?? true,
    code: options?.code ?? "ok",
    message: options?.message ?? "Request completed successfully.",
    data,
  };
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 0,
  });
}

export function setSessionCookies(
  response: NextResponse,
  tokens: { access: string; refresh?: string },
) {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: tokens.access,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 60 * 60,
  });

  if (tokens.refresh) {
    response.cookies.set({
      name: REFRESH_COOKIE_NAME,
      value: tokens.refresh,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureCookie(),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export async function loginWithPassword(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const { response, payload } = await fetchBackendEnvelope<TokenPayload>(
      "/api/v1/auth/login/",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      },
    );

    if (!response.ok || !payload?.success || !payload.data) {
      return {
        ok: false,
        status: response.status,
        code: payload?.code ?? "login_failed",
        message:
          extractErrorMessage(payload) ??
          describeUnexpectedBackendResponse(response, "登录失败。"),
      };
    }

    return {
      ok: true,
      status: response.status,
      data: payload.data,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "backend_unavailable",
      message: DEFAULT_ERROR_MESSAGE,
    };
  }
}

export async function fetchRegistrationDepartments(): Promise<RegistrationDepartmentsResult> {
  try {
    const { response, payload } = await fetchBackendEnvelope<
      RegistrationDepartmentOption[]
    >("/api/v1/auth/register/departments/", {
      method: "GET",
    });

    if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
      return {
        ok: false,
        status: response.status,
        code: payload?.code ?? "register_options_failed",
        message:
          extractErrorMessage(payload) ??
          describeUnexpectedBackendResponse(
            response,
            "无法加载注册选项。",
          ),
      };
    }

    return { ok: true, departments: payload.data };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "backend_unavailable",
      message: DEFAULT_ERROR_MESSAGE,
    };
  }
}

export async function registerPublicAccount(
  body: Record<string, unknown>,
): Promise<RegisterPublicResult> {
  try {
    const { response, payload } = await fetchBackendEnvelope<{ username: string }>(
      "/api/v1/auth/register/",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    if (!response.ok || !payload?.success || !payload.data) {
      return {
        ok: false,
        status: response.status,
        code: payload?.code ?? "register_failed",
        message:
          extractErrorMessage(payload) ??
          describeUnexpectedBackendResponse(response, "注册失败。"),
      };
    }

    return {
      ok: true,
      message: payload.message,
      username: payload.data.username,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "backend_unavailable",
      message: DEFAULT_ERROR_MESSAGE,
    };
  }
}

export async function requestPublicPasswordReset(
  body: Record<string, unknown>,
): Promise<GenericPublicResult> {
  try {
    const { response, payload } = await fetchBackendEnvelope<null>(
      "/api/v1/auth/forgot-password/",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    if (!response.ok || !payload?.success) {
      return {
        ok: false,
        status: response.status,
        code: payload?.code ?? "forgot_password_failed",
        message:
          extractErrorMessage(payload) ??
          describeUnexpectedBackendResponse(
            response,
            "Unable to request a password reset.",
          ),
      };
    }

    return {
      ok: true,
      message: payload.message,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "backend_unavailable",
      message: DEFAULT_ERROR_MESSAGE,
    };
  }
}

export async function confirmPublicPasswordReset(
  body: Record<string, unknown>,
): Promise<GenericPublicResult> {
  try {
    const { response, payload } = await fetchBackendEnvelope<null>(
      "/api/v1/auth/reset-password/confirm/",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    if (!response.ok || !payload?.success) {
      return {
        ok: false,
        status: response.status,
        code: payload?.code ?? "reset_password_failed",
        message:
          extractErrorMessage(payload) ??
          describeUnexpectedBackendResponse(
            response,
            "Unable to reset the password.",
          ),
      };
    }

    return {
      ok: true,
      message: payload.message,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "backend_unavailable",
      message: DEFAULT_ERROR_MESSAGE,
    };
  }
}

export async function resolveSession(
  accessToken?: string,
  refreshToken?: string,
): Promise<SessionResolution> {
  if (!accessToken && !refreshToken) {
    return {
      ok: false,
      status: 401,
      code: "not_authenticated",
      message: "请先登录。",
      clearCookies: true,
    };
  }

  if (accessToken) {
    const directSession = await fetchSessionAttempt(accessToken);
    if (directSession.ok) {
      return { ok: true, data: directSession.data };
    }
    if (!directSession.authFailed || !refreshToken) {
      return {
        ok: false,
        status: directSession.status,
        code: directSession.code,
        message: directSession.message,
        clearCookies: directSession.authFailed,
      };
    }
  }

  if (!refreshToken) {
    return {
      ok: false,
      status: 401,
      code: "token_not_valid",
      message: "登录已过期，请重新登录。",
      clearCookies: true,
    };
  }

  const refreshResult = await refreshAccessToken(refreshToken);
  if (!refreshResult.ok) {
    return {
      ok: false,
      status: refreshResult.status,
      code: refreshResult.code,
      message: refreshResult.message,
      clearCookies: true,
    };
  }

  const refreshedSession = await fetchSessionAttempt(refreshResult.access);
  if (!refreshedSession.ok) {
    return {
      ok: false,
      status: refreshedSession.status,
      code: refreshedSession.code,
      message: refreshedSession.message,
      clearCookies: refreshedSession.authFailed,
    };
  }

  return {
    ok: true,
    data: refreshedSession.data,
    refreshedAccess: refreshResult.access,
    refreshedRefresh: refreshResult.refresh,
  };
}

export async function fetchBackendReadiness(): Promise<BackendHealthResult> {
  try {
    const response = await djangoFetch("/healthz/ready/");
    const payload = (await parseJsonSafely<BackendReadiness>(
      response,
    )) as BackendReadiness | null;

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        code: "ok",
        message: "Django backend is ready.",
        data: payload,
      };
    }

    return {
      ok: false,
      status: response.status,
      code: payload?.status === "error" ? "backend_unhealthy" : "backend_error",
      message: "Django backend is reachable but not ready.",
      data: payload,
    };
  } catch {
    return {
      ok: false,
      status: 503,
      code: "backend_unavailable",
      message: DEFAULT_ERROR_MESSAGE,
      data: null,
    };
  }
}

export async function fetchProtectedBackendData<T>(
  path: string,
  tokens: {
    accessToken?: string;
    refreshToken?: string;
  },
  init?: DjangoBackendFetchOptions,
): Promise<ProtectedBackendResult<T>> {
  if (!tokens.accessToken && !tokens.refreshToken) {
    return {
      ok: false,
      status: 401,
      code: "not_authenticated",
      message: "请先登录。",
      clearCookies: true,
    };
  }

  if (tokens.accessToken) {
    const directResult = await fetchBackendEnvelope<T>(
      path,
      withAuthorizationHeader(init, tokens.accessToken),
    );

    if (directResult.response.ok && directResult.payload?.success) {
      return {
        ok: true,
        status: directResult.response.status,
        data: directResult.payload.data as T,
      };
    }

    if (
      !isAuthFailure(directResult.response, directResult.payload) ||
      !tokens.refreshToken
    ) {
      return {
        ok: false,
        status: directResult.response.status,
        code: directResult.payload?.code ?? "request_error",
        message:
          extractErrorMessage(directResult.payload) ??
          describeUnexpectedBackendResponse(
            directResult.response,
            "无法获取后端数据，请稍后重试或联系管理员。",
          ),
        clearCookies: isAuthFailure(directResult.response, directResult.payload),
      };
    }
  }

  if (!tokens.refreshToken) {
    return {
      ok: false,
      status: 401,
      code: "token_not_valid",
      message: "登录已过期，请重新登录。",
      clearCookies: true,
    };
  }

  const refreshResult = await refreshAccessToken(tokens.refreshToken);
  if (!refreshResult.ok) {
    return {
      ok: false,
      status: refreshResult.status,
      code: refreshResult.code,
      message: refreshResult.message,
      clearCookies: true,
    };
  }

  const retriedResult = await fetchBackendEnvelope<T>(
    path,
    withAuthorizationHeader(init, refreshResult.access),
  );

  if (retriedResult.response.ok && retriedResult.payload?.success) {
    return {
      ok: true,
      status: retriedResult.response.status,
      data: retriedResult.payload.data as T,
      refreshedAccess: refreshResult.access,
      refreshedRefresh: refreshResult.refresh,
    };
  }

  return {
    ok: false,
    status: retriedResult.response.status,
    code: retriedResult.payload?.code ?? "request_error",
    message:
      extractErrorMessage(retriedResult.payload) ??
      describeUnexpectedBackendResponse(
        retriedResult.response,
        "无法获取后端数据，请稍后重试或联系管理员。",
      ),
    clearCookies: isAuthFailure(retriedResult.response, retriedResult.payload),
  };
}

export async function fetchProtectedBackendResponse(
  path: string,
  tokens: {
    accessToken?: string;
    refreshToken?: string;
  },
  init?: DjangoBackendFetchOptions,
): Promise<ProtectedBackendResponseResult> {
  if (!tokens.accessToken && !tokens.refreshToken) {
    return {
      ok: false,
      status: 401,
      code: "not_authenticated",
      message: "请先登录。",
      clearCookies: true,
    };
  }

  if (tokens.accessToken) {
    const directResponse = await djangoFetch(
      path,
      withAuthorizationHeader(init, tokens.accessToken),
    );
    if (directResponse.ok) {
      return {
        ok: true,
        status: directResponse.status,
        response: directResponse,
      };
    }

    const payload = await parseJsonSafely<ApiEnvelope<unknown>>(directResponse.clone());
    if (!isAuthFailure(directResponse, payload) || !tokens.refreshToken) {
      return {
        ok: false,
        status: directResponse.status,
        code: payload?.code ?? "request_error",
        message:
          extractErrorMessage(payload) ??
          describeUnexpectedBackendResponse(
            directResponse,
            "无法获取后端响应，请稍后重试或联系管理员。",
          ),
        clearCookies: isAuthFailure(directResponse, payload),
      };
    }
  }

  if (!tokens.refreshToken) {
    return {
      ok: false,
      status: 401,
      code: "token_not_valid",
      message: "登录已过期，请重新登录。",
      clearCookies: true,
    };
  }

  const refreshResult = await refreshAccessToken(tokens.refreshToken);
  if (!refreshResult.ok) {
    return {
      ok: false,
      status: refreshResult.status,
      code: refreshResult.code,
      message: refreshResult.message,
      clearCookies: true,
    };
  }

  const retriedResponse = await djangoFetch(
    path,
    withAuthorizationHeader(init, refreshResult.access),
  );
  if (retriedResponse.ok) {
    return {
      ok: true,
      status: retriedResponse.status,
      response: retriedResponse,
      refreshedAccess: refreshResult.access,
      refreshedRefresh: refreshResult.refresh,
    };
  }

  const payload = await parseJsonSafely<ApiEnvelope<unknown>>(retriedResponse.clone());
  return {
    ok: false,
    status: retriedResponse.status,
    code: payload?.code ?? "request_error",
    message:
      extractErrorMessage(payload) ??
      describeUnexpectedBackendResponse(
        retriedResponse,
        "无法获取后端响应，请稍后重试或联系管理员。",
      ),
    clearCookies: isAuthFailure(retriedResponse, payload),
  };
}

async function fetchSessionAttempt(accessToken: string): Promise<SessionAttempt> {
  try {
    const [meResult, menuResult] = await Promise.all([
      fetchBackendEnvelope<AuthMePayload>("/api/v1/auth/me/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      fetchBackendEnvelope<MenuItem[]>("/api/v1/auth/menus/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    ]);

    const meUnauthorized = isAuthFailure(meResult.response, meResult.payload);
    const menuUnauthorized = isAuthFailure(menuResult.response, menuResult.payload);

    if (
      meResult.response.ok &&
      meResult.payload?.success &&
      meResult.payload.data &&
      menuResult.response.ok &&
      menuResult.payload?.success &&
      menuResult.payload.data
    ) {
      return {
        ok: true,
        data: {
          ...meResult.payload.data,
          menus: menuResult.payload.data,
        },
      };
    }

    const primaryStatus = meResult.response.ok
      ? menuResult.response.status
      : meResult.response.status;
    const primaryCode = !meResult.response.ok
      ? meResult.payload?.code ?? "session_load_failed"
      : menuResult.payload?.code ?? "session_load_failed";
    const primaryMessage =
      extractErrorMessage(meResult.payload) ??
      extractErrorMessage(menuResult.payload) ??
      describeUnexpectedBackendResponse(
        meResult.response.ok ? menuResult.response : meResult.response,
        "无法加载当前会话，请重新登录。",
      ) ??
      "无法加载当前会话，请重新登录。";

    return {
      ok: false,
      status: primaryStatus,
      code: primaryCode,
      message: primaryMessage,
      authFailed: meUnauthorized || menuUnauthorized,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "backend_unavailable",
      message: DEFAULT_ERROR_MESSAGE,
      authFailed: false,
    };
  }
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  try {
    const { response, payload } = await fetchBackendEnvelope<RefreshPayload>(
      "/api/v1/auth/token/refresh/",
      {
        method: "POST",
        body: JSON.stringify({ refresh: refreshToken }),
      },
    );

    if (!response.ok || !payload?.success || !payload.data?.access) {
      return {
        ok: false,
        status: response.status,
        code: payload?.code ?? "token_not_valid",
        message:
          extractErrorMessage(payload) ??
          describeUnexpectedBackendResponse(
            response,
            "登录已过期，请重新登录。",
          ) ??
          "登录已过期，请重新登录。",
      };
    }

    return {
      ok: true,
      access: payload.data.access,
      refresh: payload.data.refresh,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "backend_unavailable",
      message: DEFAULT_ERROR_MESSAGE,
    };
  }
}

async function fetchBackendEnvelope<T>(
  path: string,
  init?: RequestInit,
): Promise<BackendEnvelopeResult<T>> {
  const response = await djangoFetch(path, init);
  const payload = await parseJsonSafely<ApiEnvelope<T>>(response.clone());
  return { response, payload };
}

async function djangoFetch(path: string, init?: DjangoBackendFetchOptions) {
  const { backendTimeoutMs, ...fetchInit } = init ?? {};
  const url = new URL(path, `${getDjangoBaseUrl()}/`);
  const headers = new Headers(fetchInit.headers);
  const currentContentType = headers.get("Content-Type") ?? headers.get("content-type");
  const normalizedContentType = normalizeForwardedContentType(currentContentType);
  if (normalizedContentType && normalizedContentType !== currentContentType) {
    headers.set("Content-Type", normalizedContentType);
  }
  // 大文件下载等请求虽不设超时，仍须保持 Accept: application/json。
  // 若改为 */*，DRF 可能走 Browsable API 并返回 HTML，Next 代理会误判为「非 JSON」错误。
  headers.set("Accept", "application/json");
  if (typeof fetchInit.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const timeoutMs =
    backendTimeoutMs === false
      ? null
      : typeof backendTimeoutMs === "number"
        ? backendTimeoutMs
        : REQUEST_TIMEOUT_MS;

  return fetch(url, {
    ...fetchInit,
    headers,
    cache: "no-store",
    redirect: fetchInit.redirect ?? "manual",
    signal:
      fetchInit.signal !== undefined
        ? fetchInit.signal
        : timeoutMs === null
          ? undefined
          : AbortSignal.timeout(timeoutMs),
  });
}

function withAuthorizationHeader(
  init: DjangoBackendFetchOptions | undefined,
  accessToken: string,
): DjangoBackendFetchOptions {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  return {
    ...init,
    headers,
  };
}

async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  const { json } = await readJsonBodySafely<T>(response);
  return json;
}

function isAuthFailure(
  response: Response,
  payload: ApiEnvelope<unknown> | null,
): boolean {
  return response.status === 401 || AUTH_FAILURE_CODES.has(payload?.code ?? "");
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => extractErrorMessage(item))
      .filter(Boolean)
      .join("; ");
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if ("data" in record) {
      const nestedMessage = extractErrorMessage(record.data);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
    for (const value of Object.values(record)) {
      const nestedMessage = extractErrorMessage(value);
      if (nestedMessage) {
        return nestedMessage;
      }
    }
  }

  return null;
}

function describeUnexpectedBackendResponse(
  response: Response,
  fallback: string,
): string {
  if (response.status >= 300 && response.status < 400) {
    return "Django 把 API 请求重定向成了页面响应，请确认 /api/ 已经从登录中间件里放行。";
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html")) {
    return "Django 返回了 HTML 而不是 JSON，请检查后端基础地址和 API 配置。";
  }

  return fallback;
}
