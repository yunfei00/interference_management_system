import { proxyProtectedJson } from "@/lib/server-bff";
import { normalizeForwardedContentType } from "@/lib/content-type";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const contentType = normalizeForwardedContentType(request.headers.get("content-type"));
  const body = await request.arrayBuffer();
  return proxyProtectedJson(`/api/v1/tools/${id}/versions/`, {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
