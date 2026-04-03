/**
 * 与后端 `tool_management_project.demo_tools_data.generate_mock_tools()` 对齐的元数据摘要，
 * 供单测、Story、MSW 等使用；运行中列表/详情数据仍以 API 为准。
 */
export type MockToolSummary = {
  code: string;
  name: string;
  category: string;
  status: "active" | "testing" | "deprecated";
  versionCount: number;
  latestVersion: string;
};

const MOCK_TOOL_SUMMARIES: MockToolSummary[] = [
  { code: "if-signal-analyzer-pro", name: "干扰信号分析器 Pro", category: "频谱分析", status: "active", versionCount: 6, latestVersion: "v2.0.0" },
  { code: "emi-spectrum-preprocess-engine", name: "EMI 频谱预处理引擎", category: "数据处理", status: "active", versionCount: 6, latestVersion: "v2.0.0" },
  { code: "host-log-aggregator", name: "主机日志聚合工具", category: "运维工具", status: "active", versionCount: 2, latestVersion: "v1.1.0" },
  { code: "remote-command-diagnostics", name: "远程命令诊断平台", category: "运维工具", status: "testing", versionCount: 4, latestVersion: "v1.0.0-rc1" },
  { code: "test-report-auto-aggregator", name: "测试报告自动汇总器", category: "自动化工具", status: "active", versionCount: 5, latestVersion: "v2.0.0" },
  { code: "sweep-compare-analyzer", name: "扫频结果对比分析工具", category: "测试工具", status: "active", versionCount: 3, latestVersion: "v1.2.3" },
  { code: "instrument-profile-generator", name: "仪表配置生成器", category: "自动化工具", status: "active", versionCount: 4, latestVersion: "v1.3.1" },
  { code: "field-data-sync-service", name: "数据采集同步服务", category: "数据处理", status: "active", versionCount: 5, latestVersion: "v2.0.0" },
  { code: "interference-scenario-simulator", name: "干扰场景模拟器", category: "测试工具", status: "active", versionCount: 2, latestVersion: "v2.0.0" },
  { code: "spectrum-anomaly-assistant", name: "频谱异常检测助手", category: "频谱分析", status: "active", versionCount: 6, latestVersion: "v2.2.0" },
  { code: "emc-conducted-converter-suite", name: "EMC 传导测试数据转换套件", category: "数据转换", status: "active", versionCount: 3, latestVersion: "v2.0.0" },
  { code: "darkroom-task-orchestrator", name: "暗室任务编排控制台", category: "自动化工具", status: "deprecated", versionCount: 4, latestVersion: "v1.4.1" },
  { code: "rf-chain-patrol-helper", name: "射频链路灯巡检助手", category: "运维工具", status: "deprecated", versionCount: 2, latestVersion: "v1.0.5" },
  { code: "batch-job-scheduler-adapter", name: "批处理作业调度适配器", category: "自动化工具", status: "testing", versionCount: 3, latestVersion: "v1.0.0-beta" },
  { code: "field-probe-calibration-helper", name: "场强探头校准辅助工具", category: "测试工具", status: "active", versionCount: 1, latestVersion: "v1.0.0" },
];

/** 与 seed 一致的规模（手工维护，改 Python 数据时请同步） */
export const MOCK_TOOLS_STATS = {
  toolCount: MOCK_TOOL_SUMMARIES.length,
  versionCount: MOCK_TOOL_SUMMARIES.reduce((n, t) => n + t.versionCount, 0),
} as const;

export function generateMockTools(): MockToolSummary[] {
  return MOCK_TOOL_SUMMARIES.slice();
}
