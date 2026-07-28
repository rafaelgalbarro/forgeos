import { NextResponse } from "next/server";
import { runBuildPipelineDryRun } from "@/lib/build-pipeline";
import { redactObject } from "@/lib/connections/security/secret-redaction";
import { createLabMockVenture, LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ventureId, requestedBy } = body as { ventureId?: string; requestedBy?: string };
  const id = ventureId ?? LAB_MOCK_VENTURE_ID;

  try {
    const snapshot = await runBuildPipelineDryRun({
      ventureId: id,
      requestedBy: requestedBy ?? "cto",
      mode: "dry_run",
    });
    return NextResponse.json(redactObject({ snapshot }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dry-run failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
