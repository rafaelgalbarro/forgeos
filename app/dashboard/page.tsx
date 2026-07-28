import { DashboardView } from "@/components/dashboard/DashboardView";
import { LegacyConsolidationBanner } from "@/components/layout/LegacyConsolidationBanner";

export default function DashboardPage() {
  return (
    <>
      <LegacyConsolidationBanner from="/dashboard" />
      <DashboardView />
    </>
  );
}
