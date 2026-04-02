import Link from "next/link";

import { DepartmentAccessGuard } from "./department-access-guard";
import { DashboardNav } from "./dashboard-nav";
import styles from "./department-pages.module.css";

type DepartmentPlaceholderPageProps = {
  permission: string;
  eyebrow: string;
  title: string;
  description: string;
  nextHint: string;
  backHref: "/dashboard/electromagnetic" | "/dashboard";
  backLabel: string;
};

export function DepartmentPlaceholderPage({
  permission,
  eyebrow,
  title,
  description,
  nextHint,
  backHref,
  backLabel,
}: DepartmentPlaceholderPageProps) {
  return (
    <DepartmentAccessGuard
      description={`当前账号没有进入“${title}”的权限。`}
      permission={permission}
      title={`无法访问${title}`}
    >
      <main className={styles.page}>
        <section className={`surface ${styles.hero}`}>
          <div className={styles.eyebrow}>{eyebrow}</div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.copy}>{description}</p>
          <DashboardNav />
        </section>

        <section className={styles.content}>
          <div className={styles.stack}>
            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>当前状态</h2>
                <p className={styles.panelText}>
                  这个页面结构已经建好，但暂时不填具体内容，方便后面按部门继续扩展。
                </p>
              </div>
              <div className={styles.empty}>{nextHint}</div>
              <div className={styles.actions}>
                <Link className="buttonGhost" href={backHref}>
                  {backLabel}
                </Link>
              </div>
            </section>
          </div>

          <aside className={styles.stack}>
            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>预留说明</h2>
                <p className={styles.panelText}>
                  等你后面决定该部门的业务边界后，我们可以直接在这个页面下继续展开。
                </p>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </DepartmentAccessGuard>
  );
}
