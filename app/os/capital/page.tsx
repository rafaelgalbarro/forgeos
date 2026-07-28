import { FounderDashboardView } from "@/components/founder-dashboard/FounderDashboardView";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = { title: "Capital — ForgeOS" };

export default function OsCapitalPage() {
  return (
    <OsModuleFrame title="Capital" description="Runway, financiación y métricas de capital">
      <FounderDashboardView />
    </OsModuleFrame>
  );
}
