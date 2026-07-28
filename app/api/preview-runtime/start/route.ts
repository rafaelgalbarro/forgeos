import { NextResponse } from "next/server";
import { startSandbox } from "@/lib/preview-runtime/server";
import type { StartSandboxRequest } from "@/lib/preview-runtime/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: StartSandboxRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.missionId) {
    return NextResponse.json({ error: "missionId required" }, { status: 400 });
  }

  try {
    const sandbox = await startSandbox(body);
    return NextResponse.json({
      sandbox: {
        ...sandbox,
        logs: sandbox.logs.slice(-30),
        build: sandbox.build
          ? { ...sandbox.build, stdout: sandbox.build.stdout.slice(-1000), stderr: sandbox.build.stderr.slice(-1000) }
          : undefined,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Start failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
