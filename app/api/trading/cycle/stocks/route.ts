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
import { resolveStocksCycleUniverse, isUsStockTicker } from "@/lib/trading/stocks-universe";
import type { OrderResult } from "@/src/core/trading/trading-engine";

function isCycleSignal(o: OrderResult): boolean {
  if (o.status === "SIGNAL_NO_CAPITAL") return true;
  if (o.direction !== "BUY") return false;
  return !["SKIPPED", "HOLD", "REJECTED_CONFIDENCE"].includes(o.status);
}

function isExecutableSignal(o: OrderResult): boolean {
  return o.status === "EXECUTED" || o.status === "PENDING_APPROVAL";
}

function mapCycleSignals(orders: OrderResult[] | undefined) {
  if (!orders?.length) return [];
  return orders.filter(isCycleSignal).map((o) => ({
    ticker: o.ticker,
    confidence: o.signal.confidence,
    price: o.price ?? null,
    agents: o.agents ?? o.signal.reasoning?.slice(0, 80) ?? null,
    status: o.status,
    executable: isExecutableSignal(o),
    reason: o.reason,
  }));
}

function countByStatus(orders: OrderResult[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const o of orders ?? []) {
    out[o.status] = (out[o.status] ?? 0) + 1;
  }
  return out;
}

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
  const bad = universe.tickers.filter((t) => !isUsStockTicker(t));
  const last = global.__lastStocksCycle ?? null;
  const signals = mapCycleSignals(last?.orders);
  return NextResponse.json({
    cycleKind: "stocks",
    phase,
    windowOpen: isUsStocksCycleWindow(),
    nextOpen: nextOpenLabel(phase),
    universe,
    universeClean: bad.length === 0,
    nonStockInUniverse: bad,
    lastCycle: last,
    signals,
    statusCounts: countByStatus(last?.orders),
    summary: last
      ? {
          analizados: last.orders.length,
          señales: signals.length,
          BUY: last.orders.filter((o) => o.direction === "BUY").length,
          enviadas: signals.filter((s) => s.executable).length,
          sin_capital: last.orders.filter((o) => o.status === "SIGNAL_NO_CAPITAL").length,
          rechazadas: last.orders.filter(
            (o) => o.status === "ERROR" || o.status === "REJECTED_RISK",
          ).length,
        }
      : null,
  });
}
