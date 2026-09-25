import { NextResponse } from "next/server";
import { getAlphaEngineSnapshot } from "@/lib/investment/alpha-engine-snapshot";
import type { AlphaEngineFilters, AlphaMarket } from "@/src/core/investment/alpha-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SAFETY = {
  mode: "ANALYSIS_ONLY" as const,
  orderExecution: "disabled" as const,
  liveTradingEnabled: false as const,
  autonomousLive: "LOCKED" as const,
  goLive: "NOT_READY_FOR_LIVE" as const,
  ordersSubmitted: 0 as const,
};

function parseFilters(url: URL): AlphaEngineFilters {
  const market = url.searchParams.get("market") as AlphaMarket | "all" | null;
  return {
    market: market ?? undefined,
    asset: url.searchParams.get("asset") ?? undefined,
    strategy: url.searchParams.get("strategy") ?? undefined,
    minConfidence: url.searchParams.get("minConfidence")
      ? Number(url.searchParams.get("minConfidence"))
      : undefined,
    maxRiskPct: url.searchParams.get("maxRiskPct")
      ? Number(url.searchParams.get("maxRiskPct"))
      : undefined,
    timeHorizon: url.searchParams.get("horizon") ?? undefined,
    grade: url.searchParams.get("grade") ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const snapshot = await getAlphaEngineSnapshot({
      filters: parseFilters(url),
      persistMemory: url.searchParams.get("persist") !== "0",
    });
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        ...SAFETY,
        ok: false,
        error: error instanceof Error ? error.message : "alpha_engine_failed",
      },
      { status: 500 },
    );
  }
}
