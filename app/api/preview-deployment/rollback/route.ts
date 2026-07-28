import { NextResponse } from "next/server";
import { rollbackPreviewDeployment } from "@/lib/preview-deployment";
import { redactObject } from "@/lib/connections/security/secret-redaction";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deploymentId, actor } = body as { deploymentId?: string; actor?: string };

  if (!deploymentId) {
    return NextResponse.json({ error: "deploymentId required" }, { status: 400 });
  }

  const rolled = await rollbackPreviewDeployment(deploymentId, actor ?? "founder");
  if (!rolled) {
    return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
  }
  return NextResponse.json(redactObject({ request: rolled }));
}
