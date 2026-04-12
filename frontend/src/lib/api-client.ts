/**
 * 娴忚鍣ㄧ缁熶竴 API 鍏ュ彛锛氭墍鏈夊 Next `/api/*` 鐨勮姹傚簲缁忔妯″潡锛岄伩鍏嶆暎钀界‖缂栫爜 host銆?
 *
 * - 榛樿 `NEXT_PUBLIC_API_BASE_URL` 鐣欑┖锛氫娇鐢ㄧ浉瀵硅矾寰勶紙鎺ㄨ崘锛岃嚜鍔ㄩ殢褰撳墠璁块棶鐨?Host 璧板悓婧愶級銆?
 * - 鑻ヨ缃簡 `NEXT_PUBLIC_API_BASE_URL`锛岄』涓?**Next 搴旂敤鑷韩** 鏍瑰湴鍧€锛堥€氬父涓?:3000锛夛紝
 *   涓嶈濉垚 Django :8000锛堟湰浠撳簱璁よ瘉缁?BFF锛屾祻瑙堝櫒涓嶇洿杩?Django 鐧诲綍鎺ュ彛锛夈€?
 * - 鏈嶅姟绔紙Route Handler锛変唬鐞?Django 浣跨敤 `DJANGO_BASE_URL`锛堜粎鏈嶅姟绔彲璇伙級銆?
 */

import type { ApiEnvelope } from "@/lib/contracts";

export class ApiResponseError<TData = unknown> extends Error {
  status: number;
  code: string;
  data: TData | null;
  rawText: string;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      data?: TData | null;
      rawText?: string;
    },
  ) {
    super(message);
    this.name = "ApiResponseError";
    this.status = options.status;
    this.code = options.code ?? "request_error";
    this.data = options.data ?? null;
    this.rawText = options.rawText ?? "";
  }
}

type EnvelopeLike<T> = Partial<ApiEnvelope<T>>;

export function getBrowserApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
}

/** 瑙ｆ瀽涓哄彂寰€鏈簲鐢?BFF 鐨?URL锛堥粯璁ょ浉瀵硅矾寰?`/api/...`锛夈€?*/
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

export async function readJsonBodySafely<T>(
  response: Response,
): Promise<{ rawText: string; json: T | null }> {
  const rawText = await response.text();
  if (!rawText.trim()) {
    return { rawText, json: null };
  }

  try {
    return {
      rawText,
      json: JSON.parse(rawText) as T,
    };
  } catch {
    return { rawText, json: null };
  }
}

export function extractApiErrorMessage(input: unknown): string | null {
  if (input == null) {
    return null;
  }

  if (typeof input === "string") {
    return input.trim() || null;
  }

  if (Array.isArray(input)) {
    const parts = input
      .map((item) => extractApiErrorMessage(item))
      .filter((item): item is string => Boolean(item));
    return parts.length ? parts.join("; ") : null;
  }

  if (typeof input === "object") {
    const record = input as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }

    if ("data" in record) {
      const nested = extractApiErrorMessage(record.data);
      if (nested) {
        return nested;
      }
    }

    const fieldParts: string[] = [];
    for (const [key, value] of Object.entries(record)) {
      const nested = extractApiErrorMessage(value);
      if (!nested) {
        continue;
      }
      fieldParts.push(key === "detail" ? nested : `${key}: ${nested}`);
    }
    return fieldParts.length ? fieldParts.join(" / ") : null;
  }

  return String(input);
}

export function unwrapApiEnvelope<T>(
  json: unknown,
  response: Response,
): {
  payload: EnvelopeLike<T> | null;
  success: boolean;
  message: string | null;
  data: T | null;
} {
  if (json && typeof json === "object" && "success" in json) {
    const payload = json as EnvelopeLike<T>;
    return {
      payload,
      success: payload.success ?? response.ok,
      message:
        typeof payload.message === "string" && payload.message.trim()
          ? payload.message.trim()
          : null,
      data: (payload.data ?? null) as T | null,
    };
  }

  return {
    payload: null,
    success: response.ok,
    message: null,
    data: (json as T) ?? null,
  };
}

function describeUnexpectedApiResponse(
  response: Response,
  rawText: string,
  fallbackMessage: string,
): string {
  if (response.status === 413) {
    return "上传文件过大，请压缩后重试，或联系管理员调整上传限制。";
  }

  const trimmed = rawText.trim();
  if (trimmed) {
    return trimmed.length > 240 ? `${trimmed.slice(0, 240)}...` : trimmed;
  }

  const contentType = response.headers.get("content-type")?.trim() || "unknown";
  return `${fallbackMessage}（HTTP ${response.status} / ${contentType}）`;
}

export async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string = "请求失败，请稍后重试。",
): Promise<T> {
  const { rawText, json } = await readJsonBodySafely<unknown>(response);
  const { payload, success, message, data } = unwrapApiEnvelope<T>(json, response);

  if (!response.ok || !success) {
    const resolvedMessage =
      message ||
      extractApiErrorMessage(payload?.data ?? json) ||
      describeUnexpectedApiResponse(response, rawText, fallbackMessage);
    throw new ApiResponseError<T>(resolvedMessage, {
      status: response.status,
      code: payload?.code,
      data: (payload?.data ?? data ?? null) as T | null,
      rawText,
    });
  }

  return data as T;
}

/** 寮€鍙戠幆澧冨湪鐧诲綍椤垫墦鍗板綋鍓嶉厤缃紙涓嶆秹鍙婂瘑閽ワ級銆?*/
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
