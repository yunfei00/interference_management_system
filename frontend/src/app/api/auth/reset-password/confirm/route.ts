import { NextResponse } from "next/server";

import { buildEnvelope, confirmPublicPasswordReset } from "@/lib/django";

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
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

  const result = await confirmPublicPasswordReset(body);
  if (!result.ok) {
    return NextResponse.json(
      buildEnvelope(null, {
        success: false,
        code: result.code,
        message: result.message,
      }),
      { status: result.status >= 400 && result.status < 600 ? result.status : 400 },
    );
  }

  return NextResponse.json(
    buildEnvelope(null, {
      message: result.message,
    }),
    { status: 200 },
  );
}
