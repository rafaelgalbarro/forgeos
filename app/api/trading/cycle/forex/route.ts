/**
 * POST /api/trading/cycle/forex — EODHD forex analysis (no execution).
 */

import { NextResponse } from "next/server";
import { ALPACA_FOREX_PAIRS } from "@/lib/brokers/alpaca-pairs";
import { runTypedTradingCycle } from "@/lib/trading/cycle-route-handler";
import { isForexCycleWindow } from "@/lib/trading/cycle-schedule";

const FOREX_TICKERS = [...ALPACA_FOREX_PAIRS];

export async function POST() {
  return runTypedTradingCycle({
    kind: "forex",
    tickers: FOREX_TICKERS,
    minBuyConfidence: 0.65,
    analysisOnly: true,
    windowOpen: isForexCycleWindow(),
    windowLabel: "forex 07:00-22:00 Madrid",
  });
}

export async function GET() {
  return NextResponse.json({
    cycleKind: "forex",
    windowOpen: isForexCycleWindow(),
    tickers: FOREX_TICKERS,
    lastCycle: global.__lastForexCycle ?? null,
  });
}
