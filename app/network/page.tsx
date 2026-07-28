import { NetworkDashboard } from "@/components/intelligence-network";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "Network — ForgeOS Intelligence Network",
  description: "Red de inteligencia colectiva — benchmarks, señales y oportunidades (Program 9000)",
};

export default function NetworkPage() {
  return (
    <OsModuleFrame
      title="ForgeOS Intelligence Network"
      description="Inteligencia colectiva con aislamiento total, consentimiento explícito y datos anonimizados"
    >
      <NetworkDashboard showLabLink />
    </OsModuleFrame>
  );
}
