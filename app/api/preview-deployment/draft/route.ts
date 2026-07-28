import { NextResponse } from "next/server";
import { createPreviewDeploymentDraft } from "@/lib/preview-deployment/deployment-orchestrator";
import { getOrCreateDemoSandboxBuild } from "@/lib/preview-runtime/sandbox-build";
import { redactObject } from "@/lib/connections/security/secret-redaction";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { missionId, ventureId, projectId, projectVersion, sandboxBuildId, requestedBy } = body as {
    missionId?: string;
    ventureId?: string;
    projectId?: string;
    projectVersion?: string;
    sandboxBuildId?: string;
    requestedBy?: string;
  };

  if (!missionId || !projectId) {
    return NextResponse.json({ error: "missionId and projectId required" }, { status: 400 });
  }

  const resolvedSandboxId =
    sandboxBuildId ??
    getOrCreateDemoSandboxBuild(missionId, projectId, projectVersion ?? "1.0.0").buildId;

  try {
    const draft = await createPreviewDeploymentDraft({
      missionId,
      ventureId,
      projectId,
      projectVersion: projectVersion ?? "1.0.0",
      sandboxBuildId: resolvedSandboxId,
      requestedBy: requestedBy ?? "founder",
    });
    return NextResponse.json(redactObject({ request: draft }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Draft failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
