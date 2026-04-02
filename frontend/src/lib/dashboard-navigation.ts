import type { Route } from "next";

export type DashboardNavItem = {
  href: Route;
  key: "overview" | "electromagnetic" | "rf";
  label: string;
  requiredPermission?: string;
};

export type InterferenceWorkspaceItem = {
  href: Route;
  key: "interference" | "datasets" | "tools" | "hosts" | "commands";
  label: string;
  requiredPermission?: string;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { href: "/dashboard", key: "overview", label: "工作台" },
  {
    href: "/dashboard/electromagnetic",
    key: "electromagnetic",
    label: "电磁",
    requiredPermission: "department.electromagnetic.view",
  },
  {
    href: "/dashboard/rf",
    key: "rf",
    label: "射频",
    requiredPermission: "department.rf.view",
  },
];

export const INTERFERENCE_WORKSPACE_ITEMS: InterferenceWorkspaceItem[] = [
  {
    href: "/dashboard/electromagnetic/interference",
    key: "interference",
    label: "干扰主页",
    requiredPermission: "department.interference.view",
  },
  {
    href: "/dashboard/datasets",
    key: "datasets",
    label: "数据中心",
    requiredPermission: "datahub.view",
  },
  {
    href: "/dashboard/tools",
    key: "tools",
    label: "工具仓库",
    requiredPermission: "tools.view",
  },
  {
    href: "/dashboard/hosts",
    key: "hosts",
    label: "主机管理",
    requiredPermission: "ops.host.view",
  },
  {
    href: "/dashboard/commands",
    key: "commands",
    label: "命令审计",
    requiredPermission: "ops.command.view",
  },
];

export function hasDashboardPermission(
  permissions: string[],
  requiredPermission?: string,
): boolean {
  return !requiredPermission || permissions.includes(requiredPermission);
}

export function getVisibleDashboardNavItems(permissions: string[]) {
  return DASHBOARD_NAV_ITEMS.filter((item) =>
    hasDashboardPermission(permissions, item.requiredPermission),
  );
}

export function getVisibleInterferenceWorkspaceItems(permissions: string[]) {
  return INTERFERENCE_WORKSPACE_ITEMS.filter((item) =>
    hasDashboardPermission(permissions, item.requiredPermission),
  );
}

export function isDashboardLinkActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
