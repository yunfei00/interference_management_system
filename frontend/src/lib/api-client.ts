/**
 * 浏览器端统一 API 入口：所有对 Next `/api/*` 的请求应经此模块，避免散落硬编码 host。
 *
 * - 默认 `NEXT_PUBLIC_API_BASE_URL` 留空：使用相对路径（推荐，自动随当前访问的 Host 走同源）。
 * - 若设置了 `NEXT_PUBLIC_API_BASE_URL`，须为 **Next 应用自身** 根地址（通常为 :3000），
 *   不要填成 Django :8000（本仓库认证经 BFF，浏览器不直连 Django 登录接口）。
 * - 服务端（Route Handler）代理 Django 使用 `DJANGO_BASE_URL`（仅服务端可读）。
 */

export function getBrowserApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

/** 解析为发往本应用 BFF 的 URL（默认相对路径 `/api/...`）。 */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getBrowserApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith("/") ? apiUrl(input) : input;
  if (process.env.NODE_ENV === "development") {
    const parsed = typeof window !== "undefined" ? window.location.origin : "(server)";
    console.info("[api] browser origin:", parsed, "| request:", url, "| credentials: include");
  }
  return fetch(url, {
    credentials: "include",
    ...init,
  });
}

/** 开发环境在登录页打印当前配置（不涉及密钥）。 */
export function logAuthClientConfig(context: string): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }
  console.info(`[auth] ${context}`, {
    browserApiBase: getBrowserApiBaseUrl() || "(empty = same-origin relative /api)",
    windowOrigin: typeof window !== "undefined" ? window.location.origin : "n/a",
    loginUrl: apiUrl("/api/auth/login"),
    sessionUrl: apiUrl("/api/session"),
  });
}
