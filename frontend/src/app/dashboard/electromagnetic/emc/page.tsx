import { DepartmentPlaceholderPage } from "@/components/department-placeholder-page";

export default function DashboardEmcPage() {
  return (
    <DepartmentPlaceholderPage
      backHref="/dashboard/electromagnetic"
      backLabel="返回电磁页面"
      description="EMC 子部门页面已经预留，当前阶段先不填充具体业务内容。"
      eyebrow="电磁 / EMC"
      nextHint="等 EMC 方向开始建设后，可以直接在这个页面下继续加模块。"
      permission="department.emc.view"
      title="EMC 页面暂未填充内容"
    />
  );
}
