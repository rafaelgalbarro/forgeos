import { loadStudioSnapshotServer } from "@/lib/creation-output";
import { loadStudioHubVM } from "@/src/presentation";
import { getProjectSummary } from "@/src/core/performance/queries/handlers";
import { CreationOutputStudioClient } from "@/components/creation-output-studio/CreationOutputStudioClient";
import { StudioHubView } from "@/components/experience/StudioHubView";

interface Props {
  params: Promise<{ missionId: string }>;
  searchParams: Promise<{ type?: string; output?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { missionId } = await params;
  return {
    title: `Output Studio — ${missionId}`,
    description: "PROGRAM 6060 — Studio V2",
  };
}

export default async function StudioMissionPage({ params, searchParams }: Props) {
  const { missionId } = await params;
  const { type } = await searchParams;

  const ventureSlug = missionId.includes("nexora") ? "nexora-field" : undefined;
  const projectSummary = getProjectSummary({ missionId });
  const snapshot = await loadStudioSnapshotServer(missionId, ventureSlug);
  const hub = loadStudioHubVM(missionId);

  return (
    <div style={{ padding: "clamp(8px, 2vw, 20px)" }}>
      <StudioHubView vm={hub} />
      {projectSummary && (
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          {projectSummary.codebaseCount} codebase(s), {projectSummary.fileCount} files (manifest on demand)
        </p>
      )}
      <div style={{ marginTop: 28 }}>
        <CreationOutputStudioClient initialSnapshot={snapshot} initialType={type} />
      </div>
    </div>
  );
}
