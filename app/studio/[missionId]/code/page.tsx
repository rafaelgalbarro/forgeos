import { loadCodeStudioServer } from "@/lib/code-generation";
import { CodeTabClient } from "@/components/creation-output-studio/CodeTabClient";

interface Props {
  params: Promise<{ missionId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { missionId } = await params;
  return {
    title: `Código — ${missionId}`,
    description: "PROGRAM 5360 — Real Code Generation",
  };
}

export default async function StudioCodePage({ params }: Props) {
  const { missionId } = await params;
  const ventureSlug = missionId.includes("nexora") ? "nexora-field" : undefined;
  const snapshot = await loadCodeStudioServer(missionId, ventureSlug);

  return (
    <CodeTabClient
      missionId={missionId}
      ventureSlug={ventureSlug}
      summaries={snapshot.summaries}
      projects={snapshot.projects}
    />
  );
}
