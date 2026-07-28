import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { IncidentManagerPanel } from "@/components/production-readiness/IncidentManagerPanel";

export const metadata = {
  title: "Incidentes — ForgeOS",
  description: "Program 6500 — Gestión de incidentes (stub localStorage)",
};

export default function IncidentsPage() {
  return (
    <OsModuleFrame title="Incidentes" description="Registro y seguimiento de incidentes de producción">
      <IncidentManagerPanel />
    </OsModuleFrame>
  );
}
