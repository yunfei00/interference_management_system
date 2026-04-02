import { proxyProtectedJson } from "@/lib/server-bff";

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  return proxyProtectedJson(`/api/v1/tools/${search}`);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  return proxyProtectedJson("/api/v1/tools/", {
    method: "POST",
    body: formData,
  });
}
