/**
 * POST /api/trading/cycle/stocks — USA equities via EODHD + IBKR execution.
 */

import { NextResponse } from "next/server";
import { runTypedTradingCycle } from "@/lib/trading/cycle-route-handler";
import {
  getCurrentTradingPhase,
  isUsStocksCycleWindow,
  minConfidenceForForgePhase,
  nextOpenLabel,
} from "@/lib/trading/cycle-schedule";
import { resolveStocksCycleUniverse } from "@/lib/trading/stocks-universe";

export async function POST() {
  const phase = getCurrentTradingPhase();
  const universe = await resolveStocksCycleUniverse();
  return runTypedTradingCycle({
    kind: "stocks",
    tickers: universe.tickers,
    minBuyConfidence: minConfidenceForForgePhase(phase),
    windowOpen: isUsStocksCycleWindow(),
    windowLabel: `stocks phase=${phase} (CLOSED→skip)`,
  });
}

export async function GET() {
  const phase = getCurrentTradingPhase();
  const universe = await resolveStocksCycleUniverse();
  return NextResponse.json({
    cycleKind: "stocks",
    phase,
    windowOpen: isUsStocksCycleWindow(),
    nextOpen: nextOpenLabel(phase),
    universe,
    lastCycle: global.__lastStocksCycle ?? null,
  });
}
