import { NextResponse } from "next/server";
import { getMarketIntelligenceStatus } from "@/lib/investment/market-intelligence-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET — Market Intelligence provider registry status. No quote fetch. No orders. */
export async function GET() {
  try {
    const snapshot = getMarketIntelligenceStatus();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Market intelligence status failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        totalConfigured: 0,
        marketProviders: [],
        newsProviders: [],
        economicProviders: [],
        sentimentProviders: [],
      },
      { status: 200 },
    );
  }
}
