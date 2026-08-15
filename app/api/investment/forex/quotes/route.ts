import { NextResponse } from "next/server";
import { getForexLiveQuotes } from "@/lib/investment/forex/market-data";
import { getForexSessionSnapshot } from "@/lib/investment/forex/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lightweight FOREX bid/ask for 1s UI polls (server cache ~900ms).
 */
export async function GET() {
  try {
    const { quotes, generatedAt, fromCache } = await getForexLiveQuotes();
    return NextResponse.json({
      generatedAt,
      fromCache,
      session: getForexSessionSnapshot(),
      quotes,
      count: quotes.length,
      mode: "ANALYSIS_ONLY",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "FOREX quotes failed",
        quotes: [],
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}
