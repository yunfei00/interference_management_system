"use client";

import styles from "./projects.module.css";

export type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;

export function ToastBanner({ toast }: { toast: NonNullable<ToastState> }) {
  return (
    <div className={`${styles.toast} ${toast.kind === "error" ? styles.toastError : ""}`}>
      {toast.message}
    </div>
  );
}
