import { proxyProtectedJson } from "@/lib/server-bff";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const search = new URL(request.url).search;
  return proxyProtectedJson(`/api/v1/datasets/${id}/measurements/${search}`);
}
