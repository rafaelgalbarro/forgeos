import { NextResponse } from "next/server";
import { probeGather } from "@/lib/investment/probe-gather";

export const dynamic = "force-dynamic";

/**
 * GET /api/investment/probe-gather?symbols=AAPL,MSFT
 * ANALYSIS_ONLY MI probe — counts/provider ids only; never secrets or orders.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const symbolsParam = url.searchParams.get("symbols");
    const symbols = symbolsParam
      ? symbolsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const snapshot = await probeGather(symbols);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        liveTradingEnabled: false,
        error: error instanceof Error ? error.message : "probe failed",
      },
      { status: 500 },
    );
  }
}
