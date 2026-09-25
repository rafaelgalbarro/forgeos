/**
 * POST /api/trading/cycle/forex — SHADOW intradía (no live orders by default).
 */

import { NextResponse } from "next/server";
import { runTypedTradingCycle } from "@/lib/trading/cycle-route-handler";
import { isForexCycleWindow } from "@/lib/trading/cycle-schedule";
import {
  FOREX_INTRADAY_PAIRS,
  forexMinNotionalUsd,
  isForexShadowMode,
} from "@/lib/trading/forex/shadow-strategies";
import { startDailyStrategyReportScheduler } from "@/lib/trading/journal/trades";

const FOREX_TICKERS = [...FOREX_INTRADAY_PAIRS];

export async function POST() {
  startDailyStrategyReportScheduler();
  const shadow = isForexShadowMode();
  return runTypedTradingCycle({
    kind: "forex",
    tickers: FOREX_TICKERS,
    minBuyConfidence: 0.65,
    analysisOnly: true, // always analysis — shadow never sends orders
    windowOpen: isForexCycleWindow(),
    windowLabel: shadow
      ? "forex SHADOW 07:00-22:00 Madrid (no orders)"
      : "forex 07:00-22:00 Madrid",
  });
}

export async function GET() {
  return NextResponse.json({
    cycleKind: "forex",
    windowOpen: isForexCycleWindow(),
    tickers: FOREX_TICKERS,
    shadowMode: isForexShadowMode(),
    minNotionalUsd: forexMinNotionalUsd(),
    note: "FOREX_SHADOW_MODE=true → señales teóricas, cero órdenes IBKR",
    lastCycle: global.__lastForexCycle ?? null,
  });
}
