import { proxyProtectedJson } from "@/lib/server-bff";

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  return proxyProtectedJson(`/api/v1/hosts/${search}`);
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyProtectedJson("/api/v1/hosts/", {
    method: "POST",
    body,
  });
}
