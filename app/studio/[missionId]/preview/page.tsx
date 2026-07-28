import { loadStudioSnapshotServer } from "@/lib/creation-output";
import { PreviewStudioClient } from "@/components/preview-runtime/PreviewStudioClient";

interface Props {
  params: Promise<{ missionId: string }>;
  searchParams: Promise<{ output?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { missionId } = await params;
  return {
    title: `Preview Sandbox — ${missionId}`,
    description: "PROGRAM 5370 — Sandboxed Preview Runtime",
  };
}

export default async function StudioPreviewPage({ params, searchParams }: Props) {
  const { missionId } = await params;
  const { output: outputId } = await searchParams;
  const ventureSlug = missionId.includes("nexora") ? "nexora-field" : undefined;
  const snapshot = await loadStudioSnapshotServer(missionId, ventureSlug);
  const selectedOutput = outputId
    ? snapshot.outputs.find((o) => o.outputId === outputId)
    : snapshot.outputs.find((o) => o.type !== "VENTURE_OUTPUT" && o.type !== "DEPLOYMENT_OUTPUT");

  return (
    <PreviewStudioClient
      missionId={missionId}
      ventureSlug={ventureSlug}
      outputs={snapshot.outputs}
      selectedOutput={selectedOutput ?? null}
    />
  );
}
