import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from "@/lib/server-config";
import {
  buildEnvelope,
  clearSessionCookies,
  fetchProtectedBackendData,
  fetchProtectedBackendResponse,
  setSessionCookies,
} from "@/lib/django";

export async function proxyProtectedJson<T>(path: string, init?: RequestInit) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

    const result = await fetchProtectedBackendData<T>(
      path,
      { accessToken, refreshToken },
      init,
    );

    if (!result.ok) {
      const response = NextResponse.json(
        buildEnvelope(null, {
          success: false,
          code: result.code,
          message: result.message,
        }),
        { status: result.status },
      );
      if (result.clearCookies) {
        clearSessionCookies(response);
      }
      return response;
    }

    const response = NextResponse.json(
      buildEnvelope(result.data === undefined ? null : result.data),
      {
        status: result.status,
      },
    );
    applyRefreshedCookies(response, result);
    return response;
  } catch (error) {
    return buildProxyErrorResponse(error);
  }
}

export async function proxyProtectedBinary(path: string, init?: RequestInit) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

    const result = await fetchProtectedBackendResponse(
      path,
      { accessToken, refreshToken },
      init,
    );

    if (!result.ok) {
      const response = NextResponse.json(
        buildEnvelope(null, {
          success: false,
          code: result.code,
          message: result.message,
        }),
        { status: result.status },
      );
      if (result.clearCookies) {
        clearSessionCookies(response);
      }
      return response;
    }

    const headers = new Headers();
    const contentType = result.response.headers.get("content-type");
    const contentDisposition = result.response.headers.get("content-disposition");
    if (contentType) {
      headers.set("content-type", contentType);
    }
    if (contentDisposition) {
      headers.set("content-disposition", contentDisposition);
    }

    const response = new NextResponse(result.response.body, {
      status: result.status,
      headers,
    });
    applyRefreshedCookies(response, result);
    return response;
  } catch (error) {
    return buildProxyErrorResponse(error);
  }
}

function applyRefreshedCookies(
  response: NextResponse,
  result: {
    refreshedAccess?: string;
    refreshedRefresh?: string;
  },
) {
  if (result.refreshedAccess || result.refreshedRefresh) {
    setSessionCookies(response, {
      access: result.refreshedAccess ?? "",
      refresh: result.refreshedRefresh,
    });
  }
}

function buildProxyErrorResponse(error: unknown) {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: unknown }).name ?? "")
      : "";
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";
  const normalized = `${name} ${message}`.toLowerCase();
  const isTimeout =
    name === "TimeoutError" ||
    name === "AbortError" ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("aborted");

  return NextResponse.json(
    buildEnvelope(null, {
      success: false,
      code: isTimeout ? "backend_timeout" : "backend_unavailable",
      message: isTimeout
        ? "后端处理超时，请稍后重试。"
        : "无法连接后端服务，请稍后重试。",
    }),
    { status: isTimeout ? 504 : 502 },
  );
}
