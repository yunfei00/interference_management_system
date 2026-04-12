import { proxyProtectedJson } from "@/lib/server-bff";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.arrayBuffer();
  return proxyProtectedJson(`/api/v1/tools/${id}/versions/bind-upload/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
