import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { AlertCenterPanel } from "@/components/production-readiness/AlertCenterPanel";

export const metadata = {
  title: "Alertas — ForgeOS",
  description: "Program 6500 — Centro de alertas de producción",
};

export default function AlertsPage() {
  return (
    <OsModuleFrame title="Alertas" description="Registro de alertas — localStorage">
      <AlertCenterPanel />
    </OsModuleFrame>
  );
}
