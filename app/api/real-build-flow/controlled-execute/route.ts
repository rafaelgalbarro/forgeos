import { NextResponse } from "next/server";
import { runControlledRealExecution } from "@/lib/real-build-flow";
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

  const { ventureId, requestedBy, approvalSessionId, userConfirmed } = body as {
    ventureId?: string;
    requestedBy?: string;
    approvalSessionId?: string;
    userConfirmed?: boolean;
  };

  if (!userConfirmed) {
    return NextResponse.json({ error: "userConfirmed must be true" }, { status: 400 });
  }

  const id = ventureId ?? LAB_MOCK_VENTURE_ID;

  try {
    const result = await runControlledRealExecution({
      ventureId: id,
      venture: id === LAB_MOCK_VENTURE_ID ? createLabMockVenture() : undefined,
      requestedBy: requestedBy ?? "cto",
      approvalSessionId,
      userConfirmed: true,
    });
    return NextResponse.json(redactObject(result));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Controlled execution failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
