import { NextResponse } from "next/server";
import { approveExecution } from "@/lib/real-build-flow";
import { redactObject } from "@/lib/connections/security/secret-redaction";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sessionId, approvedBy } = body as { sessionId?: string; approvedBy?: string };
  if (!sessionId?.trim()) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  try {
    const session = approveExecution(sessionId, approvedBy ?? "founder", "RC5.2 lab approval");
    return NextResponse.json(redactObject({ session }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Approval failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
