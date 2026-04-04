import { DepartmentPlaceholderPage } from "@/components/department-placeholder-page";

export default function DashboardRsePage() {
  return (
    <DepartmentPlaceholderPage
      backHref="/dashboard"
      backLabel="返回工作台"
      eyebrow="电磁 · RSE 子部门"
      intro="RSE（Radio Systems Engineering）面向射频系统与相关工程场景的能力建设。当前站点已纳入企业部门化门户架构，本页为该子部门的统一入口与说明承载。"
      requiredPermissions={["department.rse.view", "rse.dashboard.view"]}
      roadmap="规划在门户第一屏落地工作待办与项目状态、与电磁其他子部门的协作入口，并按业务节奏接入数据、工具与流程类模块；实施前将同步权限与菜单策略。"
      status="业务模块尚未接入：路由、导航与权限已与全站统一。您可在左侧导航确认授权范围；具体业务功能将按迭代计划发布。"
      title="RSE 门户（建设中）"
    />
  );
}
