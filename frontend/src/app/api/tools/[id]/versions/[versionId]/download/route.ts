import { proxyProtectedBinary } from "@/lib/server-bff";

/** 大文件经 BFF 流式转发；无超时限制（见 djangoFetch backendTimeoutMs）。部署平台若有函数时长上限需单独调大。 */
export const maxDuration = 3600;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> },
) {
  const { id, versionId } = await context.params;
  return proxyProtectedBinary(
    `/api/v1/tools/${id}/versions/${versionId}/download/`,
  );
}
