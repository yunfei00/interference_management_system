import { proxyProtectedJson } from "@/lib/server-bff";

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  return proxyProtectedJson(`/api/v1/tools/${search}`);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type");
  const body = await request.arrayBuffer();
  return proxyProtectedJson("/api/v1/tools/", {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
