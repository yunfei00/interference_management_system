import { NextResponse } from "next/server";

import { buildEnvelope, fetchRegistrationDepartments } from "@/lib/django";

export async function GET() {
  const result = await fetchRegistrationDepartments();
  if (!result.ok) {
    return NextResponse.json(
      buildEnvelope(null, {
        success: false,
        code: result.code,
        message: result.message,
      }),
      { status: result.status },
    );
  }

  return NextResponse.json(
    buildEnvelope(result.departments, {
      message: "ok",
    }),
    { status: 200 },
  );
}
