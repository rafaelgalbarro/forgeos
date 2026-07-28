import { CeoWorkspaceView } from "@/components/ceo-workspace/CeoWorkspaceView";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";

export const metadata = {
  title: "CEO — ForgeOS",
  description: "Director General — briefing ejecutivo",
};

export default function OsCeoPage() {
  return (
    <OsModuleFrame title="CEO" description="Director General del portfolio">
      <CeoWorkspaceView />
    </OsModuleFrame>
  );
}
