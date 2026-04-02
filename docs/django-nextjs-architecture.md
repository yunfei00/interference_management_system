# Django + Next.js 重构架构说明

## 1. 当前目标

本项目已从单体 Django 模板站点，重构为以 `Django API + Next.js 工作台` 为核心的前后端分离架构。

当前阶段的重点不是一次性推翻全部旧代码，而是先把高频业务域迁移到统一的新工作台中：

- 数据中心 `datahub`
- 工具仓库 `tool_management_project`
- 主机管理与命令审计 `ops`
- 认证、审批、菜单与权限 `accounts`

## 2. 新架构分层

### 前端层

目录：`frontend/`

职责：

- 提供登录页、工作台和业务页面
- 通过 Next Route Handlers 作为 BFF 代理 Django API
- 通过 HttpOnly Cookie 保存 JWT，避免浏览器直接持有后端令牌

关键目录：

- `frontend/src/app/`
- `frontend/src/app/api/`
- `frontend/src/components/`
- `frontend/src/lib/`

### BFF 层

目录：`frontend/src/app/api/`

职责：

- 代理前端请求到 Django `/api/v1/*`
- 自动附带 access/refresh token
- access token 失效时自动刷新
- 对二进制下载、表单上传、JSON 请求做统一封装

### 后端 API 层

目录：`config/`、`apps/common/`、各业务 app

职责：

- 对外提供统一 API 契约
- 处理认证、权限、序列化、分页、异常包装
- 负责文件处理、业务模型、Agent 通信等后端能力

## 3. 目录落图

```text
interference_management_system/
├─ config/                        # Django 配置入口（settings / urls / api_urls）
├─ apps/
│  └─ common/                     # API 契约、公共权限、健康检查
├─ accounts/                      # 用户、审批、JWT 认证、菜单权限映射
├─ datahub/                       # 数据集、数据文件、测量点、热力图
├─ tool_management_project/       # 工具上传、列表、下载
├─ ops/                           # 主机资产、指标、命令执行
├─ frontend/                      # Next.js 工作台
├─ templates/                     # 旧 Django 模板（过渡期保留）
└─ docs/                          # 重构说明与后续设计文档
```

## 4. 已完成的迁移内容

### 认证与会话

- Django 已提供 JWT 登录、刷新、当前用户、菜单接口
- Next.js 已通过 `/api/auth/login`、`/api/session` 接入认证流
- 登录后统一进入 `/dashboard`
- 用户现在支持绑定部门，当前默认管理员可直接归属到 `电磁 / 干扰`

### 部门结构

- 后端已新增 `Department` 模型，用于承载公司部门树
- 当前初始化部门结构为：
  - 电磁
  - 射频
  - 电磁 / 干扰
  - 电磁 / RSE
  - 电磁 / EMC
- 前端工作台导航已切换为“按部门进入”
- 原有业务页面全部归到 `电磁 / 干扰`

### 数据中心

- 已完成数据集列表、创建、详情、文件上传、测量点查询、热力图查看
- 前端通过 `/api/datahub/*` 访问
- 后端统一落到 Django `/api/v1/datasets/*`

### 工具仓库

- 已完成工具列表、上传、下载
- 前端通过 `/api/tools/*` 访问
- 后端统一落到 Django `/api/v1/tools/*`

### 运维模块

- 已完成主机列表、新增主机、单机命令执行、命令审计列表
- 前端通过 `/api/ops/*` 访问
- 后端统一落到 Django `/api/v1/hosts/*`、`/api/v1/commands/*`

### 清理动作

- 已移除基线自带但与当前公司系统无关的旧管理台页面
- 已移除旧的 `/api/admin/*` BFF 代理残留
- 当前 Next.js 工作台只保留本项目实际业务域
- 已清空旧 `media/` 文件，当前项目以全新上传目录启动

## 5. 请求流

```text
浏览器
  -> Next.js 页面
  -> Next Route Handler (/api/*)
  -> Django API (/api/v1/*)
  -> Model / Service / 外部 Agent
```

例如：

```text
/dashboard/datasets
  -> /api/datahub/datasets
  -> /api/v1/datasets/
```

```text
/dashboard/tools
  -> /api/tools
  -> /api/v1/tools/
```

```text
/dashboard/hosts
  -> /api/ops/hosts
  -> /api/v1/hosts/
```

## 6. 当前设计取舍

### 为什么先保留 `accounts/datahub/tool_management_project/ops`

因为这四个 app 已经承载现有业务模型，当前阶段先做 API 化和工作台迁移，风险最小。

### 为什么没有立即拆成更多微服务

当前业务量和团队协作阶段，更适合先做“模块化单体 + 分离前端”：

- 迁移成本更可控
- 数据一致性更简单
- 权限和认证先统一
- 便于逐步替换旧模板页面

## 7. 下一阶段建议

### 第一阶段：平台化

- 抽出真正的 `core/platform` 概念
- 把审批、菜单、权限映射从静态定义升级成数据库模型
- 统一系统配置、审计日志、操作日志

### 第二阶段：领域稳定

- `datahub` 补齐更完整的导入规则、字段映射、任务状态
- `ops` 改为异步命令执行，接入 Celery 或任务队列
- `tools` 增加标签、分类、版本兼容信息

### 第三阶段：旧系统退场

- 将旧 Django 模板页面逐步改为只读或完全下线
- 保留必要的后台管理能力在 Django Admin
- 最终统一以 Next.js 工作台为主入口

## 8. 建议优先补齐的工程能力

- 增加 API 测试和前端页面测试
- 为关键业务流补 fixture 与种子数据
- 增加 OpenAPI 驱动的接口联调规范
- 为 `ops` 增加命令执行超时、重试和审计追踪
- 为 `datahub` 增加导入任务记录和失败明细

## 9. 当前验证结果

已完成本地验证：

- `python manage.py check`
- `python manage.py makemigrations --check --dry-run`
- `python manage.py test --settings=config.settings.test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

说明：

- Django 当前无系统检查错误
- 暂无自动化测试用例，因此测试结果为 `0 tests`
- Next.js 生产构建已通过

## 10. 初始化命令

当前仓库已经内置系统冷启动命令：

```bash
python manage.py bootstrap_system
```

它会完成两件事：

- 创建默认部门树
- 创建或更新默认管理员 `admin`

当前默认管理员账号：

- 用户名：`admin`
- 密码：`admin123`
