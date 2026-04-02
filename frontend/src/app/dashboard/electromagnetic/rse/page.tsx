import { DepartmentPlaceholderPage } from "@/components/department-placeholder-page";

export default function DashboardRsePage() {
  return (
    <DepartmentPlaceholderPage
      backHref="/dashboard/electromagnetic"
      backLabel="返回电磁页面"
      description="RSE 子部门页面已经预留，当前阶段先不填充具体业务内容。"
      eyebrow="电磁 / RSE"
      nextHint="后续可以在这里继续扩展 RSE 自己的数据、工具和流程页面。"
      permission="department.rse.view"
      title="RSE 页面暂未填充内容"
    />
  );
}
