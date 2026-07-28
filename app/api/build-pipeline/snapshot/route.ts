import { NextResponse } from "next/server";
import { getBuildPipelineSnapshot, getBuildPipelinePolicy } from "@/lib/build-pipeline";
import { redactObject } from "@/lib/connections/security/secret-redaction";
import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const policy = getBuildPipelinePolicy();
    const snapshot = await getBuildPipelineSnapshot(LAB_MOCK_VENTURE_ID, "cto");
    return NextResponse.json(redactObject({ policy, snapshot }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Snapshot failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
