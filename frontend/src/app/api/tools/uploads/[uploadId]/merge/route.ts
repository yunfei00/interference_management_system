import { proxyProtectedJson } from "@/lib/server-bff";

export async function POST(
  _request: Request,
  context: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await context.params;
  return proxyProtectedJson(`/api/v1/tools/uploads/${uploadId}/merge/`, {
    method: "POST",
  });
}
