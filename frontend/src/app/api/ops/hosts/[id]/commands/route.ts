import { proxyProtectedJson } from "@/lib/server-bff";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.text();
  return proxyProtectedJson(`/api/v1/hosts/${id}/commands/`, {
    method: "POST",
    body,
  });
}
