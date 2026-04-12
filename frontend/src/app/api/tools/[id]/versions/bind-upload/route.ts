import { proxyProtectedJson } from "@/lib/server-bff";

const BIND_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

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
    signal: AbortSignal.timeout(BIND_UPLOAD_TIMEOUT_MS),
  });
}
