import "server-only";

export const ACCESS_COOKIE_NAME = "dnb_access_token";
export const REFRESH_COOKIE_NAME = "dnb_refresh_token";

/**
 * Next 服务端连接 Django 的唯一配置来源：环境变量 DJANGO_BASE_URL。
 * 未设置时仅在非生产环境回退到 localhost（避免生产静默连错环境），
 * 局域网调试可在 .env 中显式设为 http://127.0.0.1:8000 或 http://<本机LAN IP>:8000。
 */
export function getDjangoBaseUrl(): string {
  const configured = process.env.DJANGO_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DJANGO_BASE_URL must be set in production.");
  }
  return "http://127.0.0.1:8000".replace(/\/$/, "");
}

export function isSecureCookie() {
  return process.env.NODE_ENV === "production";
}
