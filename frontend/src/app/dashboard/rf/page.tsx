import { DepartmentPlaceholderPage } from "@/components/department-placeholder-page";

export default function DashboardRfPage() {
  return (
    <DepartmentPlaceholderPage
      backHref="/dashboard"
      backLabel="返回工作台"
      eyebrow="射频事业部"
      intro="射频作为与电磁并列的一级组织，拥有独立的门户入口。本页用于说明当前建设范围、权限与后续产品节奏，避免与工作台或电磁子部门入口混淆。"
      requiredPermissions={["department.rf.view", "rf.dashboard.view"]}
      roadmap="在业务-ready 后，可在此承接射频方向的数据集、工具链与运维视图等，并与电磁事业部的子部门能力保持清晰的职责边界与导航层级。"
      status="门户结构已发布：具体业务模块尚未接入。授权用户登录后将默认进入本页或管理员汇总视图，无需再选择部门。"
      title="射频门户（建设中）"
    />
  );
}
