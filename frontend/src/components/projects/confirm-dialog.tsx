"use client";

import { useTransition } from "react";

import styles from "./projects.module.css";

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className={styles.overlay} role="presentation">
      <div className={`surface ${styles.modalPanel}`} role="dialog" aria-modal="true">
        <div className={styles.sectionHeader}>
          <div>
            <div className="eyebrow">Confirm</div>
            <h2 className={styles.projectTitle}>{title}</h2>
          </div>
          <button className="buttonGhost" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <p className={styles.muted}>{description}</p>
        <div className={styles.actionBar}>
          <button className="buttonGhost" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await onConfirm();
              })
            }
            type="button"
          >
            {isPending ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
