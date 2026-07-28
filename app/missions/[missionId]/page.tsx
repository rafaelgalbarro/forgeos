import { loadMissionPageVM } from "@/src/presentation";
import { MissionPageView } from "@/components/experience/MissionPageView";

interface Props {
  params: Promise<{ missionId: string }>;
  searchParams: Promise<{ section?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { missionId } = await params;
  return {
    title: `Misión ${missionId} — ForgeOS`,
    description: "PROGRAM 6060 — Mission Page (Overview, Plan, Conversation, …)",
  };
}

/**
 * Mission Page — consolidated sections.
 * Also reachable via /mission-control/[missionId] for conversation-first V2 entry.
 */
export default async function MissionsDetailPage({ params, searchParams }: Props) {
  const { missionId } = await params;
  const { section } = await searchParams;
  const vm = loadMissionPageVM(missionId);
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)" }}>
      <MissionPageView vm={vm} section={section} />
    </div>
  );
}
