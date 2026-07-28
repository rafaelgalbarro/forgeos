import { NextResponse } from "next/server";
import { getDeploymentSnapshot, getDeploymentHistory } from "@/lib/preview-deployment";
import { getPreviewDeploymentFlagsSnapshot } from "@/lib/preview-deployment/config";
import { redactObject } from "@/lib/connections/security/secret-redaction";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const missionId = searchParams.get("missionId") ?? undefined;

  const snapshot = missionId
    ? getDeploymentSnapshot(missionId)
    : { deployments: [], latest: undefined, canPublish: false };
  const history = getDeploymentHistory(missionId);
  const flags = getPreviewDeploymentFlagsSnapshot();

  return NextResponse.json(redactObject({ snapshot, history, flags }));
}
