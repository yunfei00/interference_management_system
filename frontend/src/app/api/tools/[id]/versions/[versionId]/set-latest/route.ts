import { proxyProtectedJson } from "@/lib/server-bff";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> },
) {
  const { id, versionId } = await context.params;
  return proxyProtectedJson(
    `/api/v1/tools/${id}/versions/${versionId}/set_latest/`,
    {
      method: "POST",
    },
  );
}
