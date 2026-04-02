"use client";

import Link from "next/link";

import { DepartmentAccessGuard } from "./department-access-guard";
import { DashboardNav } from "./dashboard-nav";
import styles from "./department-pages.module.css";

export function ElectromagneticPage() {
  return (
    <DepartmentAccessGuard
      description="当前账号没有进入电磁事业部页面的权限。"
      permission="department.electromagnetic.view"
      title="无法访问电磁页面"
    >
      <main className={styles.page}>
        <section className={`surface ${styles.hero}`}>
          <div className={styles.eyebrow}>电磁事业部</div>
          <h1 className={styles.title}>电磁下面先拆成三个子部门</h1>
          <p className={styles.copy}>
            当前阶段，电磁是这套新系统最先落地的事业部。下面分为干扰、RSE 和 EMC，
            其中干扰页承接了原有系统的全部内容页，RSE 和 EMC 先保留为空白页面。
          </p>
          <DashboardNav />
        </section>

        <section className={styles.content}>
          <div className={styles.stack}>
            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>子部门入口</h2>
                <p className={styles.panelText}>
                  建议从这里选择具体子部门。后面我们继续扩展时，也会沿着这个结构加功能。
                </p>
              </div>

              <div className={styles.grid}>
                <article className={styles.card}>
                  <div className={styles.cardTitle}>干扰</div>
                  <div className={styles.cardCopy}>
                    当前已上线工作区。数据中心、工具仓库、主机管理、命令审计全部归这里。
                  </div>
                  <div className={styles.actions}>
                    <Link className="button" href="/dashboard/electromagnetic/interference">
                      进入干扰页面
                    </Link>
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.cardTitle}>RSE</div>
                  <div className={styles.cardCopy}>
                    已预留页面结构，等待后续补充具体业务能力和数据模型。
                  </div>
                  <div className={styles.actions}>
                    <Link className="buttonGhost" href="/dashboard/electromagnetic/rse">
                      查看占位页
                    </Link>
                  </div>
                </article>

                <article className={styles.card}>
                  <div className={styles.cardTitle}>EMC</div>
                  <div className={styles.cardCopy}>
                    已预留页面结构，当前阶段不填具体内容，后续可以独立扩展。
                  </div>
                  <div className={styles.actions}>
                    <Link className="buttonGhost" href="/dashboard/electromagnetic/emc">
                      查看占位页
                    </Link>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <aside className={styles.stack}>
            <section className={`surface ${styles.panel}`}>
              <div>
                <h2 className={styles.panelTitle}>当前划分原则</h2>
                <p className={styles.panelText}>
                  这次不是简单改导航，而是把系统入口先和公司部门树对齐。
                </p>
              </div>
              <div className={styles.list}>
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>干扰</span>
                  <span className={styles.listValue}>承接原有内容页和工作流</span>
                </div>
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>RSE</span>
                  <span className={styles.listValue}>页面已建，内容待后续补充</span>
                </div>
                <div className={styles.listItem}>
                  <span className={styles.listLabel}>EMC</span>
                  <span className={styles.listValue}>页面已建，内容待后续补充</span>
                </div>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </DepartmentAccessGuard>
  );
}
