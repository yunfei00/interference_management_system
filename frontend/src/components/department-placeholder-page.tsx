import type { Route } from "next";
import Link from "next/link";

import { DepartmentAccessGuard } from "./department-access-guard";
import styles from "./department-pages.module.css";

type DepartmentPlaceholderPageProps = {
  requiredPermissions: string[];
  eyebrow: string;
  title: string;
  intro: string;
  status: string;
  roadmap: string;
  backHref: "/dashboard" | "/dashboard/electromagnetic";
  backLabel: string;
};

export function DepartmentPlaceholderPage({
  requiredPermissions,
  eyebrow,
  title,
  intro,
  status,
  roadmap,
  backHref,
  backLabel,
}: DepartmentPlaceholderPageProps) {
  return (
    <DepartmentAccessGuard
      description={`当前账号没有进入「${title}」所属业务范围的权限。`}
      requiredPermissions={requiredPermissions}
      title={`无法访问${title}`}
    >
      <div className={styles.page}>
        <section className={`surface ${styles.hero}`}>
          <div className={styles.eyebrow}>{eyebrow}</div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.copy}>{intro}</p>
        </section>

        <section className={styles.content}>
          <div className={styles.stack}>
            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>建设状态</h2>
                <p className={styles.panelText}>{status}</p>
              </div>
            </section>

            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>后续规划</h2>
                <p className={styles.panelText}>{roadmap}</p>
              </div>
            </section>

            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>导航提示</h2>
                <p className={styles.panelText}>
                  请使用左侧导航在授权范围内切换模块；面包屑用于确认当前位置。业务上线后，本页将承接该部门的第一屏工作与通知。
                </p>
              </div>
              <div className={styles.actions}>
                <Link className="buttonGhost" href={backHref as Route}>
                  {backLabel}
                </Link>
              </div>
            </section>
          </div>

          <aside className={styles.stack}>
            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>说明</h2>
                <p className={styles.panelText}>
                  本模块为企业内部平台上的正式占位页面，便于统一信息架构与权限边界；非临时空白页。
                </p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </DepartmentAccessGuard>
  );
}
