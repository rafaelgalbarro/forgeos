import { FounderDashboardView } from "@/components/founder-dashboard/FounderDashboardView";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = { title: "Calendar — ForgeOS" };

export default function OsCalendarPage() {
  return (
    <OsModuleFrame title="Calendar" description="Agenda ejecutiva del fundador">
      <FounderDashboardView />
    </OsModuleFrame>
  );
}
