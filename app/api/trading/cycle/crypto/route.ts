/**
 * POST /api/trading/cycle/crypto — Alpaca paper by default (CRYPTO_BROKER=alpaca|kraken|ibkr).
 * Kraken: high-performance engine (universe, WS, multi-strategy, risk).
 */

import { NextResponse } from "next/server";
import { ALPACA_CRYPTO_PAIRS } from "@/lib/brokers/alpaca-pairs";
import { KRAKEN_EUR_PAIRS } from "@/lib/brokers/kraken";
import { getKrakenUniversePairs } from "@/lib/brokers/kraken/universe";
import { isIbkrCryptoEnabled } from "@/lib/investment/runtime-flags";
import { runTypedTradingCycle } from "@/lib/trading/cycle-route-handler";
import { isCryptoCycleWindow } from "@/lib/trading/cycle-schedule";
import { IBKR_CRYPTO_TICKERS } from "@/src/core/trading/crypto-ibkr";
import {
  cryptoLiveMaxPositions,
  getCryptoBroker,
  isKrakenCryptoBroker,
} from "@/lib/trading/crypto/intraday-strategies";
import {
  getKrakenEngineStatus,
  runKrakenAnalysisCycle,
  startKrakenEngine,
} from "@/lib/trading/crypto/engine";
import { startCryptoPermissionProbeScheduler } from "@/lib/trading/crypto/permission-probe";
import { getExitManager } from "@/lib/trading/exit-manager";
import { startDailyStrategyReportScheduler } from "@/lib/trading/journal/trades";

async function cryptoTickers(): Promise<string[]> {
  const broker = getCryptoBroker();
  if (broker === "kraken" || isKrakenCryptoBroker()) {
    try {
      return await getKrakenUniversePairs();
    } catch {
      return [...KRAKEN_EUR_PAIRS];
    }
  }
  if (broker === "ibkr" || isIbkrCryptoEnabled()) {
    return [...IBKR_CRYPTO_TICKERS];
  }
  return [...ALPACA_CRYPTO_PAIRS];
}

function windowLabel(): string {
  const broker = getCryptoBroker();
  if (broker === "kraken") return "crypto Kraken EUR motor HP 24/7";
  if (broker === "ibkr" || isIbkrCryptoEnabled()) return "crypto IBKR/PAXOS 24/7";
  return "crypto Alpaca intradía ≤24h";
}

/** Light exit loop every 60s — Alpaca/IBKR. Kraken uses 5s engine loop. */
let cryptoExitTimer: ReturnType<typeof setInterval> | null = null;

function startCryptoExitLoop(): void {
  if (isKrakenCryptoBroker()) return; // engine owns exits
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

  if (isKrakenCryptoBroker()) {
    await startKrakenEngine();
    const result = await runKrakenAnalysisCycle();
    const status = getKrakenEngineStatus();
    return NextResponse.json({
      ok: true,
      broker: "kraken-eur",
      windowLabel: windowLabel(),
      universe: status.universe,
      regime: status.regime,
      ws: status.ws,
      exitLoopRunning: status.exitLoopRunning,
      signals: result.signals.slice(0, 30).map((s) => ({
        pair: s.pair,
        strategy: s.strategyId,
        confidence: s.confidence,
        score: s.score,
        shadow: s.shadow,
        expectedMovePct: s.expectedMovePct,
      })),
      executed: result.executed,
      shadow: result.shadow,
      held: result.held,
      lastSignals: status.lastSignals,
      at: new Date().toISOString(),
    });
  }

  const tickers = await cryptoTickers();
  return runTypedTradingCycle({
    kind: "crypto",
    tickers,
    minBuyConfidence: 0.5,
    windowOpen: isCryptoCycleWindow(),
    windowLabel: windowLabel(),
  });
}

export async function GET() {
  startCryptoPermissionProbeScheduler();
  const broker = getCryptoBroker();
  if (broker === "kraken" || isKrakenCryptoBroker()) {
    const status = getKrakenEngineStatus();
    return NextResponse.json({
      cycleKind: "crypto",
      broker: "kraken-eur",
      cryptoBrokerEnv: broker,
      engine: status,
      maxPositions: cryptoLiveMaxPositions(),
      windowOpen: isCryptoCycleWindow(),
    });
  }
  const tickers = await cryptoTickers();
  return NextResponse.json({
    cycleKind: "crypto",
    broker:
      broker === "ibkr" || isIbkrCryptoEnabled() ? "ibkr-paxos" : "alpaca",
    cryptoBrokerEnv: broker,
    ibkrCryptoEnabled: isIbkrCryptoEnabled(),
    windowOpen: isCryptoCycleWindow(),
    tickers,
    maxHoldHours: 24,
    maxPositions: cryptoLiveMaxPositions(),
    lastCycle: global.__lastCryptoCycle ?? null,
  });
}
