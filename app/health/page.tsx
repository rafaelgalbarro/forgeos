import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { ProductionChecklistPanel } from "@/components/production-readiness/ProductionChecklistPanel";
import { SystemMonitoringPanel } from "@/components/production-readiness/SystemMonitoringPanel";
import Link from "next/link";

export const metadata = {
  title: "Salud — ForgeOS",
  description: "Program 6500 — Health checks y monitoreo de sistema",
};

export default function HealthPage() {
  return (
    <OsModuleFrame
      title="Salud del sistema"
      description="Health checks agregados, sistema, runtime y AI"
    >
      <div className="fhis-prod-health-page">
        <nav className="fhis-prod-nav">
          <Link href="/production">← Production Center</Link>
          <Link href="/monitoring">Monitoreo →</Link>
        </nav>
        <SystemMonitoringPanel />
        <ProductionChecklistPanel />
      </div>
    </OsModuleFrame>
  );
}
