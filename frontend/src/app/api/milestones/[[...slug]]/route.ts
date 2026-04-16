import { proxyProtectedJson } from "@/lib/server-bff";

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
  return `/api/v1/milestones/${suffix}${search}`;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await context.params;
  return proxyProtectedJson(buildBackendPath(request, slug), await buildInit(request));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await context.params;
  return proxyProtectedJson(buildBackendPath(request, slug), await buildInit(request));
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await context.params;
  return proxyProtectedJson(buildBackendPath(request, slug), await buildInit(request));
}
