import { FounderDashboardView } from "@/components/founder-dashboard/FounderDashboardView";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = { title: "Analytics — ForgeOS" };

export default function OsAnalyticsPage() {
  return (
    <OsModuleFrame title="Analytics" description="Métricas y señales del portfolio">
      <FounderDashboardView />
    </OsModuleFrame>
  );
}
