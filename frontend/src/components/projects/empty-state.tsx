"use client";

import styles from "./projects.module.css";

export function EmptyState({
  title,
  description,
  tone = "empty",
}: {
  title: string;
  description: string;
  tone?: "empty" | "error";
}) {
  return (
    <div className={tone === "error" ? styles.error : styles.empty}>
      <strong>{title}</strong>
      <div>{description}</div>
    </div>
  );
}
