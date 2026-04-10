import { apiFetch } from "@/lib/api-client";
import type {
  ApiEnvelope,
  ToolUploadInitPayload,
  ToolUploadProgress,
  ToolUploadSession,
  ToolUploadTarget,
} from "@/lib/contracts";

export type UploadUiStatus =
  | "waiting"
  | "preparing"
  | "uploading"
  | "merging"
  | "completed"
  | "failed";

export type UploadState = {
  status: UploadUiStatus;
  uploadId: string | null;
  uploadedChunks: number;
  totalChunks: number;
  progress: number;
  error: string | null;
};

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

async function parseApi<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "请求失败");
  }
  return payload.data;
}

async function initUpload(payload: ToolUploadInitPayload): Promise<ToolUploadSession> {
  const response = await apiFetch("/api/tools/uploads/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseApi<ToolUploadSession>(response);
}

async function getUploadStatus(uploadId: string): Promise<ToolUploadProgress> {
  const response = await apiFetch(`/api/tools/uploads/${uploadId}/status`);
  return parseApi<ToolUploadProgress>(response);
}

async function uploadChunk(uploadId: string, chunkIndex: number, chunk: Blob): Promise<void> {
  const formData = new FormData();
  formData.append("chunk", chunk, `chunk_${chunkIndex}.part`);
  const response = await apiFetch(`/api/tools/uploads/${uploadId}/chunks/${chunkIndex}`, {
    method: "POST",
    body: formData,
  });
  await parseApi(response);
}

async function mergeUpload(uploadId: string): Promise<ToolUploadProgress> {
  const response = await apiFetch(`/api/tools/uploads/${uploadId}/merge`, { method: "POST" });
  return parseApi<ToolUploadProgress>(response);
}

export async function runChunkedUpload(params: {
  file: File;
  target: ToolUploadTarget;
  toolId?: number;
  chunkSize?: number;
  concurrency?: number;
  retry?: number;
  onState: (state: UploadState) => void;
}): Promise<{ uploadId: string }> {
  const {
    file,
    target,
    toolId,
    chunkSize = DEFAULT_CHUNK_SIZE,
    concurrency = 3,
    retry = 2,
    onState,
  } = params;
  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

  onState({
    status: "preparing",
    uploadId: null,
    uploadedChunks: 0,
    totalChunks,
    progress: 0,
    error: null,
  });

  const session = await initUpload({
    filename: file.name,
    file_size: file.size,
    chunk_size: chunkSize,
    total_chunks: totalChunks,
    target,
    tool_id: toolId,
  });

  const uploadId = session.upload_id;
  const status = await getUploadStatus(uploadId);
  const done = new Set<number>(status.uploaded_chunks ?? []);

  function emit(currentStatus: UploadUiStatus, err: string | null = null) {
    const progress = Math.min((done.size / totalChunks) * 100, 100);
    onState({
      status: currentStatus,
      uploadId,
      uploadedChunks: done.size,
      totalChunks,
      progress,
      error: err,
    });
  }

  emit("uploading");

  const pending: number[] = [];
  for (let i = 0; i < totalChunks; i += 1) {
    if (!done.has(i)) pending.push(i);
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, pending.length || 1) }).map(
    async () => {
      while (cursor < pending.length) {
        const current = pending[cursor++];
        const start = current * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const blob = file.slice(start, end);

        let lastErr: Error | null = null;
        for (let attempt = 0; attempt <= retry; attempt += 1) {
          try {
            await uploadChunk(uploadId, current, blob);
            done.add(current);
            emit("uploading");
            lastErr = null;
            break;
          } catch (error) {
            lastErr = error instanceof Error ? error : new Error("分片上传失败");
          }
        }
        if (lastErr) {
          throw lastErr;
        }
      }
    },
  );

  try {
    await Promise.all(workers);
    emit("merging");
    await mergeUpload(uploadId);
    emit("completed");
    return { uploadId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    emit("failed", message);
    throw error;
  }
}
