import { NextResponse } from "next/server";
import { approvePreviewDeployment } from "@/lib/preview-deployment";
import { redactObject } from "@/lib/connections/security/secret-redaction";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deploymentId, approvedBy, note } = body as {
    deploymentId?: string;
    approvedBy?: string;
    note?: string;
  };

  if (!deploymentId) {
    return NextResponse.json({ error: "deploymentId required" }, { status: 400 });
  }

  const updated = await approvePreviewDeployment(deploymentId, approvedBy ?? "founder", note);
  if (!updated) {
    return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
  }
  return NextResponse.json(redactObject({ request: updated }));
}
