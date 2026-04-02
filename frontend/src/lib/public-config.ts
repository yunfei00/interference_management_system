export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? "干扰管理平台";

export const DJANGO_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_DJANGO_PUBLIC_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");
