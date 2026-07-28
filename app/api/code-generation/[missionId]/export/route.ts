import { NextResponse } from "next/server";
import {
  loadCodeProjectsForMission,
  getCodeRepository,
  exportProjectAsZipBuffer,
  exportManifestJson,
} from "@/lib/code-generation";

interface Props {
  params: Promise<{ missionId: string }>;
}

export async function GET(request: Request, { params }: Props) {
  const { missionId } = await params;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const format = searchParams.get("format") ?? "zip";

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const ventureSlug = missionId.includes("nexora") ? "nexora-field" : undefined;
  await loadCodeProjectsForMission(missionId, ventureSlug);

  const project = getCodeRepository().get(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (format === "manifest") {
    return new NextResponse(exportManifestJson(project), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="manifest-${project.slug}.json"`,
      },
    });
  }

  const buffer = await exportProjectAsZipBuffer(project);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.slug}-v${project.version}.zip"`,
    },
  });
}
