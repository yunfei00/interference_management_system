import { proxyProtectedJson } from "@/lib/server-bff";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const formData = await request.formData();
  return proxyProtectedJson(`/api/v1/datasets/${id}/upload/`, {
    method: "POST",
    body: formData,
  });
}
