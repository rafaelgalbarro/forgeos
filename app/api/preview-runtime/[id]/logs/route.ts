import { NextResponse } from "next/server";
import { getSandboxLogs } from "@/lib/preview-runtime/server";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  const logs = getSandboxLogs(id, offset, limit);
  if (!logs) return NextResponse.json({ error: "Sandbox not found" }, { status: 404 });
  return NextResponse.json(logs);
}
