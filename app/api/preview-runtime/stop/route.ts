import { NextResponse } from "next/server";
import { stopSandbox } from "@/lib/preview-runtime/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sandbox = await stopSandbox(body.id);
  if (!sandbox) return NextResponse.json({ error: "Sandbox not found" }, { status: 404 });
  return NextResponse.json({ sandbox });
}
