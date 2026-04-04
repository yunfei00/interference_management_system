"use client";

import { DashboardBreadcrumb } from "./dashboard-breadcrumb";
import styles from "./interference-section-layout.module.css";

export function InterferenceSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <DashboardBreadcrumb />
      {children}
    </div>
  );
}
