import { NextResponse } from "next/server";

import { buildEnvelope, clearSessionCookies } from "@/lib/django";

export async function POST() {
  const response = NextResponse.json(
    buildEnvelope(null, {
      message: "Signed out successfully.",
    }),
    { status: 200 },
  );

  clearSessionCookies(response);

  return response;
}
