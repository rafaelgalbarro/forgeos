import { NextResponse } from "next/server";
import type { VentureProject } from "@/lib/domain/venture";
import { buildCeoWorkspaceData } from "@/lib/ceo-workspace";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ventures } = body as { ventures?: VentureProject[] };

  if (!Array.isArray(ventures)) {
    return NextResponse.json({ error: "ventures array is required" }, { status: 400 });
  }

  try {
    const data = await buildCeoWorkspaceData(ventures);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CEO Workspace error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
