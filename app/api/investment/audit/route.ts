import { NextRequest, NextResponse } from "next/server";
import { getAuditTimeline } from "@/lib/investment/audit-timeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/investment/audit?kind=&symbol=&q=&limit= — read-only timeline. */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const limitRaw = Number(sp.get("limit") ?? 80);
    const snapshot = await getAuditTimeline({
      kind: sp.get("kind") ?? undefined,
      symbol: sp.get("symbol") ?? undefined,
      q: sp.get("q") ?? undefined,
      limit: Number.isFinite(limitRaw) ? limitRaw : 80,
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audit timeline failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        count: 0,
        totalUnfiltered: 0,
        items: [],
        availableKinds: [],
        availableSymbols: [],
      },
      { status: 200 },
    );
  }
}
