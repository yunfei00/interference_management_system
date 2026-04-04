import { NextResponse } from "next/server";

import { buildEnvelope, loginWithPassword, setSessionCookies } from "@/lib/django";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      buildEnvelope(null, {
        success: false,
        code: "invalid_json",
        message: "Request body must be valid JSON.",
      }),
      { status: 400 },
    );
  }

  const username = body.username?.trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return NextResponse.json(
      buildEnvelope(null, {
        success: false,
        code: "missing_credentials",
        message: "Username and password are required.",
      }),
      { status: 400 },
    );
  }

  const result = await loginWithPassword(username, password);
  if (!result.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth][login] Django token 请求失败:", result.code, result.message);
    }
    return NextResponse.json(
      buildEnvelope(null, {
        success: false,
        code: result.code,
        message: result.message,
      }),
      { status: result.status || 401 },
    );
  }

  const response = NextResponse.json(
    buildEnvelope(
      {
        user: result.data.user,
        permissions: result.data.permissions,
        frontend_modes: result.data.frontend_modes,
        menus: [],
      },
      {
        message: "Login successful.",
      },
    ),
    { status: 200 },
  );

  setSessionCookies(response, {
    access: result.data.access,
    refresh: result.data.refresh,
  });

  if (process.env.NODE_ENV === "development") {
    console.info(
      "[auth][login] 成功；已通过 NextResponse.cookies 下发 httpOnly 令牌（绑定当前请求的 Host）。",
    );
  }

  return response;
}
