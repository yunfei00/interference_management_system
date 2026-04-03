import type {
  PaginatedPayload,
  ToolDetailPayload,
  ToolListItem,
  ToolVersionRow,
} from "@/lib/contracts";
import { generateMockTools, type MockToolSummary } from "@/lib/mock/tools";

/** 与 seed 文案对齐的列表/详情展示字段（仅 mock 路径使用）。 */
const TOOL_COPY: Record<
  string,
  { summary: string; description: string; tags: string[] }
> = {
  "if-signal-analyzer-pro": {
    summary:
      "面向外场与实验室的 IQ / 功率序列联合分析，支持门限模板与脉冲事件链导出，用于干扰排查与留痕。",
    description:
      "与主机日志、命令审计可闭环：同一任务 ID 下可联动频谱片段、指令回放与截图报告。默认离线运行，敏感数据不落公网。",
    tags: ["推荐", "高频使用", "现场常用"],
  },
  "emi-spectrum-preprocess-engine": {
    summary:
      "批处理管线：去直流、窗函数、归一化与导出中间 HDF5，为分析与合规报表提供统一入口前向格式。",
    description:
      "对接暗室与临时外场目录监视；失败样本自动落隔离目录并生成 reason.json，便于质控复盘。",
    tags: ["推荐", "内部维护"],
  },
  "host-log-aggregator": {
    summary:
      "在授权时间窗内从目标主机收集 systemd/journal 与指定文本日志，打 tar 包并生成索引清单。",
    description:
      "适用于排障首响阶段：支持按服务名、级别与关键字白名单截取，避免整盘拖拽。",
    tags: ["现场常用", "高频使用"],
  },
  "remote-command-diagnostics": {
    summary:
      "只读回放已通过审计通道下发的指令上下文，生成检查脚本草稿，不直接执行远程改写。",
    description: "限制在干扰条线试点账号；所有导出带水印与操作者域账号。",
    tags: ["测试中", "内部维护"],
  },
  "test-report-auto-aggregator": {
    summary:
      "按章节目录合并多份子报告（Word/Markdown 片段），生成总表与目录可锚定 PDF 骨架。",
    description:
      "内嵌「占位图表」策略：外链仅允许 file:// 或内网只读挂载前缀白名单。",
    tags: ["推荐", "内部维护"],
  },
  "sweep-compare-analyzer": {
    summary: "对两次或多次扫频峰表做对齐与公差带对比，输出差分曲线与回归检查表。",
    description: "支持冻结基线版本；差分结果可一键同步到测试报告汇总器模板。",
    tags: ["现场常用"],
  },
  "instrument-profile-generator": {
    summary: "从测试计划表格生成 SCPI/专有序列 profile，降低手工抄写指令的错误率。",
    description: "列映射表按项目隔离存放；生成记录写入 tool_versions 同级审计占位。",
    tags: ["内部维护"],
  },
  "field-data-sync-service": {
    summary:
      "断点续传 + 校验和确认的目录同步，面向笔记本—服务器受控拷贝，不经公网。",
    description: "支持带宽配额与按任务 ID 过滤；失败块单独重排队列。",
    tags: ["高频使用", "推荐"],
  },
  "interference-scenario-simulator": {
    summary:
      "在仿真链路注入可参数化干扰模板，用于接收机策略回归与培训演示（非实时硬件在环）。",
    description: "所有波形定义文件均经病毒扫描门禁后入库；默认禁止加载外网 URL。",
    tags: ["内部维护"],
  },
  "spectrum-anomaly-assistant": {
    summary:
      "基于滑动统计与轻量阈值的异常突起检测，适合对长时监测序列做首轮筛选而非最终裁定。",
    description:
      "可与干扰信号分析器 Pro 联动：导出事件列表直投分析器任务队列。",
    tags: ["推荐", "高频使用", "内部维护"],
  },
  "emc-conducted-converter-suite": {
    summary:
      "在主流传导测试导出格式（多厂商 CSV）与公司测量中台 schema 之间做字段映射与单位换算。",
    description:
      "映射表 Git 分支与工具版本号绑定发布；回滚映射需双人复核记录占位。",
    tags: ["推荐"],
  },
  "darkroom-task-orchestrator": {
    summary:
      "已停维：曾用于暗室多工位任务排队与状态灯联动，现仅保留只读导出作历史对照。",
    description:
      "2024 起由新一代 MES 接管；本工具进入只归档通道，不提供新特性承诺。",
    tags: ["历史工具", "内部维护"],
  },
  "rf-chain-patrol-helper": {
    summary:
      "归档：用于机房链路指示灯目视巡检清单与照片对齐，已迁移至统一运维 CMDB。",
    description: "保留最后只读构建供历史照片批次对齐比对。",
    tags: ["历史工具"],
  },
  "batch-job-scheduler-adapter": {
    summary:
      "将科室既有 Windows 任务计划 / Linux cron 描述转换为统一作业描述 JSON，便于后续接入集中调度（试点）。",
    description:
      "当前仅转换与校验，不在生产环自动下发；与信息技术部调度试点白名单联动。",
    tags: ["测试中"],
  },
  "field-probe-calibration-helper": {
    summary:
      "单文件工具：根据标准探头系数表生成当日校准会话记录模板，适合低频人工流程。",
    description: "仅生成模板，不参与实验室计量授权；正式校准仍以计量系统为准。",
    tags: ["内部维护"],
  },
};

