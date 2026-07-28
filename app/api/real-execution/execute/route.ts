import { NextResponse } from "next/server";
import { executeRealAction } from "@/lib/real-execution";
import { redactObject } from "@/lib/connections/security/secret-redaction";
import { isRealConnectionCapability } from "@/lib/connections/adapters/capability-connection-adapter";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    capabilityId,
    ventureId,
    requestedBy,
    action,
    payload,
    approvalSessionId,
    approvedBy,
    mode,
    userConfirmed,
  } = body as {
    capabilityId?: string;
    ventureId?: string;
    requestedBy?: string;
    action?: string;
    payload?: Record<string, unknown>;
    approvalSessionId?: string;
    approvedBy?: string;
    mode?: "dry_run" | "sandbox" | "real";
    userConfirmed?: boolean;
  };

  if (!capabilityId?.trim()) {
    return NextResponse.json({ error: "capabilityId is required" }, { status: 400 });
  }
  if (!isRealConnectionCapability(capabilityId)) {
    return NextResponse.json({ error: "Not a real connection capability" }, { status: 400 });
  }

  try {
    const result = await executeRealAction({
      capabilityId,
      ventureId: ventureId ?? "demo-venture-vandl",
      requestedBy: requestedBy ?? "cto",
      action,
      payload,
      approvalSessionId,
      approvedBy,
      mode: mode ?? "sandbox",
      userConfirmed: userConfirmed ?? false,
    });

    return NextResponse.json(
      redactObject({
        result,
        rollbackPlan: result.rollbackPlan,
        message: result.executed
          ? "Execution completed"
          : result.blockedReason ?? "Execution blocked by guard gates",
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
