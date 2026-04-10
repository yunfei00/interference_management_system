import { proxyProtectedJson } from "@/lib/server-bff";
import { normalizeForwardedContentType } from "@/lib/content-type";

export async function POST(
  request: Request,
  context: { params: Promise<{ uploadId: string; chunkIndex: string }> },
) {
  const { uploadId, chunkIndex } = await context.params;
  const contentType = normalizeForwardedContentType(request.headers.get("content-type"));
  const body = await request.arrayBuffer();
  return proxyProtectedJson(`/api/v1/tools/uploads/${uploadId}/chunks/${chunkIndex}/`, {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
