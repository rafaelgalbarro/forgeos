import { NextRequest, NextResponse } from "next/server";
import { gatherScreener } from "@/lib/investment/screener-gather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/investment/screener?symbols=AAPL,MSFT — MI gather, ANALYSIS_ONLY. */
export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("symbols");
    const symbols = raw
      ? raw.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const snapshot = await gatherScreener(symbols);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Screener gather failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        empty: true,
        result: null,
        providersConfigured: 0,
      },
      { status: 200 },
    );
  }
}
