import { proxyProtectedBinary } from "@/lib/server-bff";

export const maxDuration = 3600;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyProtectedBinary(`/api/v1/datasets/${id}/heatmap/`);
}
