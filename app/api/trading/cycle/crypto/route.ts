/**
 * POST /api/trading/cycle/crypto — Alpaca paper by default; IBKR PAXOS when IBKR_CRYPTO_ENABLED=true.
 */

import { NextResponse } from "next/server";
import { ALPACA_CRYPTO_PAIRS } from "@/lib/brokers/alpaca-pairs";
import { isIbkrCryptoEnabled } from "@/lib/investment/runtime-flags";
import { runTypedTradingCycle } from "@/lib/trading/cycle-route-handler";
import { isCryptoCycleWindow } from "@/lib/trading/cycle-schedule";
import { IBKR_CRYPTO_TICKERS } from "@/src/core/trading/crypto-ibkr";

function cryptoTickers(): string[] {
  if (isIbkrCryptoEnabled()) {
    return [...IBKR_CRYPTO_TICKERS];
  }
  return [...ALPACA_CRYPTO_PAIRS];
}

export async function POST() {
  const ibkrCrypto = isIbkrCryptoEnabled();
  return runTypedTradingCycle({
    kind: "crypto",
    tickers: cryptoTickers(),
    minBuyConfidence: 0.5,
    windowOpen: isCryptoCycleWindow(),
    windowLabel: ibkrCrypto ? "crypto IBKR/PAXOS 24/7" : "crypto Alpaca 24/7",
  });
}

export async function GET() {
  const ibkrCrypto = isIbkrCryptoEnabled();
  return NextResponse.json({
    cycleKind: "crypto",
    broker: ibkrCrypto ? "ibkr-paxos" : "alpaca",
    ibkrCryptoEnabled: ibkrCrypto,
    windowOpen: isCryptoCycleWindow(),
    tickers: cryptoTickers(),
    lastCycle: global.__lastCryptoCycle ?? null,
  });
}
