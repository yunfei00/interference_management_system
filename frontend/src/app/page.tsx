"use client";

import Link from "next/link";

import { APP_NAME, DJANGO_PUBLIC_URL } from "@/lib/public-config";

import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={`surface ${styles.heroCopy}`}>
          <div className="eyebrow">企业管控前台</div>
          <h1 className={styles.title}>{APP_NAME}</h1>
          <p className={styles.subtitle}>
            这是基于 Django + Next.js 重构后的公司管理系统前端入口。当前阶段已经切换到
            JWT 会话、BFF 代理和分离式工作台模式，后续功能会持续从旧模板页面迁移过来。
          </p>

          <div className={styles.actions}>
            <Link className="button" href="/login">
              进入登录
            </Link>
            <Link className="buttonGhost" href="/dashboard">
              打开工作台
            </Link>
            <a
              className="buttonGhost"
              href={`${DJANGO_PUBLIC_URL}/api/docs/`}
              rel="noreferrer"
              target="_blank"
            >
              API 文档
            </a>
          </div>

          <div className={styles.chips}>
            <span className={styles.chip}>数据中心</span>
            <span className={styles.chip}>工具仓库</span>
            <span className={styles.chip}>主机管理</span>
            <span className={styles.chip}>命令审计</span>
          </div>
        </div>

        <div className={styles.sideRail}>
          <section className={`surface ${styles.routeCard}`}>
            <div className="eyebrow">改造要点</div>
            <h2 className={styles.routeTitle}>本次重构的核心边界</h2>
            <div className={styles.routeList}>
              <div className={styles.routeRow}>
                <span className={styles.routeName}>认证入口</span>
                <code className={styles.routeValue}>POST /api/auth/login</code>
              </div>
              <div className={styles.routeRow}>
                <span className={styles.routeName}>会话恢复</span>
                <code className={styles.routeValue}>GET /api/session</code>
              </div>
              <div className={styles.routeRow}>
                <span className={styles.routeName}>Django JWT</span>
                <code className={styles.routeValue}>POST /api/v1/auth/token/</code>
              </div>
              <div className={styles.routeRow}>
                <span className={styles.routeName}>业务 API</span>
                <code className={styles.routeValue}>/api/v1/datasets|tools|hosts</code>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className={styles.pillarGrid}>
        <article className={`surface ${styles.pillar}`}>
          <div className={styles.pillarStep}>01</div>
          <h2 className={styles.pillarTitle}>后端权威</h2>
          <p className={styles.pillarBody}>
            Django 继续掌管数据模型、审批状态、文件处理、Agent 调用和 OpenAPI。
          </p>
        </article>
        <article className={`surface ${styles.pillar}`}>
          <div className={styles.pillarStep}>02</div>
          <h2 className={styles.pillarTitle}>前端解耦</h2>
          <p className={styles.pillarBody}>
            Next.js 工作台通过 Route Handler 代理后端，浏览器不直接接触 JWT 明文。
          </p>
        </article>
        <article className={`surface ${styles.pillar}`}>
          <div className={styles.pillarStep}>03</div>
          <h2 className={styles.pillarTitle}>渐进迁移</h2>
          <p className={styles.pillarBody}>
            旧模板页不会立刻强拆，当前先把高频业务流迁入新的分离式工作台。
          </p>
        </article>
      </section>
    </main>
  );
}
