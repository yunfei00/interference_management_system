import { proxyProtectedBinary, proxyProtectedJson } from "@/lib/server-bff";

async function buildInit(request: Request) {
  const method = request.method;
  if (method === "GET" || method === "HEAD") {
    return { method };
  }
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const body = await request.text();
  return {
    method,
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body: body || undefined,
  };
}

function buildBackendPath(request: Request, slug?: string[]) {
  const search = new URL(request.url).search;
  const suffix = slug?.length ? `${slug.join("/")}/` : "";
  return `/api/v1/attachments/${suffix}${search}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await context.params;
  if (slug?.[slug.length - 1] === "download") {
    return proxyProtectedBinary(buildBackendPath(request, slug));
  }
  return proxyProtectedJson(buildBackendPath(request, slug), await buildInit(request));
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await context.params;
  return proxyProtectedJson(buildBackendPath(request, slug), await buildInit(request));
}
