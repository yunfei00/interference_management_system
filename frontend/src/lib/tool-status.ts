/** 与后端 Tool.status 一致；兼容历史值 archived。 */
export type ToolRunStatus = "active" | "testing" | "deprecated";

export function normalizeToolStatus(raw: string): ToolRunStatus {
  if (raw === "archived") {
    return "deprecated";
  }
  if (raw === "active" || raw === "testing" || raw === "deprecated") {
    return raw;
  }
  return "deprecated";
}

export function toolStatusLabel(status: string): string {
  switch (normalizeToolStatus(status)) {
    case "active":
      return "可用";
    case "testing":
      return "测试中";
    case "deprecated":
      return "已归档";
    default:
      return status;
  }
}
