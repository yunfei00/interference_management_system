import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildEnvelope,
  clearSessionCookies,
  resolveSession,
  setSessionCookies,
} from "@/lib/django";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getDjangoBaseUrl,
} from "@/lib/server-config";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "development") {
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    console.info("[auth][session] GET /api/session Host:", host, "| Django:", getDjangoBaseUrl());
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  const result = await resolveSession(accessToken, refreshToken);

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

  const response = NextResponse.json(buildEnvelope(result.data), { status: 200 });

  if (result.refreshedAccess || result.refreshedRefresh) {
    setSessionCookies(response, {
      access: result.refreshedAccess ?? accessToken ?? "",
      refresh: result.refreshedRefresh,
    });
  }

  return response;
}
