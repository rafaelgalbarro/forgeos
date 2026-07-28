import type { Metadata } from "next";
import { FounderDashboardView } from "@/components/founder-dashboard/FounderDashboardView";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata: Metadata = {
  title: "Portfolio — ForgeOS",
};

export default function OsPortfolioPage() {
  return (
    <OsModuleFrame title="Portfolio" description="Empresas y ventures del fundador">
      <FounderDashboardView />
    </OsModuleFrame>
  );
}
