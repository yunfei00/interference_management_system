import "server-only";

export const ACCESS_COOKIE_NAME = "dnb_access_token";
export const REFRESH_COOKIE_NAME = "dnb_refresh_token";

export function getDjangoBaseUrl() {
  return (process.env.DJANGO_BASE_URL ?? "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );
}

export function isSecureCookie() {
  return process.env.NODE_ENV === "production";
}
