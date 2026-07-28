import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { ReleaseManagerPanel } from "@/components/production-readiness/ReleaseManagerPanel";

export const metadata = {
  title: "Releases — ForgeOS",
  description: "Program 6500 — Seguimiento de releases y gates de despliegue",
};

export default function ReleasesPage() {
  return (
    <OsModuleFrame title="Releases" description="Historial de despliegues y gates pre-deploy">
      <ReleaseManagerPanel />
    </OsModuleFrame>
  );
}
