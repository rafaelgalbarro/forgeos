import { NextResponse } from "next/server";
import { executePreviewDeployment } from "@/lib/preview-deployment";
import { redactObject } from "@/lib/connections/security/secret-redaction";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    missionId,
    ventureId,
    projectId,
    projectVersion,
    sandboxBuildId,
    requestedBy,
    approvalSessionId,
    userConfirmed,
  } = body as {
    missionId?: string;
    ventureId?: string;
    projectId?: string;
    projectVersion?: string;
    sandboxBuildId?: string;
    requestedBy?: string;
    approvalSessionId?: string;
    userConfirmed?: boolean;
  };

  if (!missionId || !projectId || !sandboxBuildId) {
    return NextResponse.json({ error: "missionId, projectId, sandboxBuildId required" }, { status: 400 });
  }

  try {
    const result = await executePreviewDeployment(
      {
        missionId,
        ventureId,
        projectId,
        projectVersion: projectVersion ?? "1.0.0",
        sandboxBuildId,
        requestedBy: requestedBy ?? "founder",
        approvalSessionId,
        userConfirmed,
      },
      undefined,
      requestedBy ?? "founder"
    );
    return NextResponse.json(redactObject(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Execute failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
