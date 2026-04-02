import { DashboardSessionProvider } from "@/components/dashboard-session-provider";
import { DashboardShell } from "@/components/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSessionProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardSessionProvider>
  );
}
