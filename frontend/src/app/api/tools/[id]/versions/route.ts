import { proxyProtectedJson } from "@/lib/server-bff";
import { normalizeForwardedContentType } from "@/lib/content-type";

const BIND_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyProtectedJson(`/api/v1/tools/${id}/versions/`);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const contentType = normalizeForwardedContentType(request.headers.get("content-type"));
  const body = await request.arrayBuffer();
  const targetPath =
    contentType?.includes("application/json")
      ? `/api/v1/tools/${id}/versions/bind-upload/`
      : `/api/v1/tools/${id}/versions/`;
  const init: RequestInit = {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  };
  if (contentType?.includes("application/json")) {
    init.signal = AbortSignal.timeout(BIND_UPLOAD_TIMEOUT_MS);
  }
  return proxyProtectedJson(targetPath, init);
}
