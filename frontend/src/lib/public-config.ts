import { getBrowserApiBaseUrl } from "@/lib/api-client";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? "干扰管理平台";

/**
 * 可选：对外可见的 Django 根地址（文档、调试提示），不作为浏览器 API 主路径。
 * 留空表示不在 UI 中展示固定后端 host。
 */
export const DJANGO_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_DJANGO_PUBLIC_URL ?? ""
).replace(/\/$/, "");

export { getBrowserApiBaseUrl };
