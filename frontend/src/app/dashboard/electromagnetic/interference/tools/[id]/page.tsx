import { ToolDetailPage } from "@/components/tool-detail-page";

export default async function InterferenceToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ToolDetailPage toolId={id} />;
}
