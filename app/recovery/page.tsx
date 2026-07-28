import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { RecoveryCenterPanel } from "@/components/production-readiness/RecoveryCenterPanel";

export const metadata = {
  title: "Recuperación — ForgeOS",
  description: "Program 6500 — Procedimientos de recuperación y DR",
};

export default function RecoveryPage() {
  return (
    <OsModuleFrame title="Recuperación" description="Procedimientos, backups y disaster recovery (stub)">
      <RecoveryCenterPanel />
    </OsModuleFrame>
  );
}
