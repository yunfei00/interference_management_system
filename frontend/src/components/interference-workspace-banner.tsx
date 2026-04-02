import { InterferenceWorkspaceNav } from "./interference-workspace-nav";
import styles from "./management-page.module.css";

type InterferenceWorkspaceBannerProps = {
  title: string;
  description: string;
};

export function InterferenceWorkspaceBanner({
  title,
  description,
}: InterferenceWorkspaceBannerProps) {
  return (
    <section className={`surface ${styles.panel}`}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>电磁 / 干扰 / {title}</h2>
          <p className={styles.panelText}>{description}</p>
        </div>
      </div>
      <InterferenceWorkspaceNav />
    </section>
  );
}
