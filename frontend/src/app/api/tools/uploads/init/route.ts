import { proxyProtectedJson } from "@/lib/server-bff";

export async function POST(request: Request) {
  const body = await request.json();
  return proxyProtectedJson("/api/v1/tools/uploads/init/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
