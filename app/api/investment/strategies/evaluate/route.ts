import { NextRequest, NextResponse } from "next/server";
import { evaluateStrategiesOffline } from "@/lib/investment/strategy-evaluation";
import type { StrategyRegime } from "@/src/core/investment/strategy/domain/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REGIMES = [
  "bullish",
  "bearish",
  "sideways",
  "transition",
  "high-volatility",
  "low-volatility",
  "risk-on",
  "risk-off",
] as const satisfies readonly StrategyRegime[];

/** GET — offline DEMO strategy evaluation. No broker. */
export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get("symbol") ?? "DEMO";
    const regimeRaw = request.nextUrl.searchParams.get("regime") ?? "bullish";
    const regime = (REGIMES as readonly string[]).includes(regimeRaw)
      ? (regimeRaw as StrategyRegime)
      : "bullish";
    const snapshot = evaluateStrategiesOffline({ symbol, regime });
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Strategy evaluation failed";
    return NextResponse.json(
      {
        error: message,
        mode: "ANALYSIS_ONLY",
        orderExecution: "disabled",
        strategyReadiness: "NOT_READY",
        autonomousLive: "LOCKED",
        dataLabel: "DEMO",
        rows: [],
      },
      { status: 200 },
    );
  }
}
