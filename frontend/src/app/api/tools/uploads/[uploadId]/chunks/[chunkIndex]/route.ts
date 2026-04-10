import { proxyProtectedJson } from "@/lib/server-bff";

export async function POST(
  request: Request,
  context: { params: Promise<{ uploadId: string; chunkIndex: string }> },
) {
  const { uploadId, chunkIndex } = await context.params;
  const contentType = request.headers.get("content-type");
  const body = await request.arrayBuffer();
  return proxyProtectedJson(`/api/v1/tools/uploads/${uploadId}/chunks/${chunkIndex}/`, {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
