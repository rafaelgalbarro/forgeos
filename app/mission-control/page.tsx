import { buildMissionControlSnapshot } from "@/lib/mission-control/mission-snapshots";
import { loadMissionControlVM } from "@/src/presentation";
import { MissionControlExperience } from "@/components/experience/MissionControlExperience";

export const metadata = {
  title: "Mission Control — ForgeOS",
  description: "PROGRAM 6060 — Experiencia principal ForgeOS V2",
};

export default function MissionControlPage() {
  const vm = loadMissionControlVM(null);
  const snapshot = buildMissionControlSnapshot();
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)" }}>
      <MissionControlExperience vm={vm} snapshot={snapshot} />
    </div>
  );
}
