import { notFound } from "next/navigation";

import { ProjectDetailPage } from "@/components/projects/project-detail-page";

export default async function DashboardProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    notFound();
  }

  return <ProjectDetailPage projectId={projectId} />;
}
