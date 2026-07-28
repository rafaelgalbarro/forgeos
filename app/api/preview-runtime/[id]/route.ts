import { NextResponse } from "next/server";
import { getSandbox, stopSandbox, restartSandbox, cleanupSandbox } from "@/lib/preview-runtime/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const sandbox = getSandbox(id);
  if (!sandbox) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    sandbox: {
      ...sandbox,
      logs: sandbox.logs.slice(-50),
      build: sandbox.build
        ? { ...sandbox.build, stdout: sandbox.build.stdout.slice(-1000), stderr: sandbox.build.stderr.slice(-1000) }
        : undefined,
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const full = searchParams.get("full") === "true";
  const sandbox = await cleanupSandbox(id, full);
  if (!sandbox) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ sandbox });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.action === "restart") {
    const sandbox = await restartSandbox(id);
    if (!sandbox) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ sandbox });
  }

  if (body.action === "stop") {
    const sandbox = await stopSandbox(id);
    if (!sandbox) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ sandbox });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
