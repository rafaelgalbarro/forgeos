import { CommandCenterDashboard } from "@/components/command-center/CommandCenterDashboard";
import { LegacyExperienceBanner } from "@/components/experience/LegacyExperienceBanner";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { loadCommandCenterSummary } from "@/lib/command-center/summary-loader";

export const metadata = {
  title: "Command Center — ForgeOS",
  description: "Program 4500 — Centro de mando del fundador (legacy)",
};

export default function CommandCenterPage() {
  const initialSnapshot = loadCommandCenterSummary();

  return (
    <OsModuleFrame
      title="ForgeOS Command Center"
      description="Legacy — la entrada V2 es Mission Control"
    >
      <LegacyExperienceBanner surface="Command Center" />
      <CommandCenterDashboard initialSnapshot={initialSnapshot} showLabLink />
    </OsModuleFrame>
  );
}
