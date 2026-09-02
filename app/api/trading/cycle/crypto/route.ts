/**
 * POST /api/trading/cycle/crypto — Alpaca paper crypto 24/7.
 */

import { NextResponse } from "next/server";
import { ALPACA_CRYPTO_PAIRS } from "@/lib/brokers/alpaca-pairs";
import { runTypedTradingCycle } from "@/lib/trading/cycle-route-handler";
import { isCryptoCycleWindow } from "@/lib/trading/cycle-schedule";

const CRYPTO_TICKERS = [...ALPACA_CRYPTO_PAIRS];

export async function POST() {
  return runTypedTradingCycle({
    kind: "crypto",
    tickers: CRYPTO_TICKERS,
    minBuyConfidence: 0.65,
    windowOpen: isCryptoCycleWindow(),
    windowLabel: "crypto 24/7",
  });
}

export async function GET() {
  return NextResponse.json({
    cycleKind: "crypto",
    windowOpen: isCryptoCycleWindow(),
    tickers: CRYPTO_TICKERS,
    lastCycle: global.__lastCryptoCycle ?? null,
  });
}
