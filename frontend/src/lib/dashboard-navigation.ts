/** 企业门户导航树（唯一数据源）。节点权限为部门 + 功能双重校验（须全部满足）。 */

export type NavTreeNode = {
  key: string;
  label: string;
  href: string;
  /** 须全部具备。空则不做权限过滤（不应用于受控业务节点）。 */
  requiredPermissions: string[];
  children?: NavTreeNode[];
};

const INTERFERENCE_BASE = "/dashboard/electromagnetic/interference";

/**
 * portal → electromagnetic → interference/workspace → rf
 */
export const PORTAL_NAV_TREE: NavTreeNode[] = [
  {
    key: "portal",
    label: "工作台",
    href: "/dashboard",
    requiredPermissions: ["overview.view"],
  },
  {
    key: "system",
    label: "系统管理",
    href: "/dashboard/admin/users",
    requiredPermissions: ["admin.users.view"],
    children: [
      {
        key: "admin_users",
        label: "用户管理",
        href: "/dashboard/admin/users",
        requiredPermissions: ["admin.users.view"],
      },
    ],
  },
  {
    key: "electromagnetic",
    label: "电磁",
    href: "/dashboard/electromagnetic",
    requiredPermissions: ["department.electromagnetic.view"],
    children: [
      {
        key: "interference",
        label: "干扰",
        href: INTERFERENCE_BASE,
        requiredPermissions: ["department.interference.view"],
        children: [
          {
            key: "interference_home",
            label: "干扰门户",
            href: INTERFERENCE_BASE,
            requiredPermissions: [
              "department.interference.view",
              "interference.dashboard.view",
            ],
          },
          {
            key: "datasets",
            label: "数据中心",
            href: `${INTERFERENCE_BASE}/datasets`,
            requiredPermissions: [
              "department.interference.view",
              "interference.datahub.view",
            ],
          },
          {
            key: "tools",
            label: "工具仓库",
            href: `${INTERFERENCE_BASE}/tools`,
            requiredPermissions: [
              "department.interference.view",
              "interference.tools.view",
            ],
          },
          {
            key: "hosts",
            label: "主机管理",
            href: `${INTERFERENCE_BASE}/hosts`,
            requiredPermissions: [
              "department.interference.view",
              "interference.hosts.view",
            ],
          },
          {
            key: "commands",
            label: "命令审计",
            href: `${INTERFERENCE_BASE}/commands`,
            requiredPermissions: [
              "department.interference.view",
              "interference.commands.view",
            ],
          },
        ],
      },
      {
        key: "rse",
        label: "RSE",
        href: "/dashboard/electromagnetic/rse",
        requiredPermissions: ["department.rse.view", "rse.dashboard.view"],
      },
      {
        key: "emc",
        label: "EMC",
        href: "/dashboard/electromagnetic/emc",
        requiredPermissions: ["department.emc.view", "emc.dashboard.view"],
      },
    ],
  },
  {
    key: "rf",
    label: "射频",
    href: "/dashboard/rf",
    requiredPermissions: ["department.rf.view", "rf.dashboard.view"],
  },
];

/** 须全部满足；未传或空数组视为通过 */
export function hasDashboardPermission(
  permissions: string[],
  required?: string[] | null,
): boolean {
  if (!required?.length) {
    return true;
  }
  return required.every((p) => permissions.includes(p));
}

/** 任一满足即可（例如管理员保留 ops.* 与干扰功能权限并存时的入口展示） */
export function hasAnyDashboardPermission(
  permissions: string[],
  candidates: string[],
): boolean {
  return candidates.some((p) => permissions.includes(p));
}

export function filterNavTree(
  nodes: NavTreeNode[],
  permissions: string[],
): NavTreeNode[] {
  const result: NavTreeNode[] = [];
  for (const node of nodes) {
    if (!hasDashboardPermission(permissions, node.requiredPermissions)) {
      continue;
    }
    const filteredChildren = node.children
      ? filterNavTree(node.children, permissions)
      : undefined;
    if (node.children?.length && filteredChildren && filteredChildren.length === 0) {
      continue;
    }
    result.push({
      ...node,
      children: filteredChildren,
    });
  }
  return result;
}

/** pathname 是否与导航节点匹配（前缀规则，工作台精确匹配） */
export function isNavActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** 当前分支下是否存在激活子节点（用于侧栏父级高亮） */
export function isNavBranchActive(pathname: string, node: NavTreeNode): boolean {
  if (isNavActivePath(pathname, node.href)) {
    return true;
  }
  return node.children?.some((c) => isNavBranchActive(pathname, c)) ?? false;
}

type NavMatchBest = {
  node: NavTreeNode;
  ancestors: NavTreeNode[];
  depth: number;
  hrefLen: number;
};

export function findDeepestNavMatch(
  pathname: string,
  nodes: NavTreeNode[],
): { node: NavTreeNode; ancestors: NavTreeNode[] } | null {
  const stack: NavMatchBest[] = [];

  function walk(list: NavTreeNode[], ancestors: NavTreeNode[], depth: number) {
    for (const node of list) {
      if (isNavActivePath(pathname, node.href)) {
        const hrefLen = node.href.length;
        stack.push({ node, ancestors: [...ancestors], depth, hrefLen });
      }
      if (node.children?.length) {
        walk(node.children, [...ancestors, node], depth + 1);
      }
    }
  }

  walk(nodes, [], 0);
  if (stack.length === 0) {
    return null;
  }
  stack.sort((a, b) => {
    if (b.hrefLen !== a.hrefLen) {
      return b.hrefLen - a.hrefLen;
    }
    return b.depth - a.depth;
  });
  const top = stack[0]!;
  return { node: top.node, ancestors: top.ancestors };
}

export function getBreadcrumbItems(
  pathname: string,
  permissions: string[],
): { label: string; href: string; key: string }[] {
  const tree = filterNavTree(PORTAL_NAV_TREE, permissions);
  const match = findDeepestNavMatch(pathname, tree);
  if (!match) {
    return [];
  }
  return [...match.ancestors, match.node].map((n) => ({
    key: n.key,
    label: n.label,
    href: n.href,
  }));
}
