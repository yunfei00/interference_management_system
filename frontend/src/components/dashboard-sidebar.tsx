"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import type { NavTreeNode } from "@/lib/dashboard-navigation";
import {
  PORTAL_NAV_TREE,
  filterNavTree,
  isNavActivePath,
  isNavBranchActive,
} from "@/lib/dashboard-navigation";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./dashboard-sidebar.module.css";

function NavBranch({
  nodes,
  pathname,
  depth,
  translate,
}: {
  nodes: NavTreeNode[];
  pathname: string;
  depth: number;
  translate: (key: string) => string;
}) {
  return (
    <ul
      className={depth > 0 ? `${styles.branch} ${styles.branchNested}` : styles.branch}
    >
      {nodes.map((node) => {
        const active = isNavActivePath(pathname, node.href);
        const branchActive = isNavBranchActive(pathname, node);
        const hasChildren = Boolean(node.children?.length);

        return (
          <li className={styles.item} key={node.key}>
            <Link
              className={`${styles.link} ${styles[`depth${Math.min(depth, 3)}`]} ${active ? styles.linkActive : ""} ${!hasChildren && branchActive && !active ? styles.linkBranchActive : ""}`}
              href={node.href as Route}
            >
              {translate(node.key)}
            </Link>
            {hasChildren ? (
              <NavBranch
                depth={depth + 1}
                nodes={node.children!}
                pathname={pathname}
                translate={translate}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { state } = useDashboardSession();
  const t = useTranslations("nav");

  if (state.kind === "loading") {
    return (
      <nav aria-label={t("sidebar")} className={styles.sidebar}>
        {PORTAL_NAV_TREE.slice(0, 3).map((node) => (
          <span className={`${styles.link} ${styles.placeholder}`} key={node.key}>
            {t(node.key)}
          </span>
        ))}
      </nav>
    );
  }

  if (state.kind !== "ready") {
    return (
      <nav aria-label={t("sidebar")} className={styles.sidebar}>
        {PORTAL_NAV_TREE.slice(0, 4).map((node) => (
          <span className={`${styles.link} ${styles.placeholder}`} key={node.key}>
            {t(node.key)}
          </span>
        ))}
      </nav>
    );
  }

  const tree = filterNavTree(PORTAL_NAV_TREE, state.data.permissions);

  return (
    <nav aria-label={t("sidebar")} className={styles.sidebar}>
      <NavBranch depth={0} nodes={tree} pathname={pathname} translate={t} />
    </nav>
  );
}
