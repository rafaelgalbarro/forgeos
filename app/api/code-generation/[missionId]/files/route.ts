import { NextResponse } from "next/server";
import { loadCodeProjectsForMission, getCodeRepository } from "@/lib/code-generation";

interface Props {
  params: Promise<{ missionId: string }>;
}

export async function GET(request: Request, { params }: Props) {
  const { missionId } = await params;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const filePath = searchParams.get("path");
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "50");

  const ventureSlug = missionId.includes("nexora") ? "nexora-field" : undefined;
  await loadCodeProjectsForMission(missionId, ventureSlug);

  if (!projectId) {
    const summaries = getCodeRepository().listSummaries(missionId);
    return NextResponse.json({ summaries });
  }

  if (filePath) {
    const file = getCodeRepository().getFileContent(projectId, filePath);
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
    return NextResponse.json({
      path: file.path,
      content: file.content,
      language: file.language,
      purpose: file.purpose,
      checksum: file.checksum,
      generatedBy: file.generatedBy,
    });
  }

  const meta = getCodeRepository().getProjectMetadata(projectId, page, pageSize);
  if (!meta) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(meta);
}
