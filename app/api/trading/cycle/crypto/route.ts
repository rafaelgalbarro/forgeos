/**
 * POST /api/trading/cycle/crypto — Alpaca paper by default (CRYPTO_BROKER=alpaca|kraken|ibkr).
 */

import { NextResponse } from "next/server";
import { ALPACA_CRYPTO_PAIRS } from "@/lib/brokers/alpaca-pairs";
import { KRAKEN_EUR_PAIRS } from "@/lib/brokers/kraken";
import { isIbkrCryptoEnabled } from "@/lib/investment/runtime-flags";
import { runTypedTradingCycle } from "@/lib/trading/cycle-route-handler";
import { isCryptoCycleWindow } from "@/lib/trading/cycle-schedule";
import { IBKR_CRYPTO_TICKERS } from "@/src/core/trading/crypto-ibkr";
import {
  cryptoLiveMaxPositions,
  getCryptoBroker,
  isKrakenCryptoBroker,
} from "@/lib/trading/crypto/intraday-strategies";
import { startCryptoPermissionProbeScheduler } from "@/lib/trading/crypto/permission-probe";
import { getExitManager } from "@/lib/trading/exit-manager";
import { startDailyStrategyReportScheduler } from "@/lib/trading/journal/trades";

function cryptoTickers(): string[] {
  const broker = getCryptoBroker();
  if (broker === "kraken" || isKrakenCryptoBroker()) {
    return [...KRAKEN_EUR_PAIRS];
  }
  if (broker === "ibkr" || isIbkrCryptoEnabled()) {
    return [...IBKR_CRYPTO_TICKERS];
  }
  return [...ALPACA_CRYPTO_PAIRS];
}

function windowLabel(): string {
  const broker = getCryptoBroker();
  if (broker === "kraken") return "crypto Kraken EUR 24/7";
  if (broker === "ibkr" || isIbkrCryptoEnabled()) return "crypto IBKR/PAXOS 24/7";
  return "crypto Alpaca intradía ≤24h";
}

/** Light exit loop every 60s — prices + positions only. */
let cryptoExitTimer: ReturnType<typeof setInterval> | null = null;

function startCryptoExitLoop(): void {
  if (cryptoExitTimer) return;
  const tick = () => {
    void getExitManager()
      .runChannel("crypto")
      .catch((err) =>
        console.warn("[Exit/crypto/60s]", err instanceof Error ? err.message : err),
      );
  };
  tick();
  cryptoExitTimer = setInterval(tick, 60_000);
  if (typeof cryptoExitTimer === "object" && "unref" in cryptoExitTimer) {
    cryptoExitTimer.unref?.();
  }
}

export async function POST() {
  startDailyStrategyReportScheduler();
  startCryptoPermissionProbeScheduler();
  startCryptoExitLoop();
  return runTypedTradingCycle({
    kind: "crypto",
    tickers: cryptoTickers(),
    minBuyConfidence: 0.5,
    windowOpen: isCryptoCycleWindow(),
    windowLabel: windowLabel(),
  });
}

export async function GET() {
  startCryptoPermissionProbeScheduler();
  const broker = getCryptoBroker();
  return NextResponse.json({
    cycleKind: "crypto",
    broker:
      broker === "kraken"
        ? "kraken-eur"
        : broker === "ibkr" || isIbkrCryptoEnabled()
          ? "ibkr-paxos"
          : "alpaca",
    cryptoBrokerEnv: broker,
    ibkrCryptoEnabled: isIbkrCryptoEnabled(),
    windowOpen: isCryptoCycleWindow(),
    tickers: cryptoTickers(),
    maxHoldHours: 24,
    maxPositions: cryptoLiveMaxPositions(),
    lastCycle: global.__lastCryptoCycle ?? null,
  });
}
