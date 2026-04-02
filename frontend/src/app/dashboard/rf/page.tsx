import { DepartmentPlaceholderPage } from "@/components/department-placeholder-page";

export default function DashboardRfPage() {
  return (
    <DepartmentPlaceholderPage
      backHref="/dashboard"
      backLabel="返回工作台"
      description="射频作为一级部门页面已经创建，当前阶段先保留为空白结构。"
      eyebrow="射频事业部"
      nextHint="后续如果你开始拆射频模块，我们就可以直接在这个页面下搭自己的工作区。"
      permission="department.rf.view"
      title="射频页面暂未填充内容"
    />
  );
}
