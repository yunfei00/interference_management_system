"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  INTERFERENCE_WORKSPACE_ITEMS,
  getVisibleInterferenceWorkspaceItems,
  isDashboardLinkActive,
} from "@/lib/dashboard-navigation";

import { useDashboardSession } from "./dashboard-session-provider";
import styles from "./dashboard-nav.module.css";

export function InterferenceWorkspaceNav() {
  const pathname = usePathname();
  const { state } = useDashboardSession();

  if (state.kind === "loading") {
    return (
      <nav aria-label="干扰工作区导航" className={styles.nav}>
        {INTERFERENCE_WORKSPACE_ITEMS.slice(0, 3).map((link) => (
          <span className={`${styles.link} ${styles.placeholder}`} key={link.href}>
            {link.label}
          </span>
        ))}
      </nav>
    );
  }

  const links =
    state.kind === "ready"
      ? getVisibleInterferenceWorkspaceItems(state.data.permissions)
      : INTERFERENCE_WORKSPACE_ITEMS.filter((link) => !link.requiredPermission);

  return (
    <nav aria-label="干扰工作区导航" className={styles.nav}>
      {links.map((link) => {
        const active = isDashboardLinkActive(pathname, link.href);
        const className = active
          ? `${styles.link} ${styles.active}`
          : styles.link;

        return (
          <Link className={className} href={link.href} key={link.href}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
