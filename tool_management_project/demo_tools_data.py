"""
高质量工具演示数据：企业内网风格名称、递进版本与差异化定位。
使用 generate_mock_tools() 生成；seed_demo_tools 依赖 DEMO_TOOLS。
"""

from __future__ import annotations

from typing import Any


def build_demo_content_bytes(tool_code: str, version: str) -> bytes:
    line = f"DEMO|tool={tool_code}|version={version}|blob=enterprise-seed\n"
    return line.encode("utf-8")


def generate_mock_tools() -> list[dict[str, Any]]:
    """生成完整工具 + 版本树（权威数据源，供 seed 与文档统计）。"""
    return [
        {
            "name": "干扰信号分析器 Pro",
            "code": "if-signal-analyzer-pro",
            "category": "频谱分析",
            "owner_department": "电磁 / 干扰",
            "summary": "面向外场与实验室的 IQ / 功率序列联合分析，支持门限模板与脉冲事件链导出，用于干扰排查与留痕。",
            "description": "与主机日志、命令审计可闭环：同一任务 ID 下可联动频谱片段、指令回放与截图报告。默认离线运行，敏感数据不落公网。",
            "status": "active",
            "tags": ["推荐", "高频使用", "现场常用"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "首版：支持 CSV 轨迹导入与单曲线门限线。",
                    "changelog": "- 首版频谱/功率双视图\n- 门限线拖拽编辑（本地会话）\n- PNG 简报导出（含水印任务号）",
                    "stub": "if-signal-pro-v1.0.0.demo",
                },
                {
                    "version": "v1.0.1",
                    "release_notes": "修复大 CSV 尾部空行导致的解析中断。",
                    "changelog": "- 解析器：忽略尾部空行与 BOM\n- 报告页品牌区与部门名可配置",
                    "stub": "if-signal-pro-v1.0.1.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "脉冲检测：新增最小脉宽与占空比过滤。",
                    "changelog": "- 脉冲检测核心算法\n- 统计面板：TopN 驻留频点\n- 导出：补充 JSON 机器可读摘要",
                    "stub": "if-signal-pro-v1.1.0.demo",
                },
                {
                    "version": "v1.2.0",
                    "release_notes": "性能：分块读入与高 DPI 屏下图表缩放优化。",
                    "changelog": "- 流式读入 >200MB 文件时内存稳态\n- 图表缩放锚点修正\n- 深色主题对比度微调",
                    "stub": "if-signal-pro-v1.2.0.demo",
                },
                {
                    "version": "v1.2.3",
                    "release_notes": "兼容 2025Q1 采样板新增「天线编号」列；模板库同步。",
                    "changelog": "- 模板库 v2025.01\n- 元数据：天线编号写入会话侧车文件\n- 旧模板自动提示升级路径",
                    "stub": "if-signal-pro-v1.2.3.demo",
                },
                {
                    "version": "v2.0.0",
                    "release_notes": "主版本：多会话基线对比与批注层（只读审计）。",
                    "changelog": "- 多会话对齐视图（基线/当前/差分）\n- 批注层仅允许审计账号写入\n- 门户主题与企业 SSO 占位钩子",
                    "stub": "if-signal-pro-v2.0.0.demo",
                },
            ],
        },
        {
            "name": "EMI 频谱预处理引擎",
            "code": "emi-spectrum-preprocess-engine",
            "category": "数据处理",
            "owner_department": "电磁 / 干扰",
            "summary": "批处理管线：去直流、窗函数、归一化与导出中间 HDF5，为分析与合规报表提供统一入口前向格式。",
            "description": "对接暗室与临时外场目录监视；失败样本自动落隔离目录并生成 reason.json，便于质控复盘。",
            "status": "active",
            "tags": ["推荐", "内部维护"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "首版：滑动平均 + 汉宁窗；输出 HDF5 schema v1。",
                    "changelog": "- HDF5 schema v1 字段冻结\n- CLI --watch 目录模式",
                    "stub": "emi-preprocess-v1.0.0.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "批处理队列与失败重试目录。",
                    "changelog": "- 队列：最大并行度可配置\n- 失败目录含 stderr 摘要",
                    "stub": "emi-preprocess-v1.1.0.demo",
                },
                {
                    "version": "v1.2.0",
                    "release_notes": "新增凯塞窗与带通抽取预设（合规审查用）。",
                    "changelog": "- 预设库 emi_bandpass_pack_v1\n- 配置校验：Nyquist 容错提示",
                    "stub": "emi-preprocess-v1.2.0.demo",
                },
                {
                    "version": "v1.3.1",
                    "release_notes": "schema v2：新增 GPS 时间与仪器序列号（可选列）。",
                    "changelog": "- HDF5 schema v2 向后兼容读\n- 元数据缺失时降级为 v1 导出",
                    "stub": "emi-preprocess-v1.3.1.demo",
                },
                {
                    "version": "v1.4.0",
                    "release_notes": "守护进程占位：计划任务 crontab 导出模板。",
                    "changelog": "- systemd/cron 双模板\n- 健康检查 JSON 端点占位",
                    "stub": "emi-preprocess-v1.4.0.demo",
                },
                {
                    "version": "v2.0.0",
                    "release_notes": "大版本：流水线图配置 UI（内网静态资源），规则与代码映射表拆分。",
                    "changelog": "- rules.yaml 与 code_map.yaml 分离\n- UI 仅引用内网 CDN 路径\n- 批处理报告增加 sha256 清单",
                    "stub": "emi-preprocess-v2.0.0.demo",
                },
            ],
        },
        {
            "name": "主机日志聚合工具",
            "code": "host-log-aggregator",
            "category": "运维工具",
            "owner_department": "电磁 / 干扰",
            "summary": "在授权时间窗内从目标主机收集 systemd/journal 与指定文本日志，打 tar 包并生成索引清单。",
            "description": "适用于排障首响阶段：支持按服务名、级别与关键字白名单截取，避免整盘拖拽。",
            "status": "active",
            "tags": ["现场常用", "高频使用"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "首版 tar.gz 输出与 manifest.csv。",
                    "changelog": "- manifest：路径/mtime/sha256\n- 超时与单文件上限策略",
                    "stub": "host-log-aggr-v1.0.0.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "脱敏规则包 v1：IP/MAC 可哈希掩码。",
                    "changelog": "- 规则包 hot-reload（本地目录）\n- GPU 指标快照可选模块",
                    "stub": "host-log-aggr-v1.1.0.demo",
                },
            ],
        },
        {
            "name": "远程命令诊断平台",
            "code": "remote-command-diagnostics",
            "category": "运维工具",
            "owner_department": "电磁 / 干扰",
            "summary": "只读回放已通过审计通道下发的指令上下文，生成检查脚本草稿，不直接执行远程改写。",
            "description": "限制在干扰条线试点账号；所有导出带水印与操作者域账号。",
            "status": "testing",
            "tags": ["测试中", "内部维护"],
            "versions": [
                {
                    "version": "v0.9.0",
                    "release_notes": "内测：单机时间线 JSON 导出。",
                    "changelog": "- 与审计弱关联字段 trial-1\n- 无写权限设计验证",
                    "stub": "rem-cmd-diag-v0.9.0.demo",
                },
                {
                    "version": "v0.10.0",
                    "release_notes": "多主机选择与只读沙箱说明面板。",
                    "changelog": "- 批量视图骨架\n- 沙箱「仅仿真」文案固化",
                    "stub": "rem-cmd-diag-v0.10.0.demo",
                },
                {
                    "version": "v0.11.2",
                    "release_notes": "修复审计 ID 偏移；强化权限不足提示。",
                    "changelog": "- 关联表 migrations 对齐\n- 403 时引导联系值班号",
                    "stub": "rem-cmd-diag-v0.11.2.demo",
                },
                {
                    "version": "v1.0.0-rc1",
                    "release_notes": "RC：试点开关与企业门户导航回链。",
                    "changelog": "- feature flag 与门户 deep link\n- RC 声明页",
                    "stub": "rem-cmd-diag-v1.0.0-rc1.demo",
                },
            ],
        },
        {
            "name": "测试报告自动汇总器",
            "code": "test-report-auto-aggregator",
            "category": "自动化工具",
            "owner_department": "电磁 / 干扰",
            "summary": "按章节目录合并多份子报告（Word/Markdown 片段），生成总表与目录可锚定 PDF 骨架。",
            "description": "内嵌「占位图表」策略：外链仅允许 file:// 或内网只读挂载前缀白名单。",
            "status": "active",
            "tags": ["推荐", "内部维护"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "装订顺序 YAML + 总表 XLSX。",
                    "changelog": "- YAML 顺序与缺页告警\n- XLSX 多 sheet 封面/附录",
                    "stub": "test-rpt-aggr-v1.0.0.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "页眉部门水印与保密级别参数。",
                    "changelog": "- 水印与保密角标\n- PDF 引擎版本钉扎",
                    "stub": "test-rpt-aggr-v1.1.0.demo",
                },
                {
                    "version": "v1.2.3",
                    "release_notes": "修复子文档样式继承导致的目录页码错位。",
                    "changelog": "- 样式继承规则重写\n- 回滚单个子文档开关",
                    "stub": "test-rpt-aggr-v1.2.3.demo",
                },
                {
                    "version": "v1.3.0",
                    "release_notes": "批处理：watch 目录增量合并。",
                    "changelog": "- inotify 增量（Linux）\n- Windows 轮询回退",
                    "stub": "test-rpt-aggr-v1.3.0.demo",
                },
                {
                    "version": "v2.0.0",
                    "release_notes": "引入签章占位与导出审计记录（CSV）。",
                    "changelog": "- 签章坐标模板\n- 导出审计：who/when/what",
                    "stub": "test-rpt-aggr-v2.0.0.demo",
                },
            ],
        },
        {
            "name": "扫频结果对比分析工具",
            "code": "sweep-compare-analyzer",
            "category": "测试工具",
            "owner_department": "电磁 / 干扰",
            "summary": "对两次或多次扫频峰表做对齐与公差带对比，输出差分曲线与回归检查表。",
            "description": "支持冻结基线版本；差分结果可一键同步到测试报告汇总器模板。",
            "status": "active",
            "tags": ["现场常用"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "双批次对齐 + 差分 CSV。",
                    "changelog": "- 对齐算法 v1（最近邻）\n- 公差带颜色图例",
                    "stub": "sweep-cmp-v1.0.0.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "三批及以上 N×N 对比矩阵（只读）。",
                    "changelog": "- 矩阵热力导出 PNG\n- 内存上限保护",
                    "stub": "sweep-cmp-v1.1.0.demo",
                },
                {
                    "version": "v1.2.3",
                    "release_notes": "频漂容忍配置：PPB 级微调与批注导出。",
                    "changelog": "- 漂移模型 linear+cubic 选项\n- 批注 JSON 侧车",
                    "stub": "sweep-cmp-v1.2.3.demo",
                },
            ],
        },
        {
            "name": "仪表配置生成器",
            "code": "instrument-profile-generator",
            "category": "自动化工具",
            "owner_department": "电磁 / 干扰",
            "summary": "从测试计划表格生成 SCPI/专有序列 profile，降低手工抄写指令的错误率。",
            "description": "列映射表按项目隔离存放；生成记录写入 tool_versions 同级审计占位。",
            "status": "active",
            "tags": ["内部维护"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "单表多仪器 profile 导出。",
                    "changelog": "- Excel 列绑定 DSL v1\n- profile JSON schema 校验",
                    "stub": "inst-prof-gen-v1.0.0.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "IF 频段条件分支（有限表达式）。",
                    "changelog": "- 表达式求值沙箱（白名单函数）\n- 错误行号回指 Excel",
                    "stub": "inst-prof-gen-v1.1.0.demo",
                },
                {
                    "version": "v1.2.0",
                    "release_notes": "模板版本与工具主版本绑定校验。",
                    "changelog": "- semver 比对提示\n- CI 门禁示例脚本",
                    "stub": "inst-prof-gen-v1.2.0.demo",
                },
                {
                    "version": "v1.3.1",
                    "release_notes": "补充罗德与是德常用指令片段库（离线包）。",
                    "changelog": "- 片段库 rs2025Q1.zip 校验和公示\n- 仅内网离线安装指引",
                    "stub": "inst-prof-gen-v1.3.1.demo",
                },
            ],
        },
        {
            "name": "数据采集同步服务",
            "code": "field-data-sync-service",
            "category": "数据处理",
            "owner_department": "电磁 / 干扰",
            "summary": "断点续传 + 校验和确认的目录同步，面向笔记本—服务器受控拷贝，不经公网。",
            "description": "支持带宽配额与按任务 ID 过滤；失败块单独重排队列。",
            "status": "active",
            "tags": ["高频使用", "推荐"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "rsync 语义子集 + SHA256 清单。",
                    "changelog": "- 清单增量比对\n- 限速 tokens/s",
                    "stub": "field-sync-v1.0.0.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "任务 ID 过滤器与排除通配。",
                    "changelog": "- .syncignore 规则\n- 过滤前后 dry-run 统计",
                    "stub": "field-sync-v1.1.0.demo",
                },
                {
                    "version": "v1.2.0",
                    "release_notes": "Windows 长路径与 UNC 映射修复。",
                    "changelog": "- Win32 长路径策略检测\n- 日志编码 UTF-8 强制",
                    "stub": "field-sync-v1.2.0.demo",
                },
                {
                    "version": "v1.3.0",
                    "release_notes": "分块压缩与失败区块单独重传。",
                    "changelog": "- zstd 分块（可选）\n- 重传队列持久化",
                    "stub": "field-sync-v1.3.0.demo",
                },
                {
                    "version": "v2.0.0",
                    "release_notes": "多站点拓扑：星型 Hub 只读镜像策略。",
                    "changelog": "- Hub 端只读 token\n- 拓扑图导出 Graphviz",
                    "stub": "field-sync-v2.0.0.demo",
                },
            ],
        },
        {
            "name": "干扰场景模拟器",
            "code": "interference-scenario-simulator",
            "category": "测试工具",
            "owner_department": "电磁 / 干扰",
            "summary": "在仿真链路注入可参数化干扰模板，用于接收机策略回归与培训演示（非实时硬件在环）。",
            "description": "所有波形定义文件均经病毒扫描门禁后入库；默认禁止加载外网 URL。",
            "status": "active",
            "tags": ["内部维护"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "场景脚本 YAML v1 + 结果对比 CSV。",
                    "changelog": "- 场景浏览器\n- 指标：误码率/捕获率占位",
                    "stub": "if-scn-sim-v1.0.0.demo",
                },
                {
                    "version": "v2.0.0",
                    "release_notes": "主版本：多射频端口拓扑与延迟抖动模型。",
                    "changelog": "- 拓扑：2×2 MIMO 演示\n- 抖动模型 lognormal 可配置\n- 报告含水印「仿真」字样",
                    "stub": "if-scn-sim-v2.0.0.demo",
                },
            ],
        },
        {
            "name": "频谱异常检测助手",
            "code": "spectrum-anomaly-assistant",
            "category": "频谱分析",
            "owner_department": "电磁 / 干扰",
            "summary": "基于滑动统计与轻量阈值的异常突起检测，适合对长时监测序列做首轮筛选而非最终裁定。",
            "description": "可与干扰信号分析器 Pro 联动：导出事件列表直投分析器任务队列。",
            "status": "active",
            "tags": ["推荐", "高频使用", "内部维护"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "首版：Z-score 与 robust MAD 双轨。",
                    "changelog": "- 双轨阈值并行\n- 事件 CSV：t_start,t_end,f_ceff,score",
                    "stub": "spec-anomaly-v1.0.0.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "季节性与夜间基线拆分（实验性）。",
                    "changelog": "- 分桶基线表\n- 夜间加权开关",
                    "stub": "spec-anomaly-v1.1.0.demo",
                },
                {
                    "version": "v1.2.3",
                    "release_notes": "抑制偶发单点毛刺：Hampel 滤波可选。",
                    "changelog": "- Hampel 窗口自适应\n- 性能：向量化热点路径",
                    "stub": "spec-anomaly-v1.2.3.demo",
                },
                {
                    "version": "v2.0.0",
                    "release_notes": "引入轻量模型插件接口（仍默认关闭外连下载）。",
                    "changelog": "- 插件 manifest.json 校验\n- 沙箱进程隔离（PoC）\n- 默认仅启用内置 stub 模型",
                    "stub": "spec-anomaly-v2.0.0.demo",
                },
                {
                    "version": "v2.1.1",
                    "release_notes": "门户看板数据源 JSON（只读聚合）。",
                    "changelog": "- JSON 聚合端点（内网）\n- Cache-Control 与 ETag 策略",
                    "stub": "spec-anomaly-v2.1.1.demo",
                },
                {
                    "version": "v2.2.0",
                    "release_notes": "企业内网大规模部署优化与可观测性完善。",
                    "changelog": "- 性能：事件合并阶段由 O(n²) 降为 O(n log n)，万级片段场景下延迟约降至 1/8。\n- 观测：OpenMetrics 导出可选；日志采样率按科室代码分流。\n- 稳定性：修复长时间运行后内部 LRU 缓存无限增长导致的内存爬升（GC 友好策略）。\n- 安全：插件目录默认只读挂载校验；校验失败时拒绝启动并给出修复指引。\n- 兼容：分析器 Pro v2.0.x 事件字段全量对齐；旧版 v1.x 事件自动升级转换（带备份）。\n- 文档：补充「误报压降」调参手册与三场典型演练回放脚本。",
                    "stub": "spec-anomaly-v2.2.0.demo",
                },
            ],
        },
        {
            "name": "EMC 传导测试数据转换套件",
            "code": "emc-conducted-converter-suite",
            "category": "数据转换",
            "owner_department": "电磁 / 干扰",
            "summary": "在主流传导测试导出格式（多厂商 CSV）与公司测量中台 schema 之间做字段映射与单位换算。",
            "description": "映射表 Git 分支与工具版本号绑定发布；回滚映射需双人复核记录占位。",
            "status": "active",
            "tags": ["推荐"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "厂商 A/B CSV → schema v1。",
                    "changelog": "- dBuV/dBm 换算表 2024\n- 列别名表",
                    "stub": "emc-conv-v1.0.0.demo",
                },
                {
                    "version": "v1.1.0",
                    "release_notes": "多分段曲线拼接与缝隙处理。",
                    "changelog": "- gap 填充策略：hold/interp\n- 质检：单调性探针",
                    "stub": "emc-conv-v1.1.0.demo",
                },
                {
                    "version": "v2.0.0",
                    "release_notes": "schema v2：LISN 与海拔修正因子。",
                    "changelog": "- v2 导出开关\n- v1 读路径兼容层",
                    "stub": "emc-conv-v2.0.0.demo",
                },
            ],
        },
        {
            "name": "暗室任务编排控制台",
            "code": "darkroom-task-orchestrator",
            "category": "自动化工具",
            "owner_department": "电磁 / 干扰",
            "summary": "已停维：曾用于暗室多工位任务排队与状态灯联动，现仅保留只读导出作历史对照。",
            "description": "2024 起由新一代 MES 接管；本工具进入只归档通道，不提供新特性承诺。",
            "status": "deprecated",
            "tags": ["历史工具", "内部维护"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "首版工位队列与灯光 GPIO 占位。",
                    "changelog": "- 队列：FIFO + 值班插单软锁\n- GPIO 驱动 stub",
                    "stub": "darkroom-orch-v1.0.0.demo",
                },
                {
                    "version": "v1.2.0",
                    "release_notes": "与旧版证书系统账号同步（LDAP 只读）。",
                    "changelog": "- LDAP 组映射\n- 会话断线重连",
                    "stub": "darkroom-orch-v1.2.0.demo",
                },
                {
                    "version": "v1.3.3",
                    "release_notes": "稳定性：修复凌晨批量任务撞锁。",
                    "changelog": "- 锁租约 TTL\n- 值班交接提示",
                    "stub": "darkroom-orch-v1.3.3.demo",
                },
                {
                    "version": "v1.4.1",
                    "release_notes": "终版：只读导出与 EOL 声明页。",
                    "changelog": "- EOL banner\n- 导出 JSON 冻结字段集",
                    "stub": "darkroom-orch-v1.4.1.demo",
                },
            ],
        },
        {
            "name": "射频链路灯巡检助手",
            "code": "rf-chain-patrol-helper",
            "category": "运维工具",
            "owner_department": "电磁 / 干扰",
            "summary": "归档：用于机房链路指示灯目视巡检清单与照片对齐，已迁移至统一运维 CMDB。",
            "description": "保留最后只读构建供历史照片批次对齐比对。",
            "status": "deprecated",
            "tags": ["历史工具"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "首版检查表 + 照片时间戳校验。",
                    "changelog": "- 检查表 PDF\n- 照片 EXIF 解析",
                    "stub": "rf-patrol-v1.0.0.demo",
                },
                {
                    "version": "v1.0.5",
                    "release_notes": "终修：CMDB 替代声明与导出锁定。",
                    "changelog": "- 锁定写操作\n- 跳转 CMDB 深链",
                    "stub": "rf-patrol-v1.0.5.demo",
                },
            ],
        },
        {
            "name": "批处理作业调度适配器",
            "code": "batch-job-scheduler-adapter",
            "category": "自动化工具",
            "owner_department": "电磁 / 干扰",
            "summary": "将科室既有 Windows 任务计划 / Linux cron 描述转换为统一作业描述 JSON，便于后续接入集中调度（试点）。",
            "description": "当前仅转换与校验，不在生产环自动下发；与信息技术部调度试点白名单联动。",
            "status": "testing",
            "tags": ["测试中"],
            "versions": [
                {
                    "version": "v0.8.0",
                    "release_notes": "内测：cron 解析子集 + JSON Schema 校验。",
                    "changelog": "- cron 子集文法\n- JSON Schema draft-07",
                    "stub": "batch-adapt-v0.8.0.demo",
                },
                {
                    "version": "v0.9.2",
                    "release_notes": "增加 Windows Task XML 导入（只读）。",
                    "changelog": "- Trigger 映射表 v1\n- 冲突检测：同分钟重复",
                    "stub": "batch-adapt-v0.9.2.demo",
                },
                {
                    "version": "v1.0.0-beta",
                    "release_notes": "Beta：与门户只读作业目录清单对齐。",
                    "changelog": "- 清单字段对齐 portal beta\n- Beta 徽标",
                    "stub": "batch-adapt-v1.0.0-beta.demo",
                },
            ],
        },
        {
            "name": "场强探头校准辅助工具",
            "code": "field-probe-calibration-helper",
            "category": "测试工具",
            "owner_department": "电磁 / 干扰",
            "summary": "单文件工具：根据标准探头系数表生成当日校准会话记录模板，适合低频人工流程。",
            "description": "仅生成模板，不参与实验室计量授权；正式校准仍以计量系统为准。",
            "status": "active",
            "tags": ["内部维护"],
            "versions": [
                {
                    "version": "v1.0.0",
                    "release_notes": "首版系数表 CSV → 校准会话 YAML。",
                    "changelog": "- 系数表版本钉扎\n- YAML 含环境温湿度占位",
                    "stub": "probe-cal-v1.0.0.demo",
                },
            ],
        },
    ]


DEMO_TOOLS: list[dict[str, Any]] = generate_mock_tools()

DEMO_TOOL_CODES: tuple[str, ...] = tuple(t["code"] for t in DEMO_TOOLS)


def demo_tool_count() -> int:
    return len(DEMO_TOOLS)


def demo_version_count() -> int:
    return sum(len(t["versions"]) for t in DEMO_TOOLS)
