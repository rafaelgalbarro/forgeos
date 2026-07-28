import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { NetworkInsightsPageClient } from "./NetworkInsightsPageClient";

export const metadata = {
  title: "Network Insights — ForgeOS",
  description: "Insights ejecutivos y recomendaciones de la red de inteligencia colectiva",
};

export default function NetworkInsightsPage() {
  return (
    <OsModuleFrame
      title="Network Insights"
      description="Insights ejecutivos, patrones y recomendaciones agregadas — Program 9000"
    >
      <NetworkInsightsPageClient />
    </OsModuleFrame>
  );
}
