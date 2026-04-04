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
          <h2 className={styles.panelTitle}>{title}</h2>
          <p className={styles.panelText}>{description}</p>
        </div>
      </div>
    </section>
  );
}
