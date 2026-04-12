import { ApiResponseError, apiFetch, parseApiResponse } from "@/lib/api-client";
import type {
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
const MAX_COMPLETE_RECOVERY_PASSES = 3;

async function initUpload(payload: ToolUploadInitPayload): Promise<ToolUploadSession> {
  const response = await apiFetch("/api/tools/uploads/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<ToolUploadSession>(response);
}

async function getUploadStatus(uploadId: string): Promise<ToolUploadProgress> {
  const response = await apiFetch(`/api/tools/uploads/${uploadId}/status`);
  return parseApiResponse<ToolUploadProgress>(response);
}

async function uploadChunk(uploadId: string, chunkIndex: number, chunk: Blob): Promise<ToolUploadProgress> {
  const formData = new FormData();
  formData.append("chunk", chunk, `chunk_${chunkIndex}.part`);
  const response = await apiFetch(`/api/tools/uploads/${uploadId}/chunks/${chunkIndex}`, {
    method: "POST",
    body: formData,
  });
  return parseApiResponse<ToolUploadProgress>(response);
}

async function mergeUpload(uploadId: string): Promise<ToolUploadProgress> {
  const response = await apiFetch(`/api/tools/uploads/${uploadId}/merge`, { method: "POST" });
  return parseApiResponse<ToolUploadProgress>(response);
}

function toSortedChunkList(chunks: number[] | undefined, totalChunks: number): number[] {
  return [...new Set((chunks ?? []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 0 && value < totalChunks))].sort(
    (left, right) => left - right,
  );
}

function toMissingChunkList(
  progress: Partial<ToolUploadProgress> | null | undefined,
  totalChunks: number,
  confirmedChunks: Set<number>,
): number[] {
  const direct = toSortedChunkList(progress?.missing_chunks, totalChunks);
  if (direct.length) {
    return direct;
  }

  const uploaded = new Set<number>(
    toSortedChunkList(progress?.uploaded_chunks, totalChunks),
  );
  if (uploaded.size) {
    return Array.from({ length: totalChunks }, (_, index) => index).filter(
      (index) => !uploaded.has(index),
    );
  }

  return Array.from({ length: totalChunks }, (_, index) => index).filter(
    (index) => !confirmedChunks.has(index),
  );
}

function syncConfirmedChunks(
  confirmedChunks: Set<number>,
  progress: Partial<ToolUploadProgress> | null | undefined,
  totalChunks: number,
) {
  const uploadedChunks = toSortedChunkList(progress?.uploaded_chunks, totalChunks);
  if (!uploadedChunks.length) {
    return;
  }

  for (const chunkIndex of uploadedChunks) {
    confirmedChunks.add(chunkIndex);
  }

  const missingChunks = new Set<number>(
    toSortedChunkList(progress?.missing_chunks, totalChunks),
  );
  for (const chunkIndex of missingChunks) {
    confirmedChunks.delete(chunkIndex);
  }
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
  const confirmedChunks = new Set<number>(
    toSortedChunkList(status.uploaded_chunks, totalChunks),
  );
  const inflightChunks = new Set<number>();
  const retryQueue = new Set<number>();
  let completeRequested = false;
  let fatalError: Error | null = null;

  function emit(currentStatus: UploadUiStatus, err: string | null = null) {
    const progress = Math.min((confirmedChunks.size / totalChunks) * 100, 100);
    onState({
      status: currentStatus,
      uploadId,
      uploadedChunks: confirmedChunks.size,
      totalChunks,
      progress,
      error: err,
    });
  }

  function ensureReadyToComplete() {
    if (confirmedChunks.size !== totalChunks) {
      throw new Error("仍有未确认的分片，暂不能完成上传。");
    }
    if (inflightChunks.size !== 0) {
      throw new Error("仍有分片请求进行中，暂不能完成上传。");
    }
    if (retryQueue.size !== 0) {
      throw new Error("仍有待重试的分片，暂不能完成上传。");
    }
    if (completeRequested) {
      throw new Error("上传完成请求已发送，请勿重复提交。");
    }
  }

  async function uploadChunkWithRetry(chunkIndex: number) {
    retryQueue.delete(chunkIndex);

    for (let attempt = 0; attempt <= retry; attempt += 1) {
      inflightChunks.add(chunkIndex);
      emit("uploading");

      try {
        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const blob = file.slice(start, end);
        const progress = await uploadChunk(uploadId, chunkIndex, blob);
        syncConfirmedChunks(confirmedChunks, progress, totalChunks);
        confirmedChunks.add(chunkIndex);
        emit("uploading");
        return;
      } catch (error) {
        const resolvedError =
          error instanceof Error ? error : new Error("分片上传失败");
        if (attempt >= retry) {
          throw resolvedError;
        }
        retryQueue.add(chunkIndex);
      } finally {
        inflightChunks.delete(chunkIndex);
        emit("uploading");
      }
    }
  }

  async function uploadSpecificChunks(chunkIndexes: number[]) {
    const queue = toSortedChunkList(chunkIndexes, totalChunks);
    if (!queue.length) {
      return;
    }

    let cursor = 0;
    const workerCount = Math.max(1, Math.min(concurrency, queue.length));
    const workers = Array.from({ length: workerCount }, () =>
      (async () => {
        while (cursor < queue.length) {
          if (fatalError) {
            return;
          }
          const current = queue[cursor];
          cursor += 1;
          try {
            await uploadChunkWithRetry(current);
          } catch (error) {
            fatalError = error instanceof Error ? error : new Error("分片上传失败");
            throw fatalError;
          }
        }
      })(),
    );

    await Promise.all(workers);
  }

  async function reconcileMissingChunks(
    source: Partial<ToolUploadProgress> | null | undefined,
  ): Promise<number[]> {
    const serverStatus = await getUploadStatus(uploadId);
    syncConfirmedChunks(confirmedChunks, serverStatus, totalChunks);
    const missingChunks = toMissingChunkList(serverStatus ?? source, totalChunks, confirmedChunks);
    if (!missingChunks.length) {
      return [];
    }

    for (const chunkIndex of missingChunks) {
      confirmedChunks.delete(chunkIndex);
    }
    emit("uploading");
    await uploadSpecificChunks(missingChunks);

    const refreshedStatus = await getUploadStatus(uploadId);
    syncConfirmedChunks(confirmedChunks, refreshedStatus, totalChunks);
    return toMissingChunkList(refreshedStatus, totalChunks, confirmedChunks);
  }

  async function completeUpload(): Promise<void> {
    for (let pass = 0; pass < MAX_COMPLETE_RECOVERY_PASSES; pass += 1) {
      const missingBeforeComplete = await reconcileMissingChunks(null);
      if (missingBeforeComplete.length) {
        continue;
      }

      ensureReadyToComplete();
      completeRequested = true;
      emit("merging");

      try {
        const merged = await mergeUpload(uploadId);
        syncConfirmedChunks(confirmedChunks, merged, totalChunks);
        emit("completed");
        return;
      } catch (error) {
        completeRequested = false;
        if (error instanceof ApiResponseError) {
          const missingChunks = await reconcileMissingChunks(
            (error.data as Partial<ToolUploadProgress> | null) ?? null,
          );
          if (!missingChunks.length) {
            continue;
          }
        }
        throw error;
      }
    }

    throw new Error("分片补传后仍无法完成上传，请稍后重试。");
  }

  emit("uploading");

  const initialPending = Array.from({ length: totalChunks }, (_, index) => index).filter(
    (index) => !confirmedChunks.has(index),
  );

  try {
    await uploadSpecificChunks(initialPending);
    await completeUpload();
    return { uploadId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    emit("failed", message);
    throw error;
  }
}