const LONG_V2_2_CHANGELOG = `- 性能：事件合并阶段由 O(n²) 降为 O(n log n)，万级片段场景下延迟约降至 1/8。
- 观测：OpenMetrics 导出可选；日志采样率按科室代码分流。
- 稳定性：修复长时间运行后内部 LRU 缓存无限增长导致的内存爬升（GC 友好策略）。
- 安全：插件目录默认只读挂载校验；校验失败时拒绝启动并给出修复指引。
- 兼容：分析器 Pro v2.0.x 事件字段全量对齐；旧版 v1.x 事件自动升级转换（带备份）。
- 文档：补充「误报压降」调参手册与三场典型演练回放脚本。`;

function listFromSummaries(): MockToolSummary[] {
  return generateMockTools();
}

function mockVersionsForTool(
  toolId: number,
  spec: MockToolSummary,
): ToolVersionRow[] {
  const n = spec.versionCount;
  const rows: ToolVersionRow[] = [];
  const base = Date.UTC(2024, 0, 15);
  const isSpectrum = spec.code === "spectrum-anomaly-assistant";

  for (let i = 0; i < n; i++) {
    const isLatest = i === 0;
    const versionLabel = isLatest
      ? spec.latestVersion
      : `v1.${Math.max(0, n - 1 - i)}.${i === 1 ? 2 : 0}`;

    let changelog = `- 构建 ${versionLabel} 增量修复与回归用例补充\n- 内网部署：离线依赖清单同步`;
    let releaseNotes = `${versionLabel}：稳定性与可观测性更新，详见变更记录。`;

    if (isSpectrum && isLatest) {
      releaseNotes =
        "企业内网大规模部署优化与可观测性完善（含长变更说明，便于折叠演示）。";
      changelog = LONG_V2_2_CHANGELOG;
    }

    const vid = toolId * 100 + (n - i);
    rows.push({
      id: vid,
      version: versionLabel,
      release_notes: releaseNotes,
      changelog,
      file_name: `${spec.code}-${versionLabel.replace(/\./g, "-")}.demo.zip`,
      file_size: 2048 + i * 400,
      checksum: `sha256-mock-${spec.code}-${i}`,
      is_latest: isLatest,
      created_at: new Date(base - i * 14 * 86400000).toISOString(),
      created_by: null,
      created_by_username: i === 0 ? "seed_bot" : "historical_uploader",
      download_path: `/api/tools/${toolId}/versions/${vid}/download`,
    });
  }
  return rows;
}

export function buildAllMockToolListItems(): ToolListItem[] {
  const summaries = listFromSummaries();
  const now = new Date().toISOString();
  return summaries.map((spec, index) => {
    const id = index + 1;
    const copy = TOOL_COPY[spec.code] ?? {
      summary: `${spec.name}（mock 简介）`,
      description: "演示数据：后端未连通时由前端生成的占位说明。",
      tags: ["演示"],
    };
    const created = new Date(Date.UTC(2023, 6, 1 + index)).toISOString();
    return {
      id,
      name: spec.name,
      code: spec.code,
      category: spec.category,
      owner_department: "电磁 / 干扰",
      summary: copy.summary,
      description: copy.description,
      status: spec.status,
      latest_version: spec.latestVersion,
      icon: "",
      tags: copy.tags,
      created_by_username: "seed_bot",
      created_at: created,
      updated_at: now,
      versions_count: spec.versionCount,
    };
  });
}

export function buildMockToolsPaginated(
  page: number,
  pageSize: number,
): PaginatedPayload<ToolListItem> {
  const all = buildAllMockToolListItems();
  const p = Math.max(1, page);
  const size = Math.max(1, pageSize);
  const start = (p - 1) * size;
  const items = all.slice(start, start + size);
  const count = all.length;
  const pages = Math.ceil(count / size) || 1;
  return {
    items,
    pagination: {
      page: p,
      page_size: size,
      count,
      pages,
      next: p < pages ? `/api/tools?page=${p + 1}` : null,
      previous: p > 1 ? `/api/tools?page=${p - 1}` : null,
    },
  };
}

export function buildMockToolDetail(toolId: string): ToolDetailPayload | null {
  const id = Number.parseInt(toolId, 10);
  if (!Number.isFinite(id) || id < 1) {
    return null;
  }
  const summaries = listFromSummaries();
  const spec = summaries[id - 1];
  if (!spec) {
    return null;
  }
  const listItem = buildAllMockToolListItems()[id - 1];
  const versions = mockVersionsForTool(id, spec);
  return {
    ...listItem,
    created_by: 1,
    versions,
  };
}
