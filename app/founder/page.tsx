import type { Metadata } from "next";
import { FounderDashboardView } from "@/components/founder-dashboard/FounderDashboardView";
import { FounderJourneyShell } from "@/components/founder-journey/FounderJourneyShell";
import { LegacyConsolidationBanner } from "@/components/layout/LegacyConsolidationBanner";

export const metadata: Metadata = {
  title: "Founder Experience — ForgeOS",
  description: "Punto de entrada del fundador — ForgeOS Venture Creator",
};

export default function FounderPage() {
  return (
    <FounderJourneyShell showBanner={false}>
      <LegacyConsolidationBanner from="/founder" />
      <FounderDashboardView />
    </FounderJourneyShell>
  );
}
