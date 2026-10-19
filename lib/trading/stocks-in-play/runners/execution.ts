import "server-only";

import { getStocksRunnersMode } from "@/lib/trading/stocks-in-play/runners/config";
import { isStocksRunnerTicker } from "@/lib/trading/stocks-in-play/runners/store";
import { stocksInPlayRoundTripCostPct } from "@/lib/trading/stocks-in-play/cost-gate";

export type RunnersOrderDecision =
  | { action: "not_runner" }
  | { action: "shadow"; reason: string }
  | { action: "live_ok"; reason: string };

export function decideRunnersOrder(params: {
  ticker: string;
  entry: number;
  stopLoss: number;
  spreadPct?: number;
}): RunnersOrderDecision {
  if (!isStocksRunnerTicker(params.ticker)) return { action: "not_runner" };
  if (!(params.stopLoss > 0 && params.stopLoss < params.entry)) {
    return { action: "shadow", reason: "runners: bracket stop required (simulation)" };
  }
  if (getStocksRunnersMode() !== "live") {
    return { action: "shadow", reason: "STOCKS_RUNNERS_MODE=shadow (default simulation)" };
  }
  return { action: "live_ok", reason: "STOCKS_RUNNERS_MODE=live" };
}

export function estimateRunnerRoundTripCommissionUsd(entry: number, spreadPct?: number): number {
  return entry * stocksInPlayRoundTripCostPct({ price: entry, qty: 1, spreadPct });
}
