/** 工具仓库：查看与管理员维护权限（与后端 MappedPermission 对齐） */

export const TOOLS_VIEW_ACCESS = [
  "department.interference.view",
  "interference.tools.view",
] as const;

export const TOOLS_MANAGE_ACCESS = [
  "department.interference.view",
  "interference.tools.view",
  "tools.manage",
] as const;
