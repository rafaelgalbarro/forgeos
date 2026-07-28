import { NextResponse } from "next/server";
import { requestBuildPipelineApproval } from "@/lib/build-pipeline";
import { redactObject } from "@/lib/connections/security/secret-redaction";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ventureId, requestedBy } = body as { ventureId?: string; requestedBy?: string };

  try {
    const result = await requestBuildPipelineApproval({
      ventureId: ventureId ?? LAB_MOCK_VENTURE_ID,
      requestedBy: requestedBy ?? "cto",
    });
    return NextResponse.json(redactObject(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Approval request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
