import { buildMissionControlSnapshot } from "@/lib/mission-control/mission-snapshots";
import { loadMissionControlVM } from "@/src/presentation";
import { MissionControlExperience } from "@/components/experience/MissionControlExperience";

interface Props {
  params: Promise<{ missionId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { missionId } = await params;
  return {
    title: `Misión ${missionId} — Mission Control`,
    description: "PROGRAM 6060 — Mission Control V2",
  };
}

export default async function MissionControlMissionPage({ params }: Props) {
  const { missionId } = await params;
  const vm = loadMissionControlVM(missionId);
  const snapshot = buildMissionControlSnapshot();
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)" }}>
      <MissionControlExperience vm={vm} snapshot={snapshot} missionId={missionId} />
    </div>
  );
}
