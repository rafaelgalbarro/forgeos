/**
 * POST /api/trading/cycle/stocks — USA equities via EODHD + IBKR execution.
 */

import { NextResponse } from "next/server";
import { runTypedTradingCycle } from "@/lib/trading/cycle-route-handler";
import { isUsStocksCycleWindow } from "@/lib/trading/cycle-schedule";
import { resolveStocksCycleUniverse } from "@/lib/trading/stocks-universe";

export async function POST() {
  const universe = await resolveStocksCycleUniverse();
  return runTypedTradingCycle({
    kind: "stocks",
    tickers: universe.tickers,
    minBuyConfidence: 0.65,
    windowOpen: isUsStocksCycleWindow(),
    windowLabel: "USA stocks 14:30-22:00 Madrid",
  });
}

export async function GET() {
  const universe = await resolveStocksCycleUniverse();
  return NextResponse.json({
    cycleKind: "stocks",
    windowOpen: isUsStocksCycleWindow(),
    universe,
    lastCycle: global.__lastStocksCycle ?? null,
  });
}
