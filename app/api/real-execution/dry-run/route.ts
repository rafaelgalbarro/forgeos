import { NextResponse } from "next/server";
import { runDryRun } from "@/lib/real-execution";
import { redactObject } from "@/lib/connections/security/secret-redaction";
import { isRealConnectionCapability } from "@/lib/connections/adapters/capability-connection-adapter";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { capabilityId, ventureId, requestedBy, action, payload } = body as {
    capabilityId?: string;
    ventureId?: string;
    requestedBy?: string;
    action?: string;
    payload?: Record<string, unknown>;
  };

  if (!capabilityId?.trim()) {
    return NextResponse.json({ error: "capabilityId is required" }, { status: 400 });
  }
  if (!isRealConnectionCapability(capabilityId)) {
    return NextResponse.json({ error: "Not a real connection capability" }, { status: 400 });
  }

  try {
    const result = await runDryRun({
      capabilityId,
      ventureId: ventureId ?? "demo-venture-vandl",
      requestedBy: requestedBy ?? "cto",
      action,
      payload,
    });
    return NextResponse.json(
      redactObject({
        request: result.request,
        dryRunResult: result.dryRunResult,
        rollbackPlan: result.rollbackPlan,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dry-run failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
