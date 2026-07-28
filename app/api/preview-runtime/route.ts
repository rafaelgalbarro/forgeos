import { NextResponse } from "next/server";
import { getSandboxes, detectDocker } from "@/lib/preview-runtime/server";
import { PREVIEW_RUNTIME_VERSION } from "@/lib/preview-runtime/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const missionId = searchParams.get("missionId") ?? undefined;

  const docker = await detectDocker();
  const sandboxes = getSandboxes(missionId ? { missionId } : undefined);

  return NextResponse.json({
    version: PREVIEW_RUNTIME_VERSION,
    docker,
    sandboxes: sandboxes.map((s) => ({
      ...s,
      logs: s.logs.slice(-20),
      build: s.build ? { ...s.build, stdout: s.build.stdout.slice(-500), stderr: s.build.stderr.slice(-500) } : undefined,
    })),
  });
}
