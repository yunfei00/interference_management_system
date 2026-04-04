import { InterferenceSectionLayout } from "@/components/interference-section-layout";

export default function InterferenceSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InterferenceSectionLayout>{children}</InterferenceSectionLayout>;
}
