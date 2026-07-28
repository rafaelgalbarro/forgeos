import { StudioSectionView } from "@/components/experience/StudioSectionView";
import { STUDIO_SECTION_DEFS } from "@/src/core/application/experience-snapshots";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ missionId: string; section: string }>;
}

const ALLOWED = new Set(STUDIO_SECTION_DEFS.map((s) => s.id));

export async function generateMetadata({ params }: Props) {
  const { missionId, section } = await params;
  return {
    title: `Studio ${section} — ${missionId}`,
    description: "PROGRAM 6060 — Studio V2 section (on-demand)",
  };
}

export default async function StudioSectionPage({ params }: Props) {
  const { missionId, section } = await params;
  if (!ALLOWED.has(section as (typeof STUDIO_SECTION_DEFS)[number]["id"])) {
    notFound();
  }
  return (
    <div style={{ padding: "clamp(12px, 3vw, 28px)" }}>
      <StudioSectionView missionId={missionId} section={section} />
    </div>
  );
}
