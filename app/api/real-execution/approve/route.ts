import { NextResponse } from "next/server";
import { approveExecution, rejectExecution } from "@/lib/real-execution";
import { redactObject } from "@/lib/connections/security/secret-redaction";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionId, approvedBy, rejectedBy, rationale, action } = body as {
    sessionId?: string;
    approvedBy?: string;
    rejectedBy?: string;
    rationale?: string;
    action?: "approve" | "reject";
  };

  if (!sessionId?.trim()) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const actor = approvedBy ?? rejectedBy;
  if (!actor?.trim()) {
    return NextResponse.json({ error: "approvedBy or rejectedBy is required" }, { status: 400 });
  }

  try {
    const isReject = action === "reject" || Boolean(rejectedBy);
    const session = isReject
      ? rejectExecution(sessionId, actor, rationale)
      : approveExecution(sessionId, actor, rationale);

    return NextResponse.json(
      redactObject({
        session,
        message: isReject
          ? "Execution approval rejected"
          : session.status === "approved"
            ? "Execution approved — gates may now pass for sandbox execution"
            : `Session status: ${session.status}`,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Approval action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
