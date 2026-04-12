import { proxyProtectedJson } from "@/lib/server-bff";

const UPLOAD_MERGE_TIMEOUT_MS = 10 * 60 * 1000;

export async function POST(
  _request: Request,
  context: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await context.params;
  return proxyProtectedJson(`/api/v1/tools/uploads/${uploadId}/merge/`, {
    method: "POST",
    signal: AbortSignal.timeout(UPLOAD_MERGE_TIMEOUT_MS),
  });
}
