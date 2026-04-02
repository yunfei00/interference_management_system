import { NextResponse } from "next/server";

import { buildEnvelope, fetchBackendReadiness } from "@/lib/django";

export async function GET() {
  const result = await fetchBackendReadiness();

  return NextResponse.json(
    buildEnvelope(result.data, {
      success: result.ok,
      code: result.code,
      message: result.message,
    }),
    {
      status: result.status,
    },
  );
}
