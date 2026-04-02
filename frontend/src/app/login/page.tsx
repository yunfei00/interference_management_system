import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";
import { APP_NAME, DJANGO_PUBLIC_URL } from "@/lib/public-config";

import styles from "./page.module.css";

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.brandColumn}>
          <section className={`surface ${styles.heroCard}`}>
            <div className={styles.heroTop}>
              <div className="eyebrow">企业统一身份认证</div>
              <div className={styles.statusPill}>安全接入</div>
            </div>

            <div className={styles.brandMark}>IM</div>

            <h1 className={styles.heroTitle}>{APP_NAME}</h1>
            <p className={styles.heroSubtitle}>面向电磁与射频体系的企业级登录入口</p>
            <p className={styles.heroCopy}>
              账号完成审批后，系统会依据所属部门自动分配可访问页面与工作区。
              当前“电磁 / 干扰”业务模块已正式上线，RSE、EMC 与射频体系页面已完成结构预留。
            </p>

            <div className={styles.metricRow}>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>组织结构</span>
                <strong className={styles.metricValue}>电磁 / 射频</strong>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>准入方式</span>
                <strong className={styles.metricValue}>审批联动</strong>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>权限策略</span>
                <strong className={styles.metricValue}>部门化访问</strong>
              </div>
            </div>
          </section>

          <div className={styles.featureGrid}>
            <article className={`surface ${styles.featureCard}`}>
              <div className={styles.featureTitle}>组织化准入</div>
              <p className={styles.featureText}>
                登录后根据审批状态与所属部门自动匹配菜单和页面，避免跨部门误入。
              </p>
            </article>

            <article className={`surface ${styles.featureCard}`}>
              <div className={styles.featureTitle}>统一工作入口</div>
              <p className={styles.featureText}>
                当前原有业务统一归属电磁 / 干扰工作区，后续可继续按部门扩展。
              </p>
            </article>

            <article className={`surface ${styles.featureCard}`}>
              <div className={styles.featureTitle}>安全可审计</div>
              <p className={styles.featureText}>
                认证、审批、远程操作与后台管理均保留审计入口，满足企业内控需要。
              </p>
            </article>

            <article className={`surface ${styles.featureCard}`}>
              <div className={styles.featureTitle}>渐进式建设</div>
              <p className={styles.featureText}>
                干扰模块先行落地，RSE、EMC 和射频页面已经预留，可按业务节奏继续建设。
              </p>
            </article>
          </div>

          <section className={`surface ${styles.scopeCard}`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>当前平台范围</h2>
                <p className={styles.sectionText}>
                  现在这套系统已经不再是演示式工作台，而是明确按企业组织结构交付的业务入口。
                </p>
              </div>
            </div>

            <div className={styles.scopeList}>
              <div className={styles.scopeItem}>
                <span className={styles.scopeLabel}>已上线部门</span>
                <span className={styles.scopeValue}>电磁 / 干扰</span>
              </div>
              <div className={styles.scopeItem}>
                <span className={styles.scopeLabel}>已接管内容</span>
                <span className={styles.scopeValue}>数据中心、工具仓库、主机管理、命令审计</span>
              </div>
              <div className={styles.scopeItem}>
                <span className={styles.scopeLabel}>待扩展结构</span>
                <span className={styles.scopeValue}>RSE、EMC、射频</span>
              </div>
            </div>

            <div className={styles.linkRow}>
              <Link className="buttonGhost" href="/">
                返回门户
              </Link>
              <a
                className="buttonGhost"
                href={`${DJANGO_PUBLIC_URL}/accounts/login/`}
                rel="noreferrer"
                target="_blank"
              >
                后台登录入口
              </a>
            </div>
          </section>
        </div>

        <div className={styles.authColumn}>
          <section className={`surface ${styles.bannerCard}`}>
            <div className={styles.bannerTitle}>登录后自动按部门进入工作区</div>
            <div className={styles.bannerChips}>
              <span className={styles.bannerChip}>电磁</span>
              <span className={styles.bannerChip}>干扰</span>
              <span className={styles.bannerChip}>RSE</span>
              <span className={styles.bannerChip}>EMC</span>
              <span className={styles.bannerChip}>射频</span>
            </div>
          </section>

          <Suspense
            fallback={
              <section className={`surface ${styles.loadingCard}`}>
                正在加载企业登录表单...
              </section>
            }
          >
            <LoginForm />
          </Suspense>

          <div className={styles.supportGrid}>
            <section className={`surface ${styles.supportCard}`}>
              <div className={styles.supportTitle}>账号开通</div>
              <p className={styles.supportText}>
                新账号注册后进入审批流程，审批通过后系统会自动开通对应部门页面。
              </p>
            </section>

            <section className={`surface ${styles.supportCard}`}>
              <div className={styles.supportTitle}>访问支持</div>
              <p className={styles.supportText}>
                如需处理初始化、账号维护或部门配置，可通过 Django 后台进行统一管理。
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
