import type { UploadState } from "@/lib/tool-upload";

/** 分片上传流程在界面上的状态说明（与 `UploadState.status` 对应）。 */
export function uploadProgressStatusLabel(status: UploadState["status"]): string {
  switch (status) {
    case "preparing":
      return "正在准备上传…";
    case "uploading":
      return "正在上传分片…";
    case "merging":
      return "正在合并文件…";
    case "completed":
      return "上传已完成。";
    case "failed":
      return "上传失败。";
    default:
      return "等待上传。";
  }
}
