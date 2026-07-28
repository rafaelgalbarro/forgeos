import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { SystemMonitoringPanel } from "@/components/production-readiness/SystemMonitoringPanel";
import { PerformanceDashboardPanel } from "@/components/production-readiness/PerformanceDashboardPanel";

export const metadata = {
  title: "Monitoreo — ForgeOS",
  description: "Program 6500 — Monitoreo de sistema, runtime y rendimiento",
};

export default function MonitoringPage() {
  return (
    <OsModuleFrame title="Monitoreo" description="Sistema, runtime, AI y métricas de rendimiento">
      <SystemMonitoringPanel />
      <PerformanceDashboardPanel />
    </OsModuleFrame>
  );
}
