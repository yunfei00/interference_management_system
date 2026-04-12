import { proxyProtectedJson } from "@/lib/server-bff";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyProtectedJson(`/api/v1/versions/${id}/set_current/`, {
    method: "POST",
  });
}
