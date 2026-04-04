import { DepartmentPlaceholderPage } from "@/components/department-placeholder-page";

export default function DashboardEmcPage() {
  return (
    <DepartmentPlaceholderPage
      backHref="/dashboard"
      backLabel="返回工作台"
      eyebrow="电磁 · EMC 子部门"
      intro="EMC（电磁兼容）子部门门户用于集中呈现该领域的内部工作入口与治理要求。当前阶段已完成门户站位与组织挂载，便于后续接入合规、测试与文档类能力。"
      requiredPermissions={["department.emc.view", "emc.dashboard.view"]}
      roadmap="后续可在此扩展标准与报告视图、与实验室或外场数据的衔接，以及与干扰、RSE 等子部门的协同流程；扩展时将沿用部门权限 + 功能权限的双重校验。"
      status="业务能力建设中：页面结构与导航已就绪。正式业务上线前，请以部门管理员的发布说明为准。"
      title="EMC 门户（建设中）"
    />
  );
}
