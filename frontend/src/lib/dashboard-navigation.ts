export type NavTreeNode = {
  key: string;
  label: string;
  href: string;
  requiredPermissions: string[];
  children?: NavTreeNode[];
};

const INTERFERENCE_BASE = "/dashboard/electromagnetic/interference";

export const PORTAL_NAV_TREE: NavTreeNode[] = [
  {
    key: "portal",
    label: "Workspace",
    href: "/dashboard",
    requiredPermissions: ["overview.view"],
  },
  {
    key: "system",
    label: "System Management",
    href: "/dashboard/admin/users",
    requiredPermissions: ["admin.users.view"],
    children: [
      {
        key: "admin_users",
        label: "User Management",
        href: "/dashboard/admin/users",
        requiredPermissions: ["admin.users.view"],
      },
    ],
  },
  {
    key: "projects",
    label: "Project Management",
    href: "/dashboard/projects",
    requiredPermissions: ["projects.module.view"],
  },
  {
    key: "electromagnetic",
    label: "Electromagnetic",
    href: "/dashboard/electromagnetic",
    requiredPermissions: ["department.electromagnetic.view"],
    children: [
      {
        key: "interference",
        label: "Interference",
        href: INTERFERENCE_BASE,
        requiredPermissions: ["department.interference.view"],
        children: [
          {
            key: "interference_home",
            label: "Interference Home",
            href: INTERFERENCE_BASE,
            requiredPermissions: [
              "department.interference.view",
              "interference.dashboard.view",
            ],
          },
          {
            key: "datasets",
            label: "Datasets",
            href: `${INTERFERENCE_BASE}/datasets`,
            requiredPermissions: [
              "department.interference.view",
              "interference.datahub.view",
            ],
          },
          {
            key: "tools",
            label: "Tools",
            href: `${INTERFERENCE_BASE}/tools`,
            requiredPermissions: [
              "department.interference.view",
              "interference.tools.view",
            ],
          },
          {
            key: "hosts",
            label: "Hosts",
            href: `${INTERFERENCE_BASE}/hosts`,
            requiredPermissions: [
              "department.interference.view",
              "interference.hosts.view",
            ],
          },
          {
            key: "commands",
            label: "Command Audit",
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
    label: "RF",
    href: "/dashboard/rf",
    requiredPermissions: ["department.rf.view", "rf.dashboard.view"],
  },
];

export function hasDashboardPermission(
  permissions: string[],
  required?: string[] | null,
): boolean {
  if (!required?.length) {
    return true;
  }
  return required.every((permission) => permissions.includes(permission));
}

export function hasAnyDashboardPermission(
  permissions: string[],
  candidates: string[],
): boolean {
  return candidates.some((permission) => permissions.includes(permission));
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

export function isNavActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavBranchActive(pathname: string, node: NavTreeNode): boolean {
  if (isNavActivePath(pathname, node.href)) {
    return true;
  }
  return node.children?.some((child) => isNavBranchActive(pathname, child)) ?? false;
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
        stack.push({
          node,
          ancestors: [...ancestors],
          depth,
          hrefLen: node.href.length,
        });
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
  stack.sort((left, right) => {
    if (right.hrefLen !== left.hrefLen) {
      return right.hrefLen - left.hrefLen;
    }
    return right.depth - left.depth;
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
  return [...match.ancestors, match.node].map((node) => ({
    key: node.key,
    label: node.label,
    href: node.href,
  }));
}
