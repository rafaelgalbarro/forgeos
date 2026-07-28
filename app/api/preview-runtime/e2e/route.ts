import { NextResponse } from "next/server";
import { runNexoraPreviewE2E } from "@/lib/preview-runtime/server";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export async function POST() {
  try {
    const result = await runNexoraPreviewE2E();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "E2E failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
