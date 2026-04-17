import { proxyProtectedJson } from "@/lib/server-bff";

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  return proxyProtectedJson(`/api/v1/admin/departments/${search}`);
}

export async function POST(request: Request) {
  const body = await request.json();
  return proxyProtectedJson("/api/v1/admin/departments/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
