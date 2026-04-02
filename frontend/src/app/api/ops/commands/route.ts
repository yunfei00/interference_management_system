import { proxyProtectedJson } from "@/lib/server-bff";

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  return proxyProtectedJson(`/api/v1/commands/${search}`);
}
