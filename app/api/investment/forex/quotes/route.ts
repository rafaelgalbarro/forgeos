import { NextResponse } from "next/server";
import { getForexLiveQuotes } from "@/lib/investment/forex/market-data";
import { getForexSessionSnapshot } from "@/lib/investment/forex/config";
import { readForexEnabledAtRuntime } from "@/lib/investment/forex/server-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lightweight FOREX bid/ask for 1s UI polls (server cache ~900ms).
 */
export async function GET() {
  const forexEnabled = readForexEnabledAtRuntime();
  try {
    const { quotes, generatedAt, fromCache } = await getForexLiveQuotes();
    return NextResponse.json({
      generatedAt,
      fromCache,
      session: getForexSessionSnapshot(),
      quotes,
      count: quotes.length,
      forexEnabled,
      mode: forexEnabled ? "LIVE_GATED" : "ANALYSIS_ONLY",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "FOREX quotes failed",
        quotes: [],
        generatedAt: new Date().toISOString(),
        forexEnabled,
        count: 0,
      },
      { status: 200 },
    );
  }
}
